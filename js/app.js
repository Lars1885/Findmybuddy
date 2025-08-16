// js/app.js
document.addEventListener("DOMContentLoaded", async () => {
  // ---------- Firebase services ----------
  const auth    = (window.fmb && window.fmb.auth)    || firebase.auth();


const analytics = getAnalytics(app);

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
// Firebase config

  apiKey: "AIzaSyCZXbnzgWXqEeOTlPe56h-iEtX32kIsXqU",
  authDomain: "find-my-buddy-2f4d7.firebaseapp.com",
  projectId: "find-my-buddy-2f4d7",
  storageBucket: "find-my-buddy-2f4d7.firebasestorage.app",
  
  appId: "1:463268034142:web:b53c112cf764dcf66766cf",
  measurementId: "G-2LZB7EVTQV"
};

// Init Firebase (kun én gang)
firebase.initializeApp(firebaseConfig);

// Gør services klar til resten af koden
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
// Sørg for at brugeren er logget ind anonymt
auth.signInAnonymously()
  .then(() => {
    console.log("Anonym login OK");
  })
  .catch((error) => {
    console.error("Auth fejl:", error);
    alert("Kunne ikke logge ind: " + error.message);
  });

  // ---------- DOM ----------
  const groupIdInput     = document.getElementById('groupIdInput');
  const btnJoin          = document.getElementById('btnJoin');
  const displayNameInput = document.getElementById('displayNameInput');
  const btnSaveName      = document.getElementById('btnSaveName');

  const buddySelect      = document.getElementById('buddySelect');
  const distanceLabel    = document.getElementById('distanceLabel');
  const arrowNeedle      = document.getElementById('needle');

  const chatFab          = document.getElementById('chatFab');
  const sheet            = document.getElementById('chatSheet');
  const sheetHandle      = document.getElementById('sheetHandle');
  const sheetClose       = document.getElementById('chatClose');
  const sheetList        = document.getElementById('sheetChatList');
  const sheetForm        = document.getElementById('sheetChatForm');
  const sheetInput       = document.getElementById('sheetChatInput');

  const bubbleBtn        = document.getElementById('bubblePickerBtn');
  const bubblePalette    = document.getElementById('bubblePalette');

  const btnFindCamp      = document.getElementById('btnFindCamp');
  const btnGoHome        = document.getElementById('btnGoHome');
  const photoInput       = document.getElementById('photoInput');
  const photoGrid        = document.getElementById('photoGrid');
  const galleryCount     = document.getElementById('galleryCount');

  // ---------- State ----------
  await auth.signInAnonymously().catch(console.error);
  const me = auth.currentUser;

  let groupId   = localStorage.getItem('fmb_group') || '';
  groupIdInput.value = groupId;

  let displayName = localStorage.getItem('fmb_name') || '';
  if (displayName) displayNameInput.value = displayName;

  let myLat = null, myLng = null;
  let deviceHeadingDeg = null, lastRenderedAngle = 0, headingOffset = Number(localStorage.getItem('fmb_heading_offset') || 0);

  let map, userMarker;
  let members = {};         // { uid: {id,name,lat,lng,…} }
  let myBuddyId = null;     // valgt makker-id
  let unsubMembers = null, unsubChat = null, unsubPhotos = null;

  // ---------- Map ----------
  map = L.map("map").setView([55.6761, 12.5683], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 19, attribution: "&copy; OpenStreetMap"}).addTo(map);

  // ---------- Helpers ----------
  const toRad = d => d*Math.PI/180;
  const toDeg = r => r*180/Math.PI;
  const normDeg = a => (a%360+360)%360;
  function bearingDeg(lat1, lon1, lat2, lon2){
    const φ1 = toRad(lat1), φ2 = toRad(lat2), λ1 = toRad(lon1), λ2 = toRad(lon2);
    const y = Math.sin(λ2-λ1)*Math.cos(φ2);
    const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
    return normDeg(toDeg(Math.atan2(y,x)));
  }
  function distanceMeters(lat1, lon1, lat2, lon2){
    const R=6371000, φ1=toRad(lat1), φ2=toRad(lat2), dφ=toRad(lat2-lat1), dλ=toRad(lon2-lon1);
    const a=Math.sin(dφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }
  function slerpAngle(a,b,t){ let diff=normDeg(b-a); if(diff>180) diff-=360; return normDeg(a+diff*t); }
  function setChatStyle(style){
    document.body.classList.remove('chat-style-default','chat-style-heart','chat-style-cloud','chat-style-fist','chat-style-beer','chat-style-star');
    document.body.classList.add(`chat-style-${style}`);
    bubbleBtn.textContent = ({default:"💬",heart:"❤️",cloud:"☁️",fist:"👊",beer:"🍺",star:"⭐"})[style] || "💬";
  }

  // ---------- Group Join / Navn ----------
  btnJoin.addEventListener('click', async () => {
    const id = groupIdInput.value.trim();
    if (!id) return alert('Skriv et gruppe-ID');
    if (unsubMembers) unsubMembers(); if (unsubChat) unsubChat(); if (unsubPhotos) unsubPhotos();
    groupId = id; localStorage.setItem('fmb_group', groupId);
    await ensureGroupDoc();
    startRealtime();
  });

  btnSaveName.addEventListener('click', async () => {
    displayName = displayNameInput.value.trim() || 'Ukendt';
    localStorage.setItem('fmb_name', displayName);
    await upsertMember({ name: displayName });
  });

  async function ensureGroupDoc(){
    const ref = db.collection('groups').doc(groupId);
    const snap = await ref.get();
    if (!snap.exists){
      await ref.set({ createdAt: firebase.firestore.FieldValue.serverTimestamp(), bubbleStyle: 'default' });
    }
  }

  async function upsertMember(patch){
    if (!groupId || !me) return;
    const ref = db.collection('groups').doc(groupId).collection('members').doc(me.uid);
    await ref.set({
      uid: me.uid,
      name: displayName || 'Ukendt',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lat: myLat ?? null, lng: myLng ?? null
    }, { merge: true });
    if (patch) await ref.set(patch, { merge: true });
  }

  // ---------- Realtime ----------
  function startRealtime(){
    // gruppe-doc (boblestil + camp)
    unsubChat && unsubChat(); unsubMembers && unsubMembers(); unsubPhotos && unsubPhotos();

    db.collection('groups').doc(groupId).onSnapshot(d => {
      const data = d.data()||{};
      setChatStyle(data.bubbleStyle || 'default');
      window._camp = data.camp || null; // {lat,lng}
    });

    // medlemmer
    unsubMembers = db.collection('groups').doc(groupId).collection('members')
      .onSnapshot(snap => {
        snap.docChanges().forEach(ch => {
          if (ch.type === 'removed'){ delete members[ch.doc.id]; return; }
          members[ch.doc.id] = { id: ch.doc.id, ...(ch.doc.data()||{}) };
        });
        renderMembers();
      });

    // chat
    unsubChat = db.collection('groups').doc(groupId).collection('messages')
      .orderBy('ts','asc').limit(300)
      .onSnapshot(snap => {
        sheetList.innerHTML = '';
        snap.forEach(doc => {
          const m = doc.data();
          const mine = m.uid === (me && me.uid);
          const div = document.createElement('div');
          div.className = 'sheet-msg ' + (mine ? 'me' : '');
          div.textContent = m.text || '';
          sheetList.appendChild(div);
        });
        sheetList.scrollTop = sheetList.scrollHeight;
      });

    // photos (galleri)
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

    // initial presence
    upsertMember();
  }

  function renderMembers(){
    const others = Object.values(members).filter(m => m.id !== (me && me.uid));
    buddySelect.innerHTML = '';
    if (others.length === 0){
      const opt = document.createElement('option');
      opt.value = ''; opt.textContent = window._i18n?.no_one || 'no one';
      buddySelect.appendChild(opt);
      myBuddyId = null;
    } else {
      others.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id; opt.textContent = m.name || m.id;
        buddySelect.appendChild(opt);
      });
      if (!myBuddyId || !others.find(m => m.id === myBuddyId)) myBuddyId = others[0].id;
      buddySelect.value = myBuddyId;
    }
  }

  buddySelect.addEventListener('change', () => {
    myBuddyId = buddySelect.value || null;
  });

  // ---------- Kompas / Heading ----------
  window.addEventListener('deviceorientation', (e) => {
    const alpha = (typeof e.webkitCompassHeading === 'number') ? e.webkitCompassHeading : e.alpha;
    if (alpha == null) return;
    deviceHeadingDeg = normDeg(alpha);
    updateArrow();
  }, { passive:true });

  // ---------- Geolocation ----------
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

    // mål: valgt buddy, ellers camp, ellers ingen
    let target = null;
    if (myBuddyId && members[myBuddyId] && members[myBuddyId].lat!=null){
      target = { lat: members[myBuddyId].lat, lng: members[myBuddyId].lng };
    } else if (window._camp){
      target = { lat: window._camp.lat, lng: window._camp.lng };
    } else {
      distanceLabel.textContent = '–';
    }
    if (!target) return;

    const bearing = bearingDeg(myLat, myLng, target.lat, target.lng);
    const dist    = distanceMeters(myLat, myLng, target.lat, target.lng);
    distanceLabel.textContent = `${Math.round(dist)} m`;

    const desired = (deviceHeadingDeg!=null) ? normDeg(bearing - (deviceHeadingDeg + headingOffset)) : bearing;
    lastRenderedAngle = slerpAngle(lastRenderedAngle, desired, 0.2);
    if (arrowNeedle) arrowNeedle.setAttribute('transform', `rotate(${lastRenderedAngle} 100 100)`);
  }

  // ---------- Bottom sheet (chat) ----------
  chatFab.addEventListener('click', () => openSheet(true));
  sheetClose.addEventListener('click', () => openSheet(false));

  function openSheet(open){
    const snap = { open: .8*window.innerHeight, peek: .38*window.innerHeight, hidden: window.innerHeight };
    const y = open ? snap.open : snap.hidden;
    sheet.style.transform = `translateY(${Math.round(y)}px)`;
    sheet.classList.toggle('sheet-open', open);
  }
  // swipe fra bunden
  let dragging=false, startY=0;
  sheet.addEventListener('pointerdown', (e)=>{ dragging=true; startY=e.clientY; sheet.style.transition='none'; });
  document.addEventListener('pointerup',   ()=>{ if(!dragging) return; dragging=false; sheet.style.transition='transform .18s ease-out'; });
  document.addEventListener('pointermove', (e)=>{
    if(!dragging) return;
    const dy = Math.max(0, e.clientY - startY);
    sheet.style.transform = `translateY(${dy}px)`;
  });

  // ---------- Chat send ----------
  sheetForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (!groupId) return alert("Join en gruppe først.");
    const text = sheetInput.value.trim();
    if (!text) return;
    await db.collection('groups').doc(groupId).collection('messages').add({
      uid: me.uid, name: displayName || 'Ukendt', text,
      ts: firebase.firestore.FieldValue.serverTimestamp()
    });
    sheetInput.value = '';
  });

  // ---------- Bubble palette (fælles for gruppen) ----------
  bubbleBtn.addEventListener('click', ()=> bubblePalette.classList.toggle('hidden'));
  bubblePalette.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-style]'); if(!btn) return;
    const style = btn.getAttribute('data-style');
    if (!groupId) return;
    await db.collection('groups').doc(groupId).set({ bubbleStyle: style }, { merge:true });
    bubblePalette.classList.add('hidden');
  });

  // ---------- Find camp ----------
  btnFindCamp.addEventListener('click', async ()=>{
    if (!groupId) return alert("Join en gruppe først.");
    if (myLat==null) return alert("Hent din position først (giv tilladelser).");
    await db.collection('groups').doc(groupId).set({ camp: { lat: myLat, lng: myLng } }, { merge:true });
    alert("Camp gemt for gruppen.");
  });

  // ---------- Walk home (chat-event) ----------
  btnGoHome.addEventListener('click', async ()=>{
    if (!groupId) return alert("Join en gruppe først.");
    await db.collection('groups').doc(groupId).collection('messages').add({
      uid: me.uid, name: displayName || 'Ukendt',
      text: `🚶‍♂️💬 ${(window._i18n?.walk_home)||"Walk home together"}`,
      ts: firebase.firestore.FieldValue.serverTimestamp()
    });
    openSheet(true);
  });

  // ---------- Foto upload til Storage ----------
  photoInput.addEventListener('change', async (e)=>{
    if (!groupId) return alert("Join en gruppe først.");
    const file = e.target.files?.[0]; if (!file) return;
    try{
      const path = `groups/${groupId}/photos/${Date.now()}_${file.name}`;
      const ref  = storage.ref().child(path);
      const snap = await ref.put(file);
      const url  = await snap.ref.getDownloadURL();
      await db.collection('groups').doc(groupId).collection('photos').add({
        url, name:file.name, uid: me.uid, ts: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch(err){ alert("Upload-fejl: "+err.message); }
    photoInput.value = "";
  });

  // ---------- PWA SW ----------
  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('/js/sw.js').catch(()=>{});
  }

  // ---------- Auto-join hvis kendt ----------
  if (groupId){ await ensureGroupDoc(); startRealtime(); }
});
