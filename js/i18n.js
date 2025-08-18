// /js/i18n.js
(function () {
  const strings = {
    da: {
      app_name: "Find My Buddy",
      join_or_create: "Join / Opret",
      save: "Gem",
      pointing_at: "Pejler mod:",
      distance: "Afstand:",
      save_camp: "Gem/opdatér Camp",
      walk_home: "Gå hjem sammen",
      take_photo: "Tag billede",
      group_gallery: "Gruppens galleri",
      chat: "Chat",
      send: "Send"
    }
  };

  const lang = 'da';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const t = strings[lang] && strings[lang][key];
    if (t) el.textContent = t;
  });
})();
