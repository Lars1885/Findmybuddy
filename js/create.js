// js/create.js

const GROUP_KEY = "fmb_group_code";

function generateGroupCode() {
  const chars = "ABCDEFGHJKLMPQRSTUVWX YZ23456789".replace(" ", "");
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

    // gem koden i browseren
    localStorage.setItem(GROUP_KEY, code);

    // videre til gruppesiden
    window.location.href = "group.html";
  });
});
