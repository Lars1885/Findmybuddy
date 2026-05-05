// js/map.js
// Enkel pil-visning så siden virker uden backend.

document.addEventListener("DOMContentLoaded", () => {
  const arrowEl = document.getElementById("arrow");
  const statusEl = document.getElementById("mapStatus");
  const distanceEl = document.getElementById("distanceDisplay");
  const backBtn = document.getElementById("backToGroupBtn");
  const params = typeof fmbGetParams === "function" ? fmbGetParams() : new URLSearchParams(window.location.search);

  const code = params.get("code") || "";
  const nick = params.get("nick") || "Anonym";

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (typeof fmbNavigate === "function") {
        fmbNavigate("group.html", { code, nick });
      } else {
        window.location.href = "group.html";
      }
    });
  }

  if (!arrowEl || !statusEl || !distanceEl) return;

  statusEl.textContent = "Pil er aktiv (demo).";
  distanceEl.textContent = "~25 m";

  let angle = 0;
  setInterval(() => {
    angle = (angle + 12) % 360;
    arrowEl.style.transform = `rotate(${angle}deg)`;
  }, 800);

  if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", (event) => {
      if (event.alpha == null) return;
      const heading = Math.round(event.alpha);
      arrowEl.style.transform = `rotate(${heading}deg)`;
      statusEl.textContent = `Kompas: ${heading}°`;
    });
  }
});
