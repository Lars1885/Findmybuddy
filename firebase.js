// js/firebase.js

// Sæt din egen config her:
const firebaseConfig = {
  apiKey: "DIN_API_KEY",
  authDomain: "DIT_PROJEKT.firebaseapp.com",
  projectId: "DIT_PROJEKT",
  storageBucket: "DIT_PROJEKT.appspot.com",
  messagingSenderId: "DIN_SENDER_ID",
  appId: "DIN_APP_ID"
};

// Init kun én gang
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
let storage = null;
try {
  storage = firebase.storage();
} catch (e) {
  // storage er kun tilgængelig på sider, der loader storage-compat
}

function fmbGetName() {
  return localStorage.getItem("fmb_name") || "Ukendt";
}

function fmbGetGroupId() {
  return localStorage.getItem("fmb_group_id") || null;
}

function fmbSetGroupId(id) {
  localStorage.setItem("fmb_group_id", id);
}

function fmbGetMemberId() {
  return localStorage.getItem("fmb_member_id") || null;
}

function fmbSetMemberId(id) {
  localStorage.setItem("fmb_member_id", id);
}

// Eksporter til globalt scope
window.fmbFirebase = {
  db,
  storage,
  fmbGetName,
  fmbGetGroupId,
  fmbSetGroupId,
  fmbGetMemberId,
  fmbSetMemberId
};