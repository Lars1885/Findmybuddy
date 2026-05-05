// js/photo.js
// Enkel lokal billedvisning, ingen upload.

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("photoInput");
  const grid = document.getElementById("photoGrid");
  const info = document.getElementById("photoInfo");
  const backBtn = document.getElementById("backToGroupBtn");

  const params = typeof fmbGetParams === "function" ? fmbGetParams() : new URLSearchParams(window.location.search);
  const code = params.get("code") || "";
  const nick = params.get("nick") || "Anonym";

  backBtn?.addEventListener("click", () => {
    if (typeof fmbNavigate === "function") {
      fmbNavigate("group.html", { code, nick });
    } else {
      window.location.href = "group.html";
    }
  });

  input?.addEventListener("change", () => {
    const files = Array.from(input.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Uploadet billede";
      grid?.prepend(img);
    });

    if (info) {
      info.textContent = `${files.length} billede(r) tilføjet lokalt.`;
    }

    input.value = "";
  });
});
