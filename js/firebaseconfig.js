firebase.initializeApp(firebaseConfig);
window.fmb = { auth: firebase.auth(), db: firebase.firestore() };
