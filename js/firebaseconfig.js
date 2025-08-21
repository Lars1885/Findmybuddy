// js/firebaseconfig.js

// Din Firebase konfiguration (fra dit projekt "find-my-buddy-2")
const firebaseConfig = {
  apiKey: "AIzaSyCfJSDJYF4_sZwZqNualbLa_qHZv4pPFMY",
  authDomain: "find-my-buddy-2.firebaseapp.com",
  projectId: "find-my-buddy-2",
  storageBucket: "find-my-buddy-2.appspot.com",
  messagingSenderId: "913962807255",
  appId: "1:913962807255:web:810d9312386f97b12e2592",
  measurementId: "G-4RS0KM5CWS"
};

// Initialiser Firebase og eksponér services til app.js
firebase.initializeApp(firebaseConfig);
window.fmb = {
  auth: firebase.auth(),
  db: firebase.firestore(),
  storage: firebase.storage()
};

