// js/app.js — anonym login + Leaflet-kort + live position + grupper
document.addEventListener('DOMContentLoaded', async () => {
  // Firebase services (sat i js/firebaseconfig.js)
  const auth = window.fmb?.auth || firebase.auth();
  const db   = window.fmb?.db   || firebase.firestore();

  // UI
  const groupIdInput     = document.getElementById('groupIdInput');
  const btnJoin          = document.getElementById('btnJoin');
  const displayNameInput = document.getElementById('displayNameInput');
  const btnSaveName      = document.getElementById('btnSaveName');
  const out              = document.getElementById('out');
  const membersEl        = document.getElementById('members');

  const on = (el, evt, fn) => el && el.addEventListener(evt, fn);

  // State
  let uid = null;
  let myName = localStorage.getItem('fmb_name') || '';
  let currentGroupId = localStorage.getItem('fmb_group') || '';
  let unsubPeers = null;
  let firstFix = true;
  const peerMarkers = {};

  if (!displayNameInput.value) displayNameInput.value = myName;
  if (!groupIdInput.value) groupIdInput.value = currentGroupId;

  // 1) Anonym login
  try {
    await auth.signInAnonymously();
    uid = auth.currentUser?.uid || null;
    out.textContent = `Anon login OK, uid: ${uid || '(ukendt)'}`;
  } catch (e) {
    alert('Kunne ikke logge ind: ' + (e.message || e));
    console.error(e);
    return;
  }

  // 2) Leaflet-kort
  let map = L.map('map', { zoomControl: true, attributionControl: true }).setView([56.0, 10.0], 7);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  let meMarker = L.marker([56.0, 10.0]).addTo(map).bindPopup('Mig');

  // 3) Gem/skift navn
  on(btnSaveName, 'click', () => {
    myName = (displayNameInput.value || '').trim() || 'Anon';
    localStorage.setItem('fmb_name', myName);
    out.textContent = `Navn gemt: ${myName}`;
  });

  // 4) Join / Opret gruppe
  async function joinGroup(id) {
    const gid = (id || groupIdInput.value || '').trim();
    if (!gid) { alert('Skriv en Gruppe-ID'); return; }
    if (unsubPeers) { unsubPeers(); unsubPeers = null; }
    currentGroupId = gid;
    localStorage.setItem('fmb_group', currentGroupId);
    out.textContent = `Gruppe: ${currentGroupId}`;

    // Opret gruppe-dokument (idempotent)
    await db.collection('groups').doc(currentGroupId)
      .set({ createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

    // Tilføj/merge mig som medlem
    await db.collection('groups').doc(currentGroupId).collection('users').doc(uid)
      .set({ name: myName || 'Anon', joinedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

    // Lyt på andre brugere
    unsubPeers = db.collection('groups').doc(currentGroupId).collection('users')
      .onSnapshot(snap => {
        membersEl.innerHTML = '';
        snap.forEach(doc => {
          const d = doc.data() || {};
          const id = doc.id;
          const label = id === uid ? ((d.name || 'Mig') + ' (mig)') : (d.name || id.slice(0,6));

          // vis badges
          const span = document.createElement('span');
          span.style.cssText = 'display:inline-block;background:#1e293b;color:#93c5fd;border-radius:999px;padding:4px 10px;margin:2px 4px;font-size:14px;';
          span.textContent = label;
          membersEl.appendChild(span);

          // tegn/uddatér markør
          if (typeof d.lat === 'number' && typeof d.lng === 'number') {
            if (!peerMarkers[id]) {
              peerMarkers[id] = L.marker([d.lat, d.lng]).addTo(map).bindPopup(label);
            } else {
              peerMarkers[id].setLatLng([d.lat, d.lng]).setPopupContent(label);
            }
          }
        });
      }, err => {
        console.error('Snapshot fejl', err);
        out.textContent = 'Snapshot fejl: ' + (err.message || err);
      });
  }
  on(btnJoin, 'click', () => joinGroup());
  if (currentGroupId) joinGroup(currentGroupId);

  // 5) GPS: opdatér min position løbende
  if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(async (pos) => {
      const { latitude: lat, longitude: lng, heading } = pos.coords;

      meMarker.setLatLng([lat, lng]).setPopupContent(myName || 'Mig');
      if (firstFix) { map.setView([lat, lng], 15); firstFix = false; }

      if (currentGroupId && uid) {
        await db.collection('groups').doc(currentGroupId).collection('users').doc(uid)
          .set({
            name: myName || 'Anon',
            lat, lng,
            heading: (typeof heading === 'number' ? heading : null),
            ts: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
      }
    }, err => {
      console.error('GPS fejl:', err);
      alert('Giv tilladelse til lokation i din browser for at vise din position.');
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  } else {
    alert('Denne browser understøtter ikke geolocation.');
  }

  window.addEventListener('beforeunload', () => { if (unsubPeers) unsubPeers(); });
});
