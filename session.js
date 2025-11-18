<script type="module">
// session.js – holder din position live i Firestore

import { app, db } from "./firebase.js";
import {
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const groupId = params.get("group");
let user = params.get("user") || "ukendt";

if (!groupId) {
  console.error("Ingen groupId i URL");
}

const stateEl = document.getElementById("state") || null;
const toast = (msg) => {
  console.log(msg);
  if (stateEl) stateEl.textContent = msg;
};

function writePosition(lat, lng, accuracy) {
  const ref = doc(db, "groups", groupId, "members", user);
  return setDoc(ref, {
    user,
    lat,
    lng,
    accuracy: accuracy ?? null,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function startWatch() {
  if (!navigator.geolocation) {
    toast("Din browser understøtter ikke geolocation.");
    return;
  }
  toast("Starter GPS…");

  const watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      await writePosition(latitude, longitude, accuracy);
      toast("Position opdateret ✔");
    },
    (err) => {
      toast("Kunne ikke få adgang til din placering. " + err.message);
      console.warn(err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000
    }
  );

  // Stop pænt når siden lukkes
  window.addEventListener("beforeunload", () => {
    if (watchId) navigator.geolocation.clearWatch(watchId);
  });
}

startWatch();
</script>