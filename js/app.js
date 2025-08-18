// /js/app.js
document.addEventListener("DOMContentLoaded", async () => {
  // ----------- Firebase services -----------
  const auth = window.fmb.auth;
  const db = window.fmb.db;
  const storage = window.fmb.storage;

  // ----------- DOM -----------
  const groupIdInput     = document.getElementById('groupIdInput');
  const btnJoin          = document.getElementById('btnJoin');
  const displayNameInput = document.getElementById('displayNameInput');
  const btnSaveName      = document.getElementById('btnSaveName');

  const buddySelect      = document.getElementById('buddySelect');
  const distanceLabel    = document.getElementById('distanceLabel');
  const arrowNeedle      = document.getElementById('needle');

  const chatFab          = document.getElementById('chatFab');
  const sheet            = document.getElementById('chatSheet');
  const chatClose        = document.getElementById('chatClose');
  const sheetList        = document.getElementById('sheetChatList');
  const sheetForm        = document.getElementById('sheetChatForm');
  const sheetInput       = document.getElementById('sheetChatInput');

  const btnFindCamp      = document.getElementById('btnFindCamp');
  const btnGoHome        = document.getElementById('btnGoHome');

  const photoInput       = document.getElementById('photoInput');
  const photoGrid        = document.getElementById('photoGrid');
  const galleryCount     = document.getElementById('galleryCount');

  // ----------- state -----------
  await auth.signInAnonymously().catch(err => {
    console.error("Auth fejl:", err); alert("Kunne ikke logge ind: " + err.message);
  });
  const me = auth.currentUser;

  let groupId  = localStorage.getItem('fmb_group') || '';
  let myName   = localStorage.getItem('fmb_name')  || '';
  groupIdInput.value = groupId;
  displayNameInput.value = myName;

  let myLat = null, myLng = null;
  let lastRenderedAngle = 0, headingOffset = Number(localStorage.getItem('fmb_heading_offset')) || 0;

  let map, userMarker;
  let members = {};        // { uid: {id,name,lat,lng,...} }
  let myBuddyId = null;    // valgt marker-id

  let unsubMembers = null, unsubChat = null, unsubPhotos = null, unsubGroup = null;

  // Kort
  map = L.map("map").setView([55.6761, 12.5683], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);

  // ----------- Helpers -----------
  const toRad = d => d * Math.PI/180;
  const normDeg = a => (a%360 + 360) % 360;

  function bearingDeg(lat1, lon1, lat2, lon2){
    const φ1 = toRad(lat1), φ2 = toRad(lat2);
    const Δλ = toRad(lon2-lon1);
    const y = Math.sin(Δλ)*Math.cos(φ2);
    const x = Math.cos(φ1)*Math.cos(φ2)*Math.cos(Δλ) + Math.sin(φ1)*Math.sin(φ2);
    return normDeg(Math.atan2(y,x)*180/Math.PI);
  }
  function distanceMeters(lat1, lon1, lat2, lon2){
    const R=6371000, φ1=toRad(lat1), φ2=toRad(lat2), dφ=toRad(lat2-lat1), dλ=toRad(lon2-lon1);
    const a=Math.sin(dφ/2)**2+Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
    return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }
  const slerpAngle=(a,b,t)=>{ let d=normDeg(b-a); if(d>180) d-=360; return normDeg(a+d*t); };

  function setChatStyle(style){
    document.body.classList.remove('chat-style-default','chat-style-heart','chat-style-cloud','chat-style-fist','chat-style-beer','chat-style-star');
    document.body.classList.add(`chat-style-${style}`);
  }

  // ----------- Group / Name -----------
  btnJoin.addEventListener('click', async () => {
    const id = groupIdInput.value.trim();
    if (!id) return alert('Skriv et gruppe-ID');
    if (unsubMembers) unsubMembers(); if (unsubChat) unsubChat(); if (unsubPhotos) unsubPhotos(); if (unsubGroup) unsubGroup();

    groupId = id;
    localStorage.setItem('fmb_group', groupId);
    await ensureGroupDoc();
    await upsertMember({});
    startRealtime();
  });

  btnSaveName.addEventListener('click', async () => {
    myName = displayNameInput.value.trim() || 'Ukendt';
    localStorage.setItem('fmb_name', myName);
    await upsertMember({ name: myName });
  });

  async function ensureGroupDoc(){
    const ref = db.collection('groups').doc(groupId);
    const snap = await ref.get();
    if (!snap.exists){
      await ref.set({ createdAt: firebase.firestore.FieldValue.serverTimestamp(), bubbleStyle:'default' });
    }
  }

  async function upsertMember(patch){
    if (!groupId || !me) return;
    const ref = db.collection('groups').doc(groupId).collection('members').doc(me.uid);
    await ref.set({
      uid: me.uid,
      name: myName || 'Ukendt',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lat: myLat ?? null, lng: myLng ?? null,
      ...(patch||{})
    }, { merge:true });
  }

  // ----------- Realtime -----------
  function startRealtime(){
    // gruppe-doc (boblestil + camp)
    unsubGroup = db.collection('groups').doc(groupId).onSnapshot(d => {
      const data = d.data()||{};
      setChatStyle(data.bubbleStyle || 'default');
      window._camp = data.camp || null;
    });

    // medlemmer
    unsubMembers = db.collection('groups').doc(groupId).collection('members')
      .onSnapshot(snap => {
        members = {};
        snap.forEach(doc => { members[doc.id] = { id: doc.id, ...(doc.data()||{}) }; });
        renderMembers();
        updateArrow(); // hvis mål findes
      });

    // chat
    unsubChat = db.collection('groups').doc(groupId).collection('messages')
      .orderBy('ts','asc').limit(300)
      .onSnapshot(snap => {
        sheetList.innerHTML = '';
        snap.forEach(doc => {
          const m = doc.data();
          const mine = m.uid === me.uid;
          const div = document.createElement('div');
          div.className = 'msg' + (mine ? ' mine' : '');
          div.textContent = (m.displayName || 'Ukendt') + ': ' + (m.text || '');
          sheetList.appendChild(div);
        });
        sheetList.scrollTop = sheetList.scrollHeight;
      });

    // photos
    unsubPhotos = db.collection('groups').doc(groupId).collection('photos')
      .orderBy('ts','desc').limit(60)
      .onSnapshot(snap => {
        photoGrid.innerHTML = '';
        let count = 0;
        snap.forEach(doc => {
          const p = doc.data();
          const img = document.createElement('img');
          img.src = p.url; img.alt = (p.name || 'photo');
          photoGrid.appendChild(img);
          count++;
        });
        galleryCount.textContent = count;
      });
  }

  // initial presence
  await upsertMember({});

  function renderMembers(){
    const others = Object.values(members).filter(m => m.id !== (me && me.uid));
    buddySelect.innerHTML = '';
    if (others.length === 0){
      const opt = document.createElement('option');
      opt.value = ''; opt.textContent = '—';
      buddySelect.appendChild(opt);
      myBuddyId = null;
    } else {
      others.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id; opt.textContent = m.name || m.id;
        buddySelect.appendChild(opt);
      });
      if (!myBuddyId || !others.find(o => o.id === myBuddyId)) myBuddyId = others[0].id;
      buddySelect.value = myBuddyId;
    }
  }

  buddySelect.addEventListener('change', () => {
    myBuddyId = buddySelect.value || null;
    updateArrow();
  });

  // ----------- Kompas / Heading -----------
  window.addEventListener('deviceorientation', (e) => {
    const alpha = (typeof e.webkitCompassHeading === 'number') ? e.webkitCompassHeading : e.alpha;
    if (alpha == null) return;
    deviceHeadingDeg = normDeg(alpha);
    updateArrow();
  }, { passive:true });

  // ----------- Geolocation -----------
  if ('geolocation' in navigator){
    navigator.geolocation.watchPosition(async pos => {
      myLat = pos.coords.latitude; myLng = pos.coords.longitude;

      if (!userMarker){
        map.setView([myLat,myLng], 15);
        userMarker = L.marker([myLat,myLng]).addTo(map).bindPopup("Mig");
      } else {
        userMarker.setLatLng([myLat,myLng]);
      }

      if (groupId) await upsertMember({ lat: myLat, lng: myLng });
      updateArrow();
    }, (err)=>console.warn(err), { enableHighAccuracy:true, maximumAge:1000, timeout:10000 });
  }

  function updateArrow(){
    if (myLat==null || myLng==null) return;

    let target = null;
    if (myBuddyId && members[myBuddyId] && members[myBuddyId].lat != null){
      target = { lat: members[myBuddyId].lat, lng: members[myBuddyId].lng };
    } else if (window._camp) {
      target = { lat: window._camp.lat, lng: window._camp.lng };
    } else {
      distanceLabel.textContent = '– m';
      return;
    }

    const bearing = bearingDeg(myLat, myLng, target.lat, target.lng);
    const dist = distanceMeters(myLat, myLng, target.lat, target.lng);
    distanceLabel.textContent = `${Math.round(dist)} m`;

    const desired = normDeg(bearing + headingOffset);
    lastRenderedAngle = slerpAngle(lastRenderedAngle, desired, 0.2);
    if (arrowNeedle) arrowNeedle.setAttribute('transform', `rotate(${lastRenderedAngle} 100 100)`);
  }

  // ----------- Bottom sheet (chat) -----------
  chatFab.addEventListener('click', () => openSheet(true));
  chatClose.addEventListener('click', () => openSheet(false));
  function openSheet(open){
    sheet.classList.toggle('open', !!open);
  }

  // chat send
  sheetForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (!groupId) return alert("Join en gruppe først.");
    const text = sheetInput.value.trim();
    if (!text) return;
    await db.collection('groups').doc(groupId).collection('messages').add({
      uid: me.uid, name: myName || 'Ukendt', text,
      ts: firebase.firestore.FieldValue.serverTimestamp()
    });
    sheetInput.value = '';
  });

  // ----------- Camp + “gå hjem” -----------
  btnFindCamp.addEventListener('click', async ()=>{
    if (!groupId) return alert("Join en gruppe først.");
    if (myLat==null) return alert("Hent din position først (giv tilladelser).");
    await db.collection('groups').doc(groupId).set({ camp: { lat: myLat, lng: myLng } }, { merge:true });
    alert("Camp gemt for gruppen.");
  });

  btnGoHome.addEventListener('click', async ()=>{
    if (!groupId) return alert("Join en gruppe først.");
    await db.collection('groups').doc(groupId).collection('messages').add({
      uid: me.uid, name: myName || 'Ukendt',
      text: "🚶‍♂️ (gå hjem sammen)",
      ts: firebase.firestore.FieldValue.serverTimestamp()
    });
    openSheet(true);
  });

  // ----------- Foto upload til Storage -----------
  photoInput.addEventListener('change', async (e)=>{
    if (!groupId) return alert("Join en gruppe først.");
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const path = `groups/${groupId}/photos/${Date.now()}_${file.name}`;
      const ref = storage.ref().child(path);
      const snap = await ref.put(file);
      const url = await snap.ref.getDownloadURL();
      await db.collection('groups').doc(groupId).collection('photos').add({
        url, name:file.name, uid: me.uid, ts: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch(err) { alert("Upload-fejl: "+err.message); }
    photoInput.value = "";
  });

  // Auto-join hvis kendt
  if (groupId){ await ensureGroupDoc(); startRealtime(); }
});
