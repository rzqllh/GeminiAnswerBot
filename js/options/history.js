// === Hafizh Rizqullah | GeminiAnswerBot ===
// 🔒 Created by Hafizh Rizqullah || Refine by AI Assistant
// 📄 js/options/history.js
// 🕓 Updated: v4.0 with PDF export and fixed markdown parsing

const HistoryModule = (() => {
  let ELS = {};

  // State variables for infinite scrolling
  let fullHistory = [];
  let currentPage = 0;
  let isLoading = false;
  const ITEMS_PER_PAGE = 15;
  const SCROLL_THRESHOLD = 100;

  /**
   * Parse answer text - handles markdown format with ** markers
   */
  function _parseAnswerFields(answerText) {
    if (!answerText) return { answer: 'N/A', confidence: 'N/A', reason: 'N/A' };

    // Remove [THOUGHT] blocks and clean
    let text = answerText.replace(/\[THOUGHT\][\s\S]*?\[ENDTHOUGHT\]\s*/gi, '').trim();

    // Parse Answer - handles **Answer:** or Answer:
    const answerMatch = text.match(/\*?\*?Answer:?\*?\*?\s*`?([^`\n]+)`?\s*(?:\([^)]+\))?/i);
    const answer = answerMatch ? answerMatch[1].trim() : 'N/A';

    // Parse Confidence - handles **Confidence:** or Confidence:
    const confMatch = text.match(/\*?\*?Confidence:?\*?\*?\s*(\d+%|High|Medium|Low)/i);
    const confidence = confMatch ? confMatch[1].trim() : 'N/A';

    // Parse Reason - handles **Reason:** or Reason:
    const reasonMatch = text.match(/\*?\*?Reason:?\*?\*?\s*([\s\S]*?)(?=\n\n|\*\*|$)/i);
    const reason = reasonMatch ? reasonMatch[1].trim() : 'N/A';

    return { answer, confidence, reason };
  }

  /**
   * Get confidence CSS class
   */
  function _getConfidenceClass(confidence) {
    if (!confidence || confidence === 'N/A') return 'medium';
    const confLower = confidence.toLowerCase();
    if (confLower.includes('high') || parseInt(confidence) >= 80) return 'high';
    if (confLower.includes('low') || parseInt(confidence) < 50) return 'low';
    return 'medium';
  }

  /**
   * Render history item card
   */
  function renderHistoryItem(item) {
    const card = document.createElement('div');
    card.className = 'history-card';

    const question = item.cleanedContent?.match(/Question:\s*([\s\S]*?)(?=\nOptions:|\n\n|$)/i)?.[1].trim() || 'Question not found';
    const optionsMatch = item.cleanedContent?.match(/Options:\s*([\s\S]*)/i);
    const optionsHtml = optionsMatch
      ? '<ul>' + optionsMatch[1].trim().split('\n').map(opt => `<li>${_escapeHtml(opt.replace(/^- /, '').trim())}</li>`).join('') + '</ul>'
      : '<ul><li>No options found.</li></ul>';

    const { answer, confidence, reason } = _parseAnswerFields(item.answerHTML);
    const confClass = _getConfidenceClass(confidence);

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
                  <strong>Answer:</strong> ${_escapeHtml(answer)}<br>
                  <strong>Confidence:</strong> <span class="confidence-tag confidence-${confClass}">${_escapeHtml(confidence)}</span><br>
                  <strong>Reason:</strong> ${_escapeHtml(reason)}
              </p>
          </div>
      </div>
    `;
    return card;
  }

  /**
   * Appends a page of history items to the DOM.
   */
  function appendHistoryItems() {
    if (isLoading) return;
    isLoading = true;

    const start = currentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const itemsToRender = fullHistory.slice(start, end);

    const existingLoader = ELS.historyListContainer.querySelector('.history-loader');
    if (existingLoader) existingLoader.remove();

    if (itemsToRender.length === 0) {
      isLoading = false;
      return;
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

    if (end < fullHistory.length) {
      const loader = document.createElement('div');
      loader.className = 'history-loader';
      loader.innerHTML = '<div class="spinner"></div>';
      ELS.historyListContainer.appendChild(loader);
    }

    isLoading = false;
  }

  /**
   * Initializes history loading.
   */
  async function loadHistory() {
    ELS.historyListContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading history...</p></div>';

    const data = await StorageManager.local.get('history');
    fullHistory = data.history || [];
    currentPage = 0;
    isLoading = false;

    ELS.historyListContainer.innerHTML = '';

    if (fullHistory.length === 0) {
      ELS.historyListContainer.innerHTML = `
        <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            <h3>No History Yet</h3>
            <p>Your interactions with the extension will appear here.</p>
        </div>`;
      return;
    }

    appendHistoryItems();
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
      loadHistory();
    }
  }

  async function exportHistory() {
    const { history = [] } = await StorageManager.local.get('history');
    if (history.length === 0) {
      UIModule.showToast('No History', 'There is no history to export.', 'info');
      return;
    }
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `gemini-answer-bot-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    UIModule.showToast('Success', 'History has been exported!', 'success');
  }

  /**
   * v4.0: Export history as PDF using browser print dialog
   */
  async function exportHistoryAsPDF() {
    const { history = [] } = await StorageManager.local.get('history');
    if (history.length === 0) {
      UIModule.showToast('No History', 'There is no history to export.', 'info');
      return;
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GeminiAnswerBot - Q&A History</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 10px; }
          .qa-item { margin-bottom: 30px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; page-break-inside: avoid; }
          .qa-header { display: flex; justify-content: space-between; margin-bottom: 10px; color: #666; font-size: 12px; }
          .qa-question { font-weight: 600; margin-bottom: 10px; }
          .qa-options { margin: 10px 0; padding-left: 20px; }
          .qa-answer { background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 10px; }
          .qa-answer strong { color: #1a73e8; }
          .confidence-high { color: #22c55e; font-weight: bold; }
          .confidence-medium { color: #f59e0b; font-weight: bold; }
          .confidence-low { color: #ef4444; font-weight: bold; }
          @media print { body { padding: 0; } .qa-item { border-color: #000; } }
        </style>
      </head>
      <body>
        <h1>📝 GeminiAnswerBot - Q&A History</h1>
        <p>Exported on ${new Date().toLocaleString()} | Total: ${history.length} questions</p>
    `;

    history.forEach((item, index) => {
      const question = item.cleanedContent?.match(/Question:\s*([\s\S]*?)(?=\nOptions:|\n\n|$)/i)?.[1].trim() || 'Question not found';
      const optionsMatch = item.cleanedContent?.match(/Options:\s*([\s\S]*)/i);
      const options = optionsMatch ? optionsMatch[1].trim().split('\n').filter(o => o.trim()) : [];

      const { answer, confidence, reason } = _parseAnswerFields(item.answerHTML);
      const confClass = _getConfidenceClass(confidence);
      const date = new Date(item.timestamp).toLocaleString();

      htmlContent += `
        <div class="qa-item">
          <div class="qa-header">
            <span>#${index + 1}</span>
            <span>${date}</span>
          </div>
          <div class="qa-question">${_escapeHtml(question)}</div>
          <ul class="qa-options">
            ${options.map(o => `<li>${_escapeHtml(o.replace(/^- /, '').trim())}</li>`).join('')}
          </ul>
          <div class="qa-answer">
            <strong>Answer:</strong> ${_escapeHtml(answer)}<br>
            <strong>Confidence:</strong> <span class="confidence-${confClass}">${_escapeHtml(confidence)}</span><br>
            <strong>Reason:</strong> ${_escapeHtml(reason)}
          </div>
        </div>
      `;
    });

    htmlContent += '</body></html>';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };

    UIModule.showToast('PDF Export', 'Print dialog opened. Choose "Save as PDF" to save.', 'success');
  }

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

    // v4.0: PDF export button (if exists)
    const pdfExportBtn = document.getElementById('exportHistoryPDFButton');
    if (pdfExportBtn) {
      pdfExportBtn.addEventListener('click', exportHistoryAsPDF);
    }

    document.addEventListener('historyTabActivated', loadHistory);

    const contentPane = document.querySelector('.settings-content');
    if (contentPane) {
      contentPane.addEventListener('scroll', handleScroll);
    }
  }

  return {
    initialize,
    exportHistoryAsPDF
  };
})();