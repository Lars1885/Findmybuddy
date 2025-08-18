// js/firebaseconfig.js
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyCXzbnqHWgKEoEtP6eS6h-iEtXk32LsxQU",
    authDomain: "find-my-buddy-2f4d7.firebaseapp.com",
    projectId: "find-my-buddy-2f4d7",
    storageBucket: "find-my-buddy-2f4d7.appspot.com",
    messagingSenderId: "463268034142",
    appId: "1:463268034142:web:b53c112cf76d4cfc7666cf",
    measurementId: "G-2LBZTEQVQV"
  };

  // Tjek om Firebase allerede er initialiseret
  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }

  // Gør auth, db og storage tilgængeligt i appen
  window.fmb = {
    auth: firebase.auth(),
    db: firebase.firestore(),
    storage: firebase.storage()
  };
})();
