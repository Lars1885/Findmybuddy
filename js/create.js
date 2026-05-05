// js/create.js
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

  const params = fmbGetParams();
  const nick = params.get("nick") || "Anonym";

  createBtn.addEventListener("click", () => {
    const code = generateGroupCode();
    fmbNavigate("group.html", { code, role: "admin", nick });
  });
});
