// /js/firebaseconfig.js
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyCZxbnzgWQxQEeOIPEs6h-iEtX32k1sxQU",
    authDomain: "find-my-buddy-2f4d7.firebaseapp.com",
    projectId: "find-my-buddy-2f4d7",
    storageBucket: "find-my-buddy-2f4d7.firebasestorage.app",
    messagingSenderId: "463268034142",
    appId: "1:463268034142:web:b53c112cf764dcf66766cf",
    measurementId: "G-2LZB7EVTQV"
  };

  // Init en gang (compat SDK)
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Gør services globale til appen
  window.fmb = {
    auth: firebase.auth(),
    db: firebase.firestore(),
    storage: firebase.storage()
  };
})();
