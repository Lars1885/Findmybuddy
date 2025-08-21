// js/app.js
document.addEventListener('DOMContentLoaded', async () => {
  const out = document.getElementById('out');
  const membersEl = document.getElementById('members');

  // ---- Firebase services (leveres fra firebaseconfig.js via window.fmb) ----
  const auth = window.fmb.auth;
  const db   = window.fmb.db;

  // ---- UI refs ----
  const groupIdInput     = document.getElementById('groupIdInput');
  const btnJoin          = document.getElementById('btnJoin');
  const displayNameInput = document.getElementById('displayNameInput');
  const btnSaveName      = document.getElementById('btnSaveName');

  // ---- App-state ----
  let uid = null;
  let currentGroupId = localStorage.getItem('fmb_group') || '';
  let myName = localStorage.getItem('fmb_name') || '';
  let myMarker = null;
  let map = null;
  let groupUnsub = null; // firestore listener cleanup
  let markers = new Map(); // uid -> marker

  // Prefill felter
  groupIdInput.value = currentGroupId;
  displayNameInput.value = myName;

  // ---- Init: anon auth ----
  try {
    await auth.signInAnonymously();
    uid = auth.currentUser ? auth.currentUser.uid : null;
    out.textContent = `Anon login OK, uid: ${uid || '(ukendt)'}`;
  } catch (e) {
    alert('Kunne ikke logge ind: ' + (e.message || e));
    console.error(e);
    return;
  }

  // ---- Kort ----
  function ensureMap() {
    if (map) return map;
    map = L.map('map', { zoomControl: true, attributionControl: true }).setView([56, 10], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    return map;
  }

  // ---- Geolocation (opdater egen position i gruppen) ----
  function startGeoUpdates(groupId) {
    if (!navigator.geolocation) {
      out.textContent += '\nGeolocation er ikke tilgængelig i denne browser.';
      return;
    }

    ensureMap();

    navigator.geolocation.watchPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;

      // Marker for mig selv
      if (!myMarker) {
        myMarker = L.marker([lat, lng]).addTo(map).bindPopup('Mig');
        map.setView([lat, lng], 14);
      } else {
        myMarker.setLatLng([lat, lng]);
      }

      // Skriv til Firestore
      try {
        await db.collection('groups')
          .doc(groupId)
          .collection('members')
          .doc(uid)
          .set({
            name: myName || 'Ukendt',
            lat, lng,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
      } catch (e) {
        console.error('Kunne ikke opdatere position', e);
      }
    }, err => {
      out.textContent += `\nGPS-fejl: ${err.message || err}`;
    }, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000
    });
  }

  // ---- Lyt til gruppens medlemmer og vis markører ----
  function subscribeToGroup(groupId) {
    // ryd tidligere subscription
    if (groupUnsub) { groupUnsub(); groupUnsub = null; }
    markers.forEach(m => map && map.removeLayer(m));
    markers.clear();
    membersEl.innerHTML = '';

    groupUnsub = db.collection('groups')
      .doc(groupId)
      .collection('members')
      .onSnapshot(snap => {
        membersEl.innerHTML = '';
        snap.forEach(doc => {
          const d = doc.data();
          const name = (doc.id === uid) ? (d.name || 'Mig') + ' (mig)' : (d.name || 'Ukendt');
          const lat = d.lat, lng = d.lng;

          // badge
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = name;
          membersEl.appendChild(chip);

          // marker
          if (typeof lat === 'number' && typeof lng === 'number') {
            let m = markers.get(doc.id);
            if (!m) {
              m = L.marker([lat, lng]).addTo(ensureMap()).bindPopup(name);
              markers.set(doc.id, m);
            } else {
              m.setLatLng([lat, lng]);
              m.setPopupContent(name);
            }
          }
        });
      }, err => {
        console.error('Snapshot fejl', err);
        out.textContent += '\nSnapshot fejl: ' + (err.message || err);
      });
  }

  // ---- Handlers ----
  btnSaveName.addEventListener('click', async () => {
    myName = (displayNameInput.value || '').trim();
    localStorage.setItem('fmb_name', myName);
    out.textContent += `\nNavn gemt: ${myName || '(tomt)'}`;

    // opdater eget member-doc hvis vi er i en gruppe
    const g = (groupIdInput.value || '').trim();
    if (uid && g) {
      try {
        await db.collection('groups').doc(g).collection('members').doc(uid)
          .set({ name: myName || 'Ukendt' }, { merge: true });
      } catch (e) {
        console.error(e);
      }
    }
  });

  btnJoin.addEventListener('click', async () => {
    const g = (groupIdInput.value || '').trim();
    if (!g) { alert('Skriv en Gruppe-ID'); return; }
    currentGroupId = g;
    localStorage.setItem('fmb_group', currentGroupId);
    out.textContent += `\nGruppe: ${currentGroupId}`;

    // Opret gruppedokument (idempotent)
    try {
      await db.collection('groups').doc(currentGroupId).set({ createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (e) {
      console.error('Kunne ikke oprette gruppe', e);
    }

    // sørg for navn
    if (!myName) {
      myName = 'Ukendt';
      localStorage.setItem('fmb_name', myName);
    }

    // tilføj mig som medlem (merge)
    try {
      await db.collection('groups').doc(currentGroupId).collection('members').doc(uid)
        .set({ name: myName, joinedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (e) {
      console.error('Kunne ikke joine', e);
    }

    // start geo + lyt på medlemmer
    startGeoUpdates(currentGroupId);
    subscribeToGroup(currentGroupId);
  });

  // Auto-join hvis der ligger noget i localStorage
  if (currentGroupId) {
    btnJoin.click();
  }
});
