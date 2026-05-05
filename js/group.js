// js/group.js
function getCodeFromUrl() {
  const params = fmbGetParams();
  const c = params.get("code");
  if (c) return c.toUpperCase();
  return "";
}

document.addEventListener("DOMContentLoaded", () => {
  const codeEl = document.getElementById("groupCode");
  const roleEl = document.getElementById("groupRole");
  const nickEl = document.getElementById("groupNick");
  const arrowBtn = document.getElementById("openArrowBtn");
  const photoBtn = document.getElementById("openPhotoBtn");
  const leaveBtn = document.getElementById("leaveGroupBtn");

  const params = fmbGetParams();
  const code = getCodeFromUrl();
  const role = params.get("role") || "member";
  const nick = params.get("nick") || "Anonym";

  if (codeEl) codeEl.textContent = code || "— ingen kode fundet —";
  if (roleEl) roleEl.textContent = role === "admin" ? "Admin" : "Medlem";
  if (nickEl) nickEl.textContent = nick;

  if (arrowBtn) {
    arrowBtn.addEventListener("click", () => {
      fmbNavigate("arrow.html", { code, nick });
    });
  }

  if (photoBtn) {
    photoBtn.addEventListener("click", () => {
      fmbNavigate("photo.html", { code, nick });
    });
  }

  if (leaveBtn) {
    leaveBtn.addEventListener("click", () => {
      fmbNavigate("menu.html", { nick });
    });
  }
});
