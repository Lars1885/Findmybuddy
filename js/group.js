// js/group.js
const GROUP_KEY = "fmb_group_code";

function getCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const c = params.get("code");
  if (c) return c.toUpperCase();
  return null;
}

document.addEventListener("DOMContentLoaded", () => {
  const codeEl = document.getElementById("groupCode");
  const arrowBtn = document.getElementById("openArrowBtn");
  const photoBtn = document.getElementById("openPhotoBtn");

  // Prøv først at læse koden fra URL'en
  let code = getCodeFromUrl();

  // Hvis der ikke er kode i URL, så prøv localStorage
  if (!code) {
    code = localStorage.getItem(GROUP_KEY) || "";
  }

  // Vis noget, så vi VED scriptet kører
  if (codeEl) {
    codeEl.textContent = code || "— ingen kode fundet —";
  }

  // Hvis vi har en kode, så gem den lokalt
  if (code) {
    localStorage.setItem(GROUP_KEY, code);
  }

  // Knap til pil-siden
  if (arrowBtn) {
    arrowBtn.addEventListener("click", () => {
      window.location.href = "arrow.html";
    });
  }

  // Knap til billed-siden
  if (photoBtn) {
    photoBtn.addEventListener("click", () => {
      window.location.href = "photo.html";
    });
  }
});
