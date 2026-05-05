// js/join.js
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("groupCodeInput");
  const btn = document.getElementById("joinBtn");
  if (!input || !btn) return;

  const params = fmbGetParams();
  const nick = params.get("nick") || "Anonym";

  btn.addEventListener("click", () => {
    const code = input.value.trim().toUpperCase();

    if (!code) {
      alert("Skriv gruppekode 🙂");
      return;
    }

    fmbNavigate("group.html", { code, role: "member", nick });
  });
});
