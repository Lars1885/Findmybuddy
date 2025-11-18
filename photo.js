// js/photo.js

const {
  db,
  storage,
  fmbGetGroupId,
  fmbGetMemberId,
  fmbGetName
} = window.fmbFirebase;

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("photoInput");
  const uploadBtn = document.getElementById("uploadPhotoBtn");
  const statusEl = document.getElementById("photoStatus");
  const grid = document.getElementById("photoGrid");

  const groupId = fmbGetGroupId();
  const memberId = fmbGetMemberId();

  if (!groupId || !memberId) {
    statusEl.textContent = "Du skal være i en gruppe for at bruge albummet.";
    return;
  }

  if (!storage) {
    statusEl.textContent = "Storage er ikke initialiseret.";
    return;
  }

  uploadBtn.addEventListener("click", async () => {
    const file = input.files && input.files[0];
    if (!file) {
      alert("Vælg eller tag et billede først 👍");
      return;
    }

    statusEl.textContent = "Uploader billede…";

    try {
      const filename = Date.now() + "_" + file.name.replace(/\s+/g, "_");
      const ref = storage.ref().child(`groups/${groupId}/${filename}`);

      await ref.put(file);
      const url = await ref.getDownloadURL();

      await db
        .collection("groups")
        .doc(groupId)
        .collection("photos")
        .add({
          url,
          by: fmbGetName(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      statusEl.textContent = "Billede uploadet ✅";
      input.value = "";
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Fejl ved upload – prøv igen.";
    }
  });

  // Lyt til billeder
  db.collection("groups")
    .doc(groupId)
    .collection("photos")
    .orderBy("createdAt", "desc")
    .onSnapshot((snap) => {
      grid.innerHTML = "";
      snap.forEach((doc) => {
        const data = doc.data();
        const img = document.createElement("img");
        img.src = data.url;
        img.alt = data.by || "Buddy";
        grid.appendChild(img);
      });
    });
});