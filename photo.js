// js/photo.js

const NAME_KEY = "fmb_name";
const GROUP_KEY = "fmb_group_code";

document.addEventListener("DOMContentLoaded", () => {
  const takePhotoBtn = document.getElementById("takePhotoBtn");
  const backToGroupBtn = document.getElementById("backToGroupBtn");
  const photoInput = document.getElementById("photoInput");
  const photoGrid = document.getElementById("photoGrid");
  const photoInfo = document.getElementById("photoInfo");

  const groupCode = localStorage.getItem(GROUP_KEY) || "DEFAULT";
  const userName = localStorage.getItem(NAME_KEY) || "Ukendt";

  const STORAGE_KEY = `fmb_photos_${groupCode}`;

  photoInfo.textContent = `Gruppe: ${groupCode} – makker: ${userName}`;

  // Hent gemte billeder for gruppen
  let photos = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    photos = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Kunne ikke læse gemte billeder", err);
    photos = [];
  }

  function renderPhotos() {
    photoGrid.innerHTML = "";
    if (!photos.length) {
      const p = document.createElement("p");
      p.className = "small";
      p.textContent = "Ingen billeder endnu – tag det første 😊";
      photoGrid.appendChild(p);
      return;
    }

    photos.forEach((p) => {
      const wrapper = document.createElement("div");
      wrapper.className = "photo-item";

      const img = document.createElement("img");
      img.src = p.dataUrl;
      img.alt = p.takenBy || "Billede";

      wrapper.appendChild(img);
      photoGrid.appendChild(wrapper);
    });
  }

  function savePhotos() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
    } catch (err) {
      console.error("Kunne ikke gemme billeder", err);
      alert("Kunne ikke gemme billedet – måske for lidt plads.");
    }
  }

  takePhotoBtn.addEventListener("click", () => {
    photoInput.click();
  });

  photoInput.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;

      photos.unshift({
        dataUrl,
        takenBy: userName,
        ts: Date.now(),
      });

      savePhotos();
      renderPhotos();
    };
    reader.readAsDataURL(file);

    // Nulstil input så man kan vælge samme fil igen, hvis man vil
    event.target.value = "";
  });

  backToGroupBtn.addEventListener("click", () => {
    window.location.href = "group.html";
  });

  renderPhotos();
});
