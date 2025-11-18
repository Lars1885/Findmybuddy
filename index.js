// index.js – håndterer forsiden i Find My Buddy

// Hent HTML-elementer
const usernameInput = document.getElementById("username");
const groupInput = document.getElementById("groupName");
const createBtn = document.getElementById("createGroupBtn");
const joinBtn = document.getElementById("joinGroupBtn");
const errorBox = document.getElementById("error");

// En lille hjælper til at vise fejl
function showError(message) {
  if (!errorBox) return;
  errorBox.textContent = message || "";
}

// Normaliser gruppenavn → bruges som ID
function normalizeGroupId(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

// Fælles funktion når vi skal videre til group.html
function goToGroup(isCreator) {
  const name = usernameInput.value.trim();
  const groupName = groupInput.value.trim();

  if (!name || !groupName) {
    showError("Skriv både navn og gruppe først.");
    return;
  }

  showError("");

  // Lav et pænt groupId
  const groupId = normalizeGroupId(groupName);

  // Gem i localStorage så de andre sider kan bruge det
  localStorage.setItem("userName", name);
  localStorage.setItem("groupName", groupName);
  localStorage.setItem("groupId", groupId);
  localStorage.setItem("isCreator", isCreator ? "1" : "0");

  // Navigér videre til group.html med parametre
  const url = `group.html?group=${encodeURIComponent(
    groupId
  )}&user=${encodeURIComponent(name)}`;

  window.location.href = url;
}

// Klik-håndtering
if (createBtn) {
  createBtn.addEventListener("click", () => {
    goToGroup(true); // opretter gruppe
  });
}

if (joinBtn) {
  joinBtn.addEventListener("click", () => {
    goToGroup(false); // deltager i eksisterende gruppe
  });
}

// Hvis bruger kommer tilbage til forsiden, fyld felter ud med seneste værdier
window.addEventListener("DOMContentLoaded", () => {
  const savedName = localStorage.getItem("userName") || "";
  const savedGroup = localStorage.getItem("groupName") || "";

  if (savedName) usernameInput.value = savedName;
  if (savedGroup) groupInput.value = savedGroup;
});