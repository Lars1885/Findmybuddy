// js/map.js

const {
  db,
  fmbGetGroupId,
  fmbGetMemberId
} = window.fmbFirebase;

let watchId = null;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Haversine distance i meter
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Bearing fra A -> B (grader)
function bearingDegrees(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(toRad(lon2 - lon1));
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

document.addEventListener("DOMContentLoaded", () => {
  const arrowEl = document.getElementById("arrow");
  const distanceEl = document.getElementById("distanceDisplay");
  const statusEl = document.getElementById("mapStatus");
  const targetNameEl = document.getElementById("targetName");

  const groupId = fmbGetGroupId();
  const memberId = fmbGetMemberId();
  const targetId = localStorage.getItem("fmb_target_member_id");
  const targetName = localStorage.getItem("fmb_target_member_name") || "Makker";

  if (!groupId || !memberId || !targetId) {
    statusEl.textContent = "Mangler info om gruppe eller makker.";
    return;
  }

  targetNameEl.textContent = "Du leder efter: " + targetName;

  const myRef = db.collection("groups").doc(groupId).collection("members").doc(memberId);
  const targetRef = db.collection("groups").doc(groupId).collection("members").doc(targetId);

  let myPos = null;
  let targetPos = null;

  // Lyt til mål-makker
  targetRef.onSnapshot((snap) => {
    const data = snap.data();
    if (!data || data.lat == null || data.lng == null) {
      statusEl.textContent = targetName + " har ikke delt sin position endnu.";
      return;
    }
    targetPos = { lat: data.lat, lng: data.lng };
    statusEl.textContent = "";
    updateArrow();
  });

  // Opdater egen position
  if (!navigator.geolocation) {
    statusEl.textContent = "Din enhed understøtter ikke GPS.";
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      myPos = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      // Send til Firestore
      try {
        await myRef.update({
          lat: myPos.lat,
          lng: myPos.lng,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {
        // Hvis doc ikke findes (edge case), så opret den
        await myRef.set({
          name: "Ukendt",
          lat: myPos.lat,
          lng: myPos.lng,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      updateArrow();
    },
    (err) => {
      console.error(err);
      statusEl.textContent = "Kunne ikke få din position. Tjek GPS-tilladelse.";
    },
    { enableHighAccuracy: true }
  );

  function updateArrow() {
    if (!myPos || !targetPos) return;
    const dist = distanceMeters(myPos.lat, myPos.lng, targetPos.lat, targetPos.lng);
    const bearing = bearingDegrees(myPos.lat, myPos.lng, targetPos.lat, targetPos.lng);

    distanceEl.textContent = Math.round(dist) + " m";

    const heading = 0; // vi bruger bare bearing direkte (kan senere justeres med device compass)
    const rotation = bearing - heading;

    if (arrowEl) {
      arrowEl.style.transform = `rotate(${rotation}deg)`;
    }
  }

  window.addEventListener("beforeunload", () => {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
    }
  });
});