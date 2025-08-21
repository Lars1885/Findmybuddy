// js/app.js
document.addEventListener('DOMContentLoaded', async () => {
  // ----- Firebase services -----
  const auth    = (window.fmb && window.fmb.auth)    || firebase.auth();
  const db      = (window.fmb && window.fmb.db)      || firebase.firestore();
  const storage = (window.fmb && window.fmb.storage) || firebase.storage();

  // ----- DOM -----
  const groupIdInput     = document.getElementById('groupIdInput');
  const btnJoin          = document.getElementById('btnJoin');
  const displayNameInput = document.getElementById('displayNameInput');
  const btnSaveName      = document.getElementById('btnSaveName');

  const buddySelect   = document.getElementById('buddySelect');
  const distanceLabel = document.getElementById('distanceLabel');
  const needle        = document.getElementById('needle');

  const btnSetMeeting   = document.getElementById('btnSetMeeting');
  const btnClearMeeting = document.getElementById('btnClearMeeting');

  const mapDiv     = document.getElementById('map');
  const photoInput = document.getElementById('photoInput');
  const photoGrid  = document.getElementById('photoGrid');

  const chatList  = document.getElementById('chatList');
  const chatForm  = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  // ----- State -----
  let groupId = localStorage.getItem('fmb_group') || '';
  let myName  = localStorage.getItem('fmb_name')  || '';
  if (groupId) groupIdInput.value = groupId;
  if (myName)  displayNameInput.value = myName;

  let me = null;               // auth user
  let myLat = null, myLng = null;
  let headingDeg = null;       // device heading
  let members = {};            // { uid: {id,name,lat,lng,...} }
  let targetId = null;         // selected buddy id
  let meetingPoint = null;     // {lat,lng}

  let map = null, myMarker = null, meetingMarker = null;
  let unsubMembers=null, unsubChat=null, unsubPhotos=null, unsubGroup=null;

  // ----- Utils -----
  const toRad = d=>d*Math.PI/180;
  const toDeg = r=>r*180/Math.PI;
  const norm  = a=> (a%360+360)%360;

  function bearing(lat1, lon1, lat2, lon2){
    const φ1 = toRad(lat1), φ2 = toRad(lat2);
    const dλ = toRad(lon2 - lon1);
    const y = Math.sin(dλ)*Math.cos(φ2);
    const x = Math.cos(φ1)*Math.cos(φ2)*Math.cos(dλ) + Math.sin(φ1)*Math.sin(φ2);
    return norm(toDeg(Math.atan2(y, x)));
  }
  function distanceMeters(lat1, lon1, lat2, lon2){
    const R=6371000;
    const dφ=toRad(lat2-lat1), dλ=toRad(lon2-lon1);
    const a=Math.sin(dφ/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dλ/2)**2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  }

  // ----- Auth anonym -----
  try {
    const cred = await auth.signInAnonymously();
    me = cred.user;
    console.log('Anon login OK', me.uid);
  } catch (e) {
    alert('Kunne ikke logge ind: ' + e.message);
    return;
  }

  // ----- Map init -----
  map = L.map(mapDiv, { zoomControl:true, attributionControl:false }).setView([56.0,10.0], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom:19 }).addTo(map);
  myMarker = L.marker([56.0,10.0]).addTo(map).bindPopup('Mig');

  // ----- Device heading / kompas -----
  window.addEventListener('deviceorientation', (e)=>{
    const ios = (typeof e.webkitCompassHeading === 'number') ? e.webkitCompassHeading : null;
    const a = (typeof e.alpha === 'number') ? e.alpha : null;
    if (ios!=null) headingDeg = ios;
    else if (a!=null){
      const scr = (screen.orientation && typeof screen.orientation.angle==='number') ? screen.orientation.angle : 0;
      headingDeg = norm(360 - (a + scr));
    } else { headingDeg = null; }
    updateArrow();
  }, { passive:true });

  // ----- Geolocation -----
  if ('geolocation' in navigator){
    navigator.geolocation.watchPosition(async pos=>{
      myLat = pos.coords.latitude; myLng = pos.coords.longitude;
      myMarker.setLatLng([myLat,myLng]);
      if (map.getZoom() < 14) map.setView([myLat,myLng], 14);
      updateArrow();

      if (groupId){
        await db.collection('groups').doc(groupId).collection('members').doc(me.uid).set({
          uid: me.uid, name: myName || 'Ukendt', lat: myLat, lng: myLng,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge:true });
      }
    }, err=>console.warn('Geo fejl', err), { enableHighAccuracy:true, maximumAge:1000, timeout:10000 });
  }

  // ----- UI handlers -----
  btnJoin.addEventListener('click', async ()=>{
    const gid = (groupIdInput.value||'').trim();
    if (!gid) return alert('Skriv et gruppe-ID');
    groupId = gid; localStorage.setItem('fmb_group', groupId);

    // opret gruppe-doc hvis ikke findes
    await db.collection('groups').doc(groupId).set({
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true });

    // (gen)start lyttere
    startRealtime();
    alert('Du er nu i gruppe: ' + groupId);
  });

  btnSaveName.addEventListener('click', async ()=>{
    myName = (displayNameInput.value||'').trim();
    if (!myName) return alert('Skriv dit navn');
    localStorage.setItem('fmb_name', myName);
    if (!groupId) return alert('Join en gruppe først');

    await db.collection('groups').doc(groupId).collection('members').doc(me.uid).set({
      uid: me.uid, name: myName, lat: myLat??null, lng: myLng??null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true });

    alert('Navn gemt');
  });

  buddySelect.addEventListener('change', ()=> {
    targetId = buddySelect.value || null;
    updateArrow();
  });

  btnSetMeeting.addEventListener('click', async ()=>{
    if (!groupId) return alert('Join en gruppe først');
    if (myLat==null) return alert('Vi mangler din GPS – tjek tilladelser');
    await db.collection('groups').doc(groupId).set({
      meeting: { lat: myLat, lng: myLng, by: myName || 'ukendt', at: firebase.firestore.FieldValue.serverTimestamp() }
    }, { merge:true });
    alert('Mødested gemt og delt');
  });

  btnClearMeeting.addEventListener('click', async ()=>{
    if (!groupId) return alert('Join en gruppe først');
    await db.collection('groups').doc(groupId).set({ meeting: firebase.firestore.FieldValue.delete() }, { merge:true });
  });

  photoInput.addEventListener('change', async (e)=>{
    if (!groupId) return alert('Join en gruppe først');
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try{
      const path = `groups/${groupId}/photos/${me.uid}_${Date.now()}_${file.name}`;
      const ref = storage.ref().child(path);
      await ref.put(file, { contentType:file.type });
      const url = await ref.getDownloadURL();
      await db.collection('groups').doc(groupId).collection('photos').add({
        url, by: myName || 'ukendt', uid: me.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        // klient-hint til 30 dages sletning – egentlig håndhæves på backend/cron
        expiresAt: Date.now() + 30*24*60*60*1000
      });
      alert('Billede uploadet');
    } catch(e){ alert('Upload-fejl: ' + e.message); }
    photoInput.value = '';
  });

  chatForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (!groupId) return alert('Join en gruppe først');
    const text = (chatInput.value||'').trim(); if (!text) return;
    await db.collection('groups').doc(groupId).collection('messages').add({
      text, uid: me.uid, by: myName || 'ukendt',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    chatInput.value = '';
  });

  // ----- Realtime lyttere -----
  function startRealtime(){
    if (unsubMembers) unsubMembers(); if (unsubChat) unsubChat(); if (unsubPhotos) unsubPhotos(); if (unsubGroup) unsubGroup();

    unsubGroup = db.collection('groups').doc(groupId).onSnapshot(s=>{
      const d = s.data()||{};
      if (d.meeting && typeof d.meeting.lat==='number'){
        meetingPoint = { lat:d.meeting.lat, lng:d.meeting.lng };
        // marker på kort
        if (!meetingMarker){
          meetingMarker = L.marker([meetingPoint.lat, meetingPoint.lng], { opacity:0.9 }).addTo(map).bindPopup('Mødested');
        } else {
          meetingMarker.setLatLng([meetingPoint.lat, meetingPoint.lng]);
        }
      } else {
        meetingPoint = null;
        if (meetingMarker){ map.removeLayer(meetingMarker); meetingMarker=null; }
      }
      updateArrow();
    });

    unsubMembers = db.collection('groups').doc(groupId).collection('members')
      .onSnapshot(snap=>{
        members = {};
        snap.forEach(doc=>{ members[doc.id] = { id:doc.id, ...(doc.data()||{}) }; });
        renderBuddySelect();
        updateArrow();
      });

    unsubChat = db.collection('groups').doc(groupId).collection('messages')
      .orderBy('createdAt','asc').limit(500).onSnapshot(snap=>{
        chatList.innerHTML = '';
        snap.forEach(doc=>{
          const m = doc.data(); if (!m.text) return;
          const div = document.createElement('div');
          div.className = 'bubble ' + ((m.uid=== (me&&me.uid)) ? 'me':'them');
          div.textContent = (m.by ? `${m.by}: `:'') + m.text;
          chatList.appendChild(div);
        });
        chatList.scrollTop = chatList.scrollHeight;
      });

    unsubPhotos = db.collection('groups').doc(groupId).collection('photos')
      .orderBy('createdAt','desc').limit(60).onSnapshot(snap=>{
        photoGrid.innerHTML = '';
        snap.forEach(doc=>{
          const p = doc.data(); if (!p.url) return;
          const img = document.createElement('img');
          img.src = p.url; img.alt = p.by || '';
          photoGrid.appendChild(img);
        });
      });
  }

  function renderBuddySelect(){
    const others = Object.values(members).filter(m=> m.id !== (me&&me.uid) && m.lat!=null);
    buddySelect.innerHTML = '';
    // Mødested option først (hvis findes)
    if (meetingPoint){
      const o = document.createElement('option');
      o.value = '__MEETING__'; o.textContent = 'Mødested';
      buddySelect.appendChild(o);
    }
    if (others.length===0){
      const o = document.createElement('option'); o.value=''; o.textContent='—';
      buddySelect.appendChild(o);
      targetId = meetingPoint ? '__MEETING__' : null;
    } else {
      others.forEach(m=>{
        const o = document.createElement('option'); o.value = m.id; o.textContent = m.name || m.id;
        buddySelect.appendChild(o);
      });
      if (!targetId || (!meetingPoint && targetId==='__MEETING__') || !others.find(x=>x.id===targetId)){
        targetId = meetingPoint ? '__MEETING__' : others[0].id;
      }
      buddySelect.value = targetId;
    }
  }

  // ----- Pil-opdatering -----
  function updateArrow(){
    if (!needle) return;

    let tgtLat=null, tgtLng=null, label='–';
    if (targetId === '__MEETING__' && meetingPoint){
      tgtLat = meetingPoint.lat; tgtLng = meetingPoint.lng; label='Mødested';
    } else if (targetId && members[targetId] && members[targetId].lat!=null){
      tgtLat = members[targetId].lat; tgtLng = members[targetId].lng; label = members[targetId].name || 'Ven';
    } else if (meetingPoint){
      tgtLat = meetingPoint.lat; tgtLng = meetingPoint.lng; label='Mødested';
    }

    if (tgtLat==null || myLat==null){ distanceLabel.textContent='– m'; return; }

    const brg = bearing(myLat,myLng, tgtLat,tgtLng);
    const dist= distanceMeters(myLat,myLng, tgtLat,tgtLng);
    distanceLabel.textContent = `${dist} m`;

    const rot = (headingDeg==null) ? brg : norm(brg - headingDeg);
    needle.setAttribute('transform', `rotate(${rot} 100 100)`);
  }

  // Auto-join hvis vi allerede har gruppe gemt
  if (groupId){
    await db.collection('groups').doc(groupId).set({
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true });
    startRealtime();
  }
});
