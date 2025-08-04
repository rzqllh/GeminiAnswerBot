// === Hafizh Rizqullah | GeminiAnswerBot ===
// 🔒 Created by Hafizh Rizqullah || Refine by AI Assistant
// 📄 js/options/ui.js
// 🕓 Created: 2024-05-22 10:00:00
// 🧠 Modular | DRY | SOLID | Apple HIG Compliant

const UIModule = (() => {
  let activeToast = null;

  const ELS = {
    notificationContainer: document.getElementById('notification-container'),
    confirmOverlay: document.getElementById('custom-confirm-overlay'),
    confirmTitle: document.getElementById('custom-confirm-title'),
    confirmMessage: document.getElementById('custom-confirm-message'),
    confirmOk: document.getElementById('custom-confirm-ok'),
    confirmCancel: document.getElementById('custom-confirm-cancel'),
  };

  /**
   * Menampilkan notifikasi toast di sudut kanan atas.
   * @param {string} title - Judul toast.
   * @param {string} message - Pesan toast.
   * @param {string} type - Jenis toast ('success', 'error', 'info').
   */
  function showToast(title, message, type = 'info') {
    if (activeToast) activeToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    const iconMap = {
      success: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      error: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
      info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };

    toast.innerHTML = `
      <div class="toast-icon toast-icon-${type}">${iconMap[type] || iconMap.info}</div>
      <div class="toast-text-content">
        <strong>${_escapeHtml(title)}</strong>
        <div class="toast-message">${_escapeHtml(message)}</div>
      </div>
    `;

    ELS.notificationContainer.appendChild(toast);
    activeToast = toast;

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => {
        if(toast.parentElement) toast.remove();
        if (activeToast === toast) activeToast = null;
      }, { once: true });
    }, 4000);
  }

  /**
   * Menampilkan dialog konfirmasi modal.
   * @param {object} config - Konfigurasi untuk dialog.
   * @param {string} config.title - Judul dialog.
   * @param {string} config.message - Pesan dialog.
   * @param {string} [config.okLabel='OK'] - Label tombol konfirmasi.
   * @param {string} [config.okClass='button-primary'] - Kelas CSS untuk tombol konfirmasi.
   * @returns {Promise<boolean>} - Promise yang resolve ke true jika dikonfirmasi, false jika dibatalkan.
   */
  function showConfirm({ title, message, okLabel = 'OK', okClass = 'button-primary' }) {
    return new Promise(resolve => {
        ELS.confirmTitle.textContent = title;
        ELS.confirmMessage.textContent = message;
        ELS.confirmOk.textContent = okLabel;
        ELS.confirmOk.className = `button ${okClass}`;
        ELS.confirmOverlay.classList.remove('hidden');
        setTimeout(() => ELS.confirmOverlay.classList.add('show'), 10);

        const close = (value) => {
            ELS.confirmOverlay.classList.remove('show');
            ELS.confirmOverlay.addEventListener('transitionend', () => {
                ELS.confirmOverlay.classList.add('hidden');
                ELS.confirmOk.onclick = null;
                ELS.confirmCancel.onclick = null;
                resolve(value);
            }, { once: true });
        };

        ELS.confirmOk.onclick = () => close(true);
        ELS.confirmCancel.onclick = () => close(false);
    });
  }

  return {
    showToast,
    showConfirm,
  };
})();