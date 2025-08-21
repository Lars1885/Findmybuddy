// js/firebaseconfig.js
(function () {
  const firebaseConfig = {
    apiKey: "DIN_API_KEY",
    authDomain: "DIT_PROJECT_ID.firebaseapp.com",
    projectId: "DIT_PROJECT_ID",
    storageBucket: "DIT_PROJECT_ID.appspot.com",
    messagingSenderId: "XXXXXXXXXXXX",
    appId: "1:XXXXXXXXXXXX:web:XXXXXXXXXXXX",
    measurementId: "G-XXXXXXXXXX"
  };

  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Eksponer services globalt til app.js
  window.fmb = {
    auth: firebase.auth(),
    db: firebase.firestore(),
    storage: firebase.storage()
  };
})();
