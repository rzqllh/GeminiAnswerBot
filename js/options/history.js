// === Hafizh Rizqullah | GeminiAnswerBot ===
// 🔒 Created by Hafizh Rizqullah || Refine by AI Assistant
// 📄 js/options/history.js
// 🕓 Created: 2024-05-22 10:10:00
// 🧠 Modular | DRY | SOLID | Apple HIG Compliant

const HistoryModule = (() => {
  let ELS = {};
  
  // **REFACTOR**: State variables for infinite scrolling
  let fullHistory = [];
  let currentPage = 0;
  let isLoading = false;
  const ITEMS_PER_PAGE = 15;
  const SCROLL_THRESHOLD = 100; // pixels from bottom to trigger load

  /**
   * Merender item riwayat ke dalam kartu yang terformat.
   * @param {object} item - Objek item riwayat dari storage.
   * @returns {HTMLElement} - Elemen div kartu yang sudah jadi.
   */
  function renderHistoryItem(item) {
    const card = document.createElement('div');
    card.className = 'history-card';

    const question = item.cleanedContent?.match(/Question:\s*([\s\S]*?)(?=\nOptions:|\n\n|$)/i)?.[1].trim() || 'Question not found';
    const optionsMatch = item.cleanedContent?.match(/Options:\s*([\s\S]*)/i);
    const optionsHtml = optionsMatch
      ? '<ul>' + optionsMatch[1].trim().split('\n').map(opt => `<li>${_escapeHtml(opt.replace(/^- /, '').trim())}</li>`).join('') + '</ul>'
      : '<ul><li>No options found.</li></ul>';
      
    const cleanAnswerHTML = item.answerHTML?.replace(/\[THOUGHT\][\s\S]*\[ENDTHOUGHT\]\s*/, '') || '';
    const aiAnswer = cleanAnswerHTML.match(/Answer:\s*(.*)/i)?.[1].trim() || 'N/A';
    const aiConfidence = cleanAnswerHTML.match(/Confidence:\s*(High|Medium|Low)/i)?.[1].trim() || 'N/A';
    const aiReason = cleanAnswerHTML.match(/Reason:\s*([\s\S]*)/i)?.[1].trim() || 'N/A';
    
    const formattedDate = new Date(item.timestamp).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    card.innerHTML = `
      <div class="history-card-header">
          <a href="${_escapeHtml(item.url)}" target="_blank" class="history-card-title" title="${_escapeHtml(item.title)}">${_escapeHtml(item.title) || 'Untitled Page'}</a>
          <span class="history-card-date">${formattedDate}</span>
      </div>
      <div class="history-card-body">
          <div class="history-section">
              <h4 class="history-section-title">Question Content</h4>
              <p class="history-question-text">${_escapeHtml(question)}</p>
              ${optionsHtml}
          </div>
          <div class="history-section">
              <h4 class="history-section-title">AI Response</h4>
              <p class="history-ai-response">
                  <strong>Answer:</strong> ${_escapeHtml(aiAnswer)}<br>
                  <strong>Confidence:</strong> <span class="confidence-tag confidence-${aiConfidence.toLowerCase()}">${_escapeHtml(aiConfidence)}</span><br>
                  <strong>Reason:</strong> ${_escapeHtml(aiReason)}
              </p>
          </div>
      </div>
    `;
    return card;
  }

  /**
   * **NEW**: Appends a page of history items to the DOM.
   */
  function appendHistoryItems() {
    if (isLoading) return;
    isLoading = true;

    const start = currentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const itemsToRender = fullHistory.slice(start, end);

    // Remove previous loader if it exists
    const existingLoader = ELS.historyListContainer.querySelector('.history-loader');
    if (existingLoader) existingLoader.remove();

    if (itemsToRender.length === 0) {
      isLoading = false;
      return; // No more items to load
    }

    const fragment = document.createDocumentFragment();
    itemsToRender.forEach(item => {
      try {
        fragment.appendChild(renderHistoryItem(item));
      } catch (e) {
        console.error('Failed to render history item:', item, e);
      }
    });
    ELS.historyListContainer.appendChild(fragment);
    currentPage++;

    // Add a new loader if there are more items
    if (end < fullHistory.length) {
      const loader = document.createElement('div');
      loader.className = 'history-loader';
      loader.innerHTML = '<div class="spinner"></div>';
      ELS.historyListContainer.appendChild(loader);
    }
    
    isLoading = false;
  }

  /**
   * **REFACTOR**: Initializes history loading, fetching all data once.
   */
  async function loadHistory() {
    ELS.historyListContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading history...</p></div>';
    
    const data = await StorageManager.local.get('history');
    fullHistory = data.history || [];
    currentPage = 0;
    isLoading = false;

    ELS.historyListContainer.innerHTML = ''; // Clear container

    if (fullHistory.length === 0) {
      ELS.historyListContainer.innerHTML = `
        <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            <h3>No History Yet</h3>
            <p>Your interactions with the extension will appear here.</p>
        </div>`;
      return;
    }

    appendHistoryItems(); // Load the first page
  }

  async function clearHistory() {
    const confirmed = await UIModule.showConfirm({
      title: 'Clear History',
      message: 'Are you sure you want to delete all interaction history? This action cannot be undone.',
      okLabel: 'Clear All',
      okClass: 'button-danger'
    });
    if (confirmed) {
      await StorageManager.local.remove('history');
      UIModule.showToast('Success', 'All history has been cleared.', 'success');
      loadHistory(); // Reload to show the empty state
    }
  }

  async function exportHistory() {
    const { history = [] } = await StorageManager.local.get('history');
    if (history.length === 0) {
      UIModule.showToast('No History', 'There is no history to export.', 'info');
      return;
    }
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `gemini-answer-bot-history-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    UIModule.showToast('Success', 'History has been exported!', 'success');
  }

  /**
   * **NEW**: Scroll handler for infinite loading.
   * @param {Event} e - The scroll event.
   */
  function handleScroll(e) {
    if (isLoading) return;
    
    const container = e.target;
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - SCROLL_THRESHOLD;

    if (isAtBottom && (currentPage * ITEMS_PER_PAGE < fullHistory.length)) {
      appendHistoryItems();
    }
  }

  function initialize(elements) {
    ELS = elements;
    ELS.clearHistoryButton.addEventListener('click', clearHistory);
    ELS.exportHistoryButton.addEventListener('click', exportHistory);
    document.addEventListener('historyTabActivated', loadHistory);

    // **NEW**: Attach scroll listener to the main content pane
    const contentPane = document.querySelector('.settings-content');
    if (contentPane) {
      contentPane.addEventListener('scroll', handleScroll);
    }
  }

  return {
    initialize
  };
})();