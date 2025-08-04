// === Hafizh Rizqullah | GeminiAnswerBot ===
// 🔒 Created by Hafizh Rizqullah || Refine by AI Assistant
// 📄 js/options/nav.js
// 🕓 Created: 2024-05-22 10:05:00
// 🧠 Modular | DRY | SOLID | Apple HIG Compliant

const NavModule = (() => {
  let navLinks = null;
  let contentPanes = null;

  /**
   * Pindah ke tab yang ditentukan.
   * @param {string} targetId - ID dari pane konten yang akan ditampilkan.
   */
  function switchTab(targetId) {
    navLinks.forEach(navLink => {
      const isActive = navLink.getAttribute('href') === `#${targetId}`;
      navLink.classList.toggle('active', isActive);
    });
    contentPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === targetId);
    });
    window.location.hash = targetId;

    // Dispatch custom event saat tab history aktif
    if (targetId === 'history') {
      document.dispatchEvent(new CustomEvent('historyTabActivated'));
    }
  }

  /**
   * Menampilkan tab awal berdasarkan hash URL atau default ke 'general'.
   */
  function showInitialTab() {
    const hash = window.location.hash.slice(1);
    const targetLink = document.querySelector(`.settings-sidebar a[href="#${hash}"]`);
    if (hash && targetLink) {
      switchTab(hash);
    } else {
      switchTab('general');
    }
  }

  /**
   * Menginisialisasi modul navigasi dengan elemen DOM yang diperlukan.
   * @param {object} elements - Peta elemen DOM dari file utama.
   */
  function initialize(elements) {
    navLinks = elements.navLinks;
    contentPanes = elements.contentPanes;

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(link.getAttribute('href').substring(1));
      });
    });

    showInitialTab();
  }

  return {
    initialize,
  };
})();