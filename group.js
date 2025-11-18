// js/group.js

const { db, fmbGetName, fmbGetGroupId, fmbSetGroupId, fmbGetMemberId, fmbSetMemberId } =
  window.fmbFirebase;

// Hjælp: generér 6-tegns kode
function generateGroupCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Opret gruppe
async function handleCreateGroup() {
  const statusEl = document.getElementById("createStatus");
  if (!statusEl) return;

  statusEl.textContent = "Opretter gruppe…";

  const code = generateGroupCode();
  const groupRef = db.collection("groups").doc(code);

  const name = fmbGetName();

  try {
    await groupRef.set({
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      active: true
    });

    const memberRef = groupRef.collection("members").doc();
    await memberRef.set({
      name,
      lat: null,
      lng: null,
      updatedAt: null
    });

    fmbSetGroupId(code);
    fmbSetMemberId(memberRef.id);

    statusEl.textContent = "Gruppe oprettet ✅";
    window.location.href = "group.html";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Der skete en fejl – prøv igen.";
  }
}

// Join gruppe
async function handleJoinGroup() {
  const input = document.getElementById("groupCodeInput");
  const statusEl = document.getElementById("joinStatus");
  if (!input || !statusEl) return;

  const code = input.value.trim().toUpperCase();
  if (!code || code.length < 4) {
    statusEl.textContent = "Skriv en gyldig kode.";
    return;
  }

  statusEl.textContent = "Tjekker gruppe…";

  const groupRef = db.collection("groups").doc(code);
  const snap = await groupRef.get();

  if (!snap.exists) {
    statusEl.textContent = "Den gruppe findes ikke.";
    return;
  }

  const name = fmbGetName();

  try {
    const memberRef = groupRef.collection("members").doc();
    await memberRef.set({
      name,
      lat: null,
      lng: null,
      updatedAt: null
    });

    fmbSetGroupId(code);
    fmbSetMemberId(memberRef.id);

    statusEl.textContent = "Du er nu med i gruppen 🎉";
    window.location.href = "group.html";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Der skete en fejl – prøv igen.";
  }
}

// Vis gruppe + medlemmer
function setupGroupScreen() {
  const groupCodeDisplay = document.getElementById("groupCodeDisplay");
  const memberList = document.getElementById("memberList");
  const groupStatus = document.getElementById("groupStatus");

  if (!groupCodeDisplay || !memberList) return;

  const groupId = fmbGetGroupId();
  if (!groupId) {
    groupStatus.textContent = "Du er ikke i en gruppe endnu.";
    return;
  }

  groupCodeDisplay.textContent = groupId;

  const groupRef = db.collection("groups").doc(groupId);
  groupRef.collection("members").onSnapshot((snap) => {
    memberList.innerHTML = "";
    if (snap.empty) {
      groupStatus.textContent = "Ingen medlemmer endnu.";
      return;
    }

    snap.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement("li");
      const spanName = document.createElement("span");
      spanName.textContent = data.name || "Ukendt";

      const btn = document.createElement("button");
      btn.textContent = "Find";
      btn.addEventListener("click", () => {
        localStorage.setItem("fmb_target_member_id", doc.id);
        localStorage.setItem("fmb_target_member_name", data.name || "Makker");
        window.location.href = "map.html";
      });

      li.appendChild(spanName);
      if (doc.id !== fmbGetMemberId()) {
        li.appendChild(btn);
      }

      memberList.appendChild(li);
    });
  });
}

// Event listeners pr. side
document.addEventListener("DOMContentLoaded", () => {
  const createBtn = document.getElementById("createGroupBtn");
  const joinBtn = document.getElementById("joinGroupBtn");

  if (createBtn) {
    createBtn.addEventListener("click", handleCreateGroup);
  }
  if (joinBtn) {
    joinBtn.addEventListener("click", handleJoinGroup);
  }

  if (document.getElementById("memberList")) {
    setupGroupScreen();
  }
});