// js/firebaseconfig.js
(function () {
  // DINE nøgler fra Firebase Console (Project settings → Web app → Config)
  const firebaseConfig = {
    apiKey: "AIzaSyCXbznhzgWqKEoEtP6e56h-iEtX32LsxQU",
    authDomain: "find-my-buddy-2f4d7.firebaseapp.com",
    projectId: "find-my-buddy-2f4d7",
    // VIGTIGT: Storage skal ende på .appspot.com
    storageBucket: "find-my-buddy-2f4d7.appspot.com",
    messagingSenderId: "463268034142",
    appId: "1:463268034142:web:b53c112c7fd46dc6766cf",
    measurementId: "G-2LZB7EVTQV"
  };

  // Init compat SDK
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Gør services tilgængelige globalt
  window.fmb = {
    auth: firebase.auth(),
    db: firebase.firestore(),
    storage: firebase.storage()
  };

  // Log ind anonymt én gang ved start (safe no-op hvis allerede logget ind)
  window.fmb.auth.signInAnonymously()
    .then(() => console.log("[Auth] Anonym login OK"))
    .catch(err => alert("Kunne ikke logge ind: " + err));
})();
