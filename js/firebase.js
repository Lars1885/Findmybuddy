// js/firebase.js
// Kompatibilitetsfil: viderefører til firebaseconfig.js, så ældre HTML-sider ikke fejler.

if (!window.fmb) {
  console.warn('firebase.js loaded without firebaseconfig.js context.');
}
