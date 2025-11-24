// js/join.js
const GROUP_KEY = "fmb_group_code";

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("groupCodeInput");
  const btn = document.getElementById("joinBtn");

  if (!input || !btn) return;

  btn.addEventListener("click", () => {
    const code = input.value.trim().toUpperCase();

    if (!code) {
      alert("Skriv gruppekode 🙂");
      return;
    }

    // gem koden til resten af appen
    localStorage.setItem(GROUP_KEY, code);

    // videre til gruppesiden
    window.location.href = "group.html";
  });
});
