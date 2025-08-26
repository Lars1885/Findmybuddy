// js/app.js — anonym login + Leaflet-kort + live position + grupper
document.addEventListener('DOMContentLoaded', async () => {
  // Firebase services

  // DOM
  // Firebase services
const auth = window.fmb.auth;
const db   = window.fmb.db;
// Firebase services
// ---- ANONYM LOGIN (skal ske før vi bruger db) ----
try {
  if (!auth.currentUser) {
    await auth.signInAnonymously();
  }
} catch (e) {
  alert('Kunne ikke logge ind: ' + e.message);
  return; // stop hvis login fejler
}
// ---------------------------------------------------

  const groupIdInput     = document.getElementById('groupIdInput');
  const btnJoin          = document.getElementById('btnJoin');
  const displayNameInput = document.getElementById('displayNameInput');
  const btnSaveName      = document.getElementById('btnSaveName');
  const statusEl         = document.getElementById('status');
  const membersEl        = document.getElementById('members');

  // App-state
  let uid = null;
  let currentGroupId = localStorage.getItem('fmb_group') || '';
  let myName = localStorage.getItem('fmb_name') || '';
  let unsubMembers = null;
  let watchId = null;
  let firstCenter = false;

  groupIdInput.value = currentGroupId || 'Test123';
  displayNameInput.value = myName;

  const setStatus = (msg) => statusEl.textContent = msg;

  // Leaflet kort
  const map = L.map('map', { zoomControl: true, attributionControl: false })
               .setView([56.0, 10.0], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  const markers = new Map(); // uid -> marker
  const setMarker = (id, lat, lng, label) => {
    let m = markers.get(id);
    if (!m) {
      m = L.marker([lat, lng]).addTo(map);
      markers.set(id, m);
    }
    m.setLatLng([lat, lng]).bindPopup(label || id);
  };
  const removeMissingMarkers = (presentIds) => {
    for (const [id, m] of markers.entries()) {
      if (!presentIds.has(id)) {
        map.removeLayer(m);
        markers.delete(id);
      }
    }
  };

  // Join/opret gruppe
  async function joinGroup(id) {
    if (!id) { alert('Skriv et gruppe-id'); return; }
    if (unsubMembers) { unsubMembers(); unsubMembers = null; }
    currentGroupId = id;
    localStorage.setItem('fmb_group', id);
    setStatus(`Forbinder til gruppe “${id}”…`);

    // Opret dokumentet hvis det ikke findes
    await db.collection('groups').doc(id)
      .set({ createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

    // Lyt på medlemmer (subcollection)
    const colRef = db.collection('groups').doc(id).collection('members');
    unsubMembers = colRef.onSnapshot((snap) => {
      const present = new Set();
      const lines = [];
      snap.forEach(doc => {
        const d = doc.data();
        present.add(doc.id);
        if (d.lat != null && d.lng != null) {
          setMarker(doc.id, d.lat, d.lng, d.name || 'Ukendt');
        }
        const t = d.ts?.toDate ? d.ts.toDate() : (d.ts ? new Date(d.ts) : null);
        const when = t ? t.toLocaleTimeString() : '—';
        lines.push(`<span class="pill">${(d.name||'Ukendt')} • ${when}</span>`);
      });
      removeMissingMarkers(present);
      membersEl.innerHTML = lines.join(' ') || 'Ingen i gruppen endnu…';
      setStatus(`Forbundet til “${id}”.`);
    });

    // Push min aktuelle navn ind i gruppen
    if (uid) await upsertSelf(lastLatLng.lat, lastLatLng.lng);
  }

  // Gem navn
  btnSaveName.addEventListener('click', async () => {
    myName = displayNameInput.value.trim();
    localStorage.setItem('fmb_name', myName);
    setStatus('Navn gemt.');
    if (uid && currentGroupId && lastLatLng.lat != null) {
      await upsertSelf(lastLatLng.lat, lastLatLng.lng);
    }
  });

  // Join klik
  btnJoin.addEventListener('click', () => joinGroup(groupIdInput.value.trim()));

  // Anonym login
  try {
    const cred = await auth.signInAnonymously();
    uid = cred.user.uid;
    setStatus('Login OK.');
  } catch (e) {
    alert('Kunne ikke logge ind: ' + (e.message || e));
    return;
  }

  // Geolocation → skriv min position i Firestore
  let lastLatLng = { lat: null, lng: null };
  const upsertSelf = async (lat, lng) => {
    if (!currentGroupId) return;
    await db.collection('groups').doc(currentGroupId)
      .collection('members').doc(uid)
      .set({
        name: myName || 'Ukendt',
        lat, lng,
        ts: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
  };

  if ("geolocation" in navigator) {
    watchId = navigator.geolocation.watchPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      lastLatLng = { lat, lng };
      setMarker(uid || 'mig', lat, lng, (myName || 'Mig'));
      if (!firstCenter) { map.setView([lat, lng], 15); firstCenter = true; }
      await upsertSelf(lat, lng);
    }, (err) => {
      console.warn('Geolocation fejl:', err);
      setStatus('Position ikke delt (afvist eller fejl).');
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
  } else {
    setStatus('Din browser understøtter ikke geolocation.');
  }

  // Auto-join hvis der står noget i feltet
  if (groupIdInput.value.trim()) joinGroup(groupIdInput.value.trim());
});
