// js/create.js
const GROUP_KEY = "fmb_group_code";

function generateGroupCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

document.addEventListener("DOMContentLoaded", () => {
  const createBtn = document.getElementById("createGroupBtn");
  if (!createBtn) return;

  createBtn.addEventListener("click", () => {
    const code = generateGroupCode();

    // Gem evt. lokalt
    localStorage.setItem(GROUP_KEY, code);

    // Gå til gruppesiden med koden i URL'en
    window.location.href = `group.html?code=${encodeURIComponent(code)}`;
  });
});
