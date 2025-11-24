// js/group.js

const GROUP_KEY = "fmb_group_code";

document.addEventListener("DOMContentLoaded", () => {
  const codeEl = document.getElementById("groupCode");
  const arrowBtn = document.getElementById("openArrowBtn");
  const photoBtn = document.getElementById("openPhotoBtn");

  const code = localStorage.getItem(GROUP_KEY) || "";

  if (codeEl) {
    codeEl.textContent = code;
  }

  if (arrowBtn) {
    arrowBtn.addEventListener("click", () => {
      window.location.href = "arrow.html";
    });
  }

  if (photoBtn) {
    photoBtn.addEventListener("click", () => {
      window.location.href = "photo.html";
    });
  }
});
