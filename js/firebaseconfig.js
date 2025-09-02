// js/firebaseconfig.js

const firebaseConfig = {
  apiKey: "AIzaSyCfJSJDYf4_sZwZqNuaIBLa_qHzV4pPFMY",
  authDomain: "find-my-buddy-2.firebaseapp.com",
  projectId: "find-my-buddy-2",
  storageBucket: "find-my-buddy-2.appspot.com",
  messagingSenderId: "913962807255",
  appId: "1:913962807255:web:81d09312386f97b12e2592",
  measurementId: "G-4RS0KM5CWS"
};

// Initialize Firebase (compat version)
firebase.initializeApp(firebaseConfig);

// Gør services tilgængelige globalt
window.fmb = window.fmb || {};
window.fmb.db = firebase.firestore();
window.fmb.auth = firebase.auth();
