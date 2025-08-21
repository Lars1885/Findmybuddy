// js/app.js
document.addEventListener('DOMContentLoaded', async () => {
  // ----- Firebase services -----
  const auth    = window.fmb?.auth || firebase.auth();
  const db      = window.fmb?.db   || firebase.firestore();
  const storage = window.fmb?.storage || firebase.storage();

  // ----- DOM -----
  const groupIdInput     = document.getElementById('groupIdInput');
  const btnJoin          = document.getElementById('btnJoin');
  const displayNameInput = document.getElementById('displayNameInput');
  const btnSaveName      = document.getElementById('btnSaveName');

  const buddySelect   = document.getElementById('buddySelect');
  const distanceLabel = document.getElementById('distanceLabel');
  const needle        = document.getElementById('needle');

  const btnCalibrate    = document.getElementById('btnCalibrate');
  const btnSetMeeting   = document.getElementById('btnSetMeeting');
  const btnClearMeeting = document.getElementById('btnClearMeeting');

  const mapDiv    = document.getElementById('map');
  const photoInput  = document.getElementById('photoInput');
  const photoGrid   = document.getElementById('photoGrid');

  const chatList  = document.getElementById('chatList');
  const chatForm  = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  // ----- App-state -----
  let currentGroupId = localStorage.getItem('fmb_group') || '';
  let myName         = localStorage.getItem('fmb_name')  || '';
  let myUid          = null;

  let myLat=null, myLng=null;
  let headingDeg=null;         // enhedens kompas
  let meetingPoint=null;       // {lat,lng}
  let targetBuddyId=null;      // valgt ven
  let members={};              // uid -> {name,lat,lng}

  let map=null, meMarker=null, meetingMarker=null;
  const buddyMarkers = new Map(); // uid -> Leaflet marker

  let unsubGroup=null, unsubMembers=null, unsubChat=null, unsubPhotos=null;

  // Sæt inputfelter fra localStorage
  if(currentGroupId) groupIdInput.value = currentGroupId;
  if(myName) displayNameInput.value = myName;

  // ----- Hjælpere -----
  const toRad = d => d*Math.PI/180;
  const toDeg = r => r*180/Math.PI;
  const norm = a => (a%360 + 360) % 360;

  function bearing(lat1, lon1, lat2, lon2){
    const φ1 = toRad(lat1), φ2 = toRad(lat2);
    const dλ = toRad(lon2 - lon1);
    const y = Math.sin(dλ) * Math.cos(φ2);
    const x = Math.cos(φ1)*Math.cos(φ2)*Math.cos(dλ) + Math.sin(φ1)*Math.sin(φ2);
    return norm(toDeg(Math.atan2(y, x)));
  }
  function distanceMeters(lat1, lon1, lat2, lon2){
    const R=6371000;
    const dφ=toRad(lat2-lat1), dλ=toRad(lon2-lon1);
    const a = Math.sin(dφ/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dλ/2)**2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  }

  function updateArrow(){
    if(myLat==null || myLng==null) return;
    let t=null;

    if(targetBuddyId && members[targetBuddyId] && typeof members[targetBuddyId].lat==='number'){
      t = { lat: members[targetBuddyId].lat, lng: members[targetBuddyId].lng };
    } else if (meetingPoint) {
      t = meetingPoint;
    } else {
      distanceLabel.textContent = '– m';
      return;
    }

    const brg = bearing(myLat,myLng, t.lat,t.lng);
    const dist = distanceMeters(myLat,myLng, t.lat,t.lng);
    distanceLabel.textContent = `${dist} m`;

    const rot = (headingDeg==null) ? brg : norm(brg - headingDeg);
    if(needle) needle.setAttribute('transform', `rotate(${rot} 100 100)`);
  }

  // ----- Auth: anonym -----
  try {
    await auth.signInAnonymously();
    myUid = auth.currentUser.uid;
    console.log('Anon login OK', myUid);
  } catch (e) {
    alert('Kunne ikke logge ind: ' + (e.message || e));
    return;
  }

  // ----- Map -----
  initMap();
  function initMap(){
    map = L.map(mapDiv, { zoomControl:true, attributionControl:false }).setView([56.0,10.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom:19 }).addTo(map);
    meMarker = L.marker([56.0,10.0]).addTo(map).bindPopup('Mig');
  }

  function setOrUpdateBuddyMarker(uid, lat, lng, name){
    let m = buddyMarkers.get(uid);
    if(!m){
      m = L.marker([lat,lng], { opacity:0.95 }).addTo(map).bindPopup(name||'');
      buddyMarkers.set(uid, m);
    } else {
      m.setLatLng([lat,lng]);
      if(name) m.bindPopup(name);
    }
  }

  function removeBuddyMarker(uid){
    const m = buddyMarkers.get(uid);
    if(m){ map.removeLayer(m); buddyMarkers.delete(uid); }
  }

  function updateMeetingMarker(){
    if(!meetingPoint) { if(meetingMarker){ map.removeLayer(meetingMarker); meetingMarker=null; } return; }
    if(!meetingMarker){
      meetingMarker = L.marker([meetingPoint.lat,meetingPoint.lng], { opacity:0.9 }).addTo(map).bindPopup('Mødested');
    } else {
      meetingMarker.setLatLng([meetingPoint.lat,meetingPoint.lng]);
    }
  }

  // ----- Geolocation -----
  if('geolocation' in navigator){
    navigator.geolocation.watchPosition(async pos => {
      myLat = pos.coords.latitude;
      myLng = pos.coords.longitude;

      if(meMarker) {
        meMarker.setLatLng([myLat,myLng]);
        if(map && map.getZoom()<14) map.setView([myLat,myLng], 14, {animate:true});
      }

      // skriv min position til gruppen
      if(currentGroupId){
        await db.collection('groups').doc(currentGroupId)
          .collection('members').doc(myUid)
          .set({
            uid: myUid, name: myName || 'Ukendt',
            lat: myLat, lng: myLng,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge:true });
      }

      updateArrow();
    }, err => console.warn('Geo fejl', err), { enableHighAccuracy:true, maximumAge:1000, timeout:10000 });
  } else {
    alert('Din browser understøtter ikke geolocation');
  }

  // ----- Device orientation / kompas -----
  // iOS kræver tilladelse via brugertryk (requestPermission) – vi binder til en knap.
  btnCalibrate.addEventListener('click', async ()=>{
    try{
      const iOS = typeof DeviceOrientationEvent !== 'undefined' &&
                  typeof DeviceOrientationEvent.requestPermission === 'function';
      if(iOS){
        const s = await DeviceOrientationEvent.requestPermission(); // skal kaldes i user-gesture
        if(s!=='granted'){ alert('Kompas-tilladelse blev ikke givet.'); return; }
      }
      alert('Kompas tilladt. Bevæg telefonen for at opdatere pilen.');
    }catch(err){
      console.warn('requestPermission fejlede:', err);
    }
  });

  window.addEventListener('deviceorientation', (e)=>{
    const ios = (typeof e.webkitCompassHeading === 'number') ? e.webkitCompassHeading : null;
    const android = (typeof e.alpha === 'number') ? e.alpha : null;
    if(ios!=null){ headingDeg = ios; }
    else if(android!=null){
      const screen = (window.screen.orientation && typeof window.screen.orientation.angle==='number') ? window.screen.orientation.angle : 0;
      headingDeg = norm(360 - (android + screen));
    } else { headingDeg = null; }
    updateArrow();
  }, { passive:true });

  // ----- Join/Opret gruppe -----
  btnJoin.addEventListener('click', async ()=>{
    const gid = (groupIdInput.value||'').trim();
    if(!gid) return alert('Skriv et Gruppe-ID');
    currentGroupId = gid;
    localStorage.setItem('fmb_group', gid);

    // opret gruppen hvis ikke findes
    await db.collection('groups').doc(gid).set({
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true });

    startGroupListeners();
    alert('Du er nu i gruppe: '+gid);
  });

  // ----- Gem navn -----
  btnSaveName.addEventListener('click', async ()=>{
    myName = (displayNameInput.value||'').trim();
    if(!myName) return alert('Skriv dit navn');
    localStorage.setItem('fmb_name', myName);
    if(!currentGroupId) return alert('Join en gruppe først');

    await db.collection('groups').doc(currentGroupId)
      .collection('members').doc(myUid)
      .set({ uid:myUid, name: myName, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });

    alert('Navn gemt');
  });

  // ----- Realtime lyttere -----
  function startGroupListeners(){
    // ryd gamle lyttere
    [unsubGroup,unsubMembers,unsubChat,unsubPhotos].forEach(u=>{ if(u) try{u();}catch{} });

    // gruppe-doc (mødested)
    unsubGroup = db.collection('groups').doc(currentGroupId).onSnapshot(snap=>{
      const d = snap.data()||{};
      if(d.meeting && typeof d.meeting.lat==='number'){
        meetingPoint = { lat:d.meeting.lat, lng:d.meeting.lng };
      } else {
        meetingPoint = null;
      }
      updateMeetingMarker();
      updateArrow();
      renderBuddySelect();
    });

    // medlemmer
    unsubMembers = db.collection('groups').doc(currentGroupId).collection('members')
      .onSnapshot(snap=>{
        const old = members; members = {};
        snap.forEach(doc=>{
          const v = doc.data()||{};
          members[doc.id] = { ...v, id:doc.id };
        });

        // markers opdatér
        Object.values(members).forEach(m=>{
          if(typeof m.lat==='number' && typeof m.lng==='number' && m.id!==myUid){
            setOrUpdateBuddyMarker(m.id, m.lat, m.lng, m.name||'');
          }
        });
        // fjern markers der er væk
        Object.keys(old).forEach(uid=>{
          if(uid!==myUid && !members[uid]) removeBuddyMarker(uid);
        });

        renderBuddySelect();
        updateArrow();
      });

    // chat
    unsubChat = db.collection('groups').doc(currentGroupId).collection('messages')
      .orderBy('createdAt','asc').limit(300)
      .onSnapshot(snap=>{
        chatList.innerHTML = '';
        snap.forEach(doc=>{
          const m = doc.data();
          const mine = m.uid===myUid;
          const div = document.createElement('div');
          div.className = 'bubble ' + (mine?'me':'them');
          div.textContent = (m.by? (m.by+': ') : '') + (m.text||'');
          chatList.appendChild(div);
        });
        chatList.scrollTop = chatList.scrollHeight;
      });

    // photos
    unsubPhotos = db.collection('groups').doc(currentGroupId).collection('photos')
      .orderBy('createdAt','desc').limit(60)
      .onSnapshot(snap=>{
        photoGrid.innerHTML = '';
        snap.forEach(doc=>{
          const p = doc.data();
          if(!p.url) return;
          const img = document.createElement('img');
          img.src = p.url; img.alt = p.by||'';
          photoGrid.appendChild(img);
        });
      });
  }

  function renderBuddySelect(){
    // valgmulighed: mødested + øvrige medlemmer
    const prev = buddySelect.value;
    buddySelect.innerHTML = '';
    const optMeeting = document.createElement('option');
    optMeeting.value = '__meeting__';
    optMeeting.textContent = 'Mødested';
    buddySelect.appendChild(optMeeting);

    const others = Object.values(members).filter(m=>m.id!==myUid);
    others.forEach(m=>{
      const o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.name || m.id;
      buddySelect.appendChild(o);
    });

    // bevar tidligere valg hvis muligt
    if(prev && [...buddySelect.options].some(o=>o.value===prev)) buddySelect.value = prev;
    else buddySelect.value='__meeting__';

    targetBuddyId = (buddySelect.value==='__meeting__') ? null : buddySelect.value;
  }

  buddySelect.addEventListener('change', ()=>{
    targetBuddyId = (buddySelect.value==='__meeting__') ? null : buddySelect.value;
    updateArrow();
  });

  // ----- Mødested -----
  btnSetMeeting.addEventListener('click', async ()=>{
    if(!currentGroupId) return alert('Join en gruppe først');
    if(myLat==null || myLng==null) return alert('Vi mangler din GPS – tjek tilladelser');
    await db.collection('groups').doc(currentGroupId).set({
      meeting: { lat: myLat, lng: myLng, by: myName || 'ukendt', at: firebase.firestore.FieldValue.serverTimestamp() }
    }, { merge:true });
    alert('Mødested gemt og delt med gruppen');
  });

  btnClearMeeting.addEventListener('click', async ()=>{
    if(!currentGroupId) return alert('Join en gruppe først');
    await db.collection('groups').doc(currentGroupId).set({
      meeting: firebase.firestore.FieldValue.delete()
    }, { merge:true });
    meetingPoint = null; updateMeetingMarker(); updateArrow();
  });

  // ----- Chat -----
  chatForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!currentGroupId) return alert('Join en gruppe først');
    const text = (chatInput.value||'').trim();
    if(!text) return;
    await db.collection('groups').doc(currentGroupId).collection('messages').add({
      text, by: myName || 'ukendt', uid: myUid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    chatInput.value='';
  });

  // ----- Foto upload -----
  photoInput.addEventListener('change', async (e)=>{
    if(!currentGroupId) return alert('Join en gruppe først');
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const ts = Date.now();
    const path = `groups/${currentGroupId}/photos/${myUid||'anon'}_${ts}_${file.name}`;
    try{
      const ref = storage.ref().child(path);
      await ref.put(file, { contentType:file.type });
      const url = await ref.getDownloadURL();
      await db.collection('groups').doc(currentGroupId).collection('photos').add({
        url, by: myName||'ukendt',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: ts + 30*24*60*60*1000 // klient-hint: 30 dage
      });
      alert('Billede uploadet');
    }catch(err){
      alert('Kunne ikke uploade: '+ err.message);
    }finally{
      photoInput.value='';
    }
  });

  // Auto-join hvis lagret
  if(currentGroupId){
    await db.collection('groups').doc(currentGroupId).set({ createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
    startGroupListeners();
  }
});
