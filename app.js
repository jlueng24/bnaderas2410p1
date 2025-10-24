/* ===== BRIDGE LOGROS: garantiza botón y cierre del drawer ===== */
(function achievementsBridge(){
  try {
    if (typeof window.renderAchievements !== 'function') window.renderAchievements = function(){};

    const btnAch = document.getElementById('btnAchievements');
    const achModal = document.getElementById('achModal');
    const achSection = document.getElementById('achievementsSection');
    const btnCloseDrawer = document.getElementById('closeAchievementDrawer');

    if (btnAch) {
      btnAch.addEventListener('click', () => {
        if (achModal && typeof achModal.showModal === 'function') {
          achModal.showModal();
        } else if (achSection) {
          achSection.classList.remove('hidden');
          try { renderAchievements(); } catch (_) {}
          const top = achSection.getBoundingClientRect().top + window.scrollY - 16;
          window.scrollTo({ top, behavior:'smooth' });
        }
      });
    }

    if (btnCloseDrawer) {
      btnCloseDrawer.addEventListener('click', () => {
        document.body.classList.remove('drawer-open');
      });
    }
  } catch(e) {
    console.warn('Achievements bridge disabled:', e);
  }
})();
