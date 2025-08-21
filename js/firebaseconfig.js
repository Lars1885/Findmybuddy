// Din nye Firebase konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyCfJSDJYf4_sZwZqNualbLa_qHZv4pPFMY",
  authDomain: "find-my-buddy-2.firebaseapp.com",
  projectId: "find-my-buddy-2",
  storageBucket: "find-my-buddy-2.appspot.com",
  messagingSenderId: "913962807255",
  appId: "1:913962807255:web:810d9312386f97b12e2592",
  measurementId: "G-4RS0KM5CWS"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// Hent Firebase Auth
const auth = firebase.auth();
