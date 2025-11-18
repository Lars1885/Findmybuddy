// js/app.js

const NAME_KEY = "fmb_name";
const INTRO_DONE_KEY = "fmb_intro_done";

document.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.getElementById("nameInput");
  const startBtn = document.getElementById("startBtn");
  const introContinueBtn = document.getElementById("introContinueBtn");

  const savedName = localStorage.getItem(NAME_KEY);
  if (nameInput && savedName) {
    nameInput.value = savedName;
  }

  if (startBtn && nameInput) {
    startBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      if (!name) {
        alert("Skriv lige dit navn 😊");
        return;
      }
      localStorage.setItem(NAME_KEY, name);

      const introDone = localStorage.getItem(INTRO_DONE_KEY) === "1";
      if (introDone) {
        window.location.href = "menu.html";
      } else {
        window.location.href = "intro.html";
      }
    });
  }

  if (introContinueBtn) {
    introContinueBtn.addEventListener("click", () => {
      localStorage.setItem(INTRO_DONE_KEY, "1");
      window.location.href = "menu.html";
    });
  }
});