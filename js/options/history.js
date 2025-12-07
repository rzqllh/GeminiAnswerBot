// === Hafizh Rizqullah | GeminiAnswerBot ===
// 🔒 Created by Hafizh Rizqullah || Refine by AI Assistant
// 📄 js/options/history.js
// 🕓 Updated: v4.0 with PDF export and improved formatting

const HistoryModule = (() => {
  let ELS = {};
  let fullHistory = [];
  let currentPage = 0;
  let isLoading = false;
  const ITEMS_PER_PAGE = 15;
  const SCROLL_THRESHOLD = 100;

  // Clean ALL markdown from text for display
  function _cleanMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/`/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\(Option [A-Z]\)/gi, '')
      .trim();
  }

  // Parse answer fields from markdown
  function _parseAnswerFields(answerText) {
    if (!answerText) return { answer: 'N/A', confidence: 'N/A', reason: 'N/A' };

    let text = answerText.replace(/\[THOUGHT\][\s\S]*?\[ENDTHOUGHT\]\s*/gi, '').trim();

    const answerMatch = text.match(/\*?\*?Answer:?\*?\*?\s*`?([^`\n]+)`?/i);
    const rawAnswer = answerMatch ? answerMatch[1].trim() : 'N/A';
    const answer = _cleanMarkdown(rawAnswer);

    const confMatch = text.match(/\*?\*?Confidence:?\*?\*?\s*(\d+%|High|Medium|Low)/i);
    const confidence = confMatch ? confMatch[1].trim() : 'N/A';

    const reasonMatch = text.match(/\*?\*?Reason:?\*?\*?\s*([\s\S]*?)(?=\n\n|\*\*|$)/i);
    const rawReason = reasonMatch ? reasonMatch[1].trim() : 'N/A';
    const reason = _cleanMarkdown(rawReason);

    return { answer, confidence, reason };
  }

  function _getConfidenceClass(confidence) {
    if (!confidence || confidence === 'N/A') return 'medium';
    const confLower = confidence.toLowerCase();
    if (confLower.includes('high') || parseInt(confidence) >= 80) return 'high';
    if (confLower.includes('low') || parseInt(confidence) < 50) return 'low';
    return 'medium';
  }

  function renderHistoryItem(item) {
    const card = document.createElement('div');
    card.className = 'history-card';

    const rawQuestion = item.cleanedContent?.match(/Question:\s*([\s\S]*?)(?=\nOptions:|\n\n|$)/i)?.[1] || 'Question not found';
    const question = _cleanMarkdown(rawQuestion);

    const optionsMatch = item.cleanedContent?.match(/Options:\s*([\s\S]*)/i);
    let optionsHtml = '';
    if (optionsMatch) {
      const options = optionsMatch[1].trim().split('\n')
        .map(opt => _cleanMarkdown(opt.replace(/^[A-Z]\.\s*/, '').replace(/^-\s*/, '')))
        .filter(opt => opt && opt.length > 0);
      if (options.length > 0) {
        optionsHtml = '<ul>' + options.map((opt, i) =>
          `<li>${String.fromCharCode(65 + i)}. ${_escapeHtml(opt)}</li>`
        ).join('') + '</ul>';
      }
    }

    const { answer, confidence, reason } = _parseAnswerFields(item.answerHTML);
    const confClass = _getConfidenceClass(confidence);

    const formattedDate = new Date(item.timestamp).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    card.innerHTML = `
      <div class="history-card-header">
        <a href="${_escapeHtml(item.url)}" target="_blank" class="history-card-title">${_escapeHtml(item.title) || 'Untitled'}</a>
        <span class="history-card-date">${formattedDate}</span>
      </div>
      <div class="history-card-body">
        <div class="history-section">
          <h4 class="history-section-title">Question</h4>
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

  function appendHistoryItems() {
    if (isLoading) return;
    isLoading = true;

    const start = currentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const items = fullHistory.slice(start, end);

    const loader = ELS.historyListContainer.querySelector('.history-loader');
    if (loader) loader.remove();

    if (items.length === 0) { isLoading = false; return; }

    const fragment = document.createDocumentFragment();
    items.forEach(item => {
      try { fragment.appendChild(renderHistoryItem(item)); }
      catch (e) { console.error('Render failed:', e); }
    });
    ELS.historyListContainer.appendChild(fragment);
    currentPage++;

    if (end < fullHistory.length) {
      const newLoader = document.createElement('div');
      newLoader.className = 'history-loader';
      newLoader.innerHTML = '<div class="spinner"></div>';
      ELS.historyListContainer.appendChild(newLoader);
    }
    isLoading = false;
  }

  async function loadHistory() {
    ELS.historyListContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';
    const data = await StorageManager.local.get('history');
    fullHistory = data.history || [];
    currentPage = 0;
    isLoading = false;
    ELS.historyListContainer.innerHTML = '';

    if (fullHistory.length === 0) {
      ELS.historyListContainer.innerHTML = '<div class="empty-state"><h3>No History Yet</h3><p>Your interactions will appear here.</p></div>';
      return;
    }
    appendHistoryItems();
  }

  async function clearHistory() {
    const confirmed = await UIModule.showConfirm({ title: 'Clear History', message: 'Delete all history?', okLabel: 'Clear All', okClass: 'button-danger' });
    if (confirmed) {
      await StorageManager.local.remove('history');
      UIModule.showToast('Success', 'History cleared.', 'success');
      loadHistory();
    }
  }

  async function exportHistory() {
    const { history = [] } = await StorageManager.local.get('history');
    if (history.length === 0) { UIModule.showToast('No History', 'Nothing to export.', 'info'); return; }
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    UIModule.showToast('Success', 'Exported!', 'success');
  }

  async function exportHistoryAsPDF() {
    const { history = [] } = await StorageManager.local.get('history');
    if (history.length === 0) { UIModule.showToast('No History', 'Nothing to export.', 'info'); return; }

    let htmlContent = `<!DOCTYPE html><html><head><title>GeminiAnswerBot History</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 10px; }
        .qa-item { margin-bottom: 24px; padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px; page-break-inside: avoid; }
        .qa-header { display: flex; justify-content: space-between; color: #666; font-size: 12px; margin-bottom: 8px; }
        .qa-question { font-weight: 600; margin-bottom: 8px; }
        .qa-options { margin: 8px 0; padding-left: 20px; }
        .qa-answer { background: #f5f5f5; padding: 12px; border-radius: 6px; }
        .confidence-high { color: #22c55e; font-weight: bold; }
        .confidence-medium { color: #f59e0b; font-weight: bold; }
        .confidence-low { color: #ef4444; font-weight: bold; }
      </style></head><body>
      <h1>📝 GeminiAnswerBot History</h1>
      <p>Exported: ${new Date().toLocaleString()} | Total: ${history.length} questions</p>`;

    history.forEach((item, i) => {
      const { answer, confidence, reason } = _parseAnswerFields(item.answerHTML);
      const confClass = _getConfidenceClass(confidence);
      const question = _cleanMarkdown(item.cleanedContent?.match(/Question:\s*([\s\S]*?)(?=\nOptions:|$)/i)?.[1] || 'N/A');

      htmlContent += `<div class="qa-item">
        <div class="qa-header"><span>#${i + 1}</span><span>${new Date(item.timestamp).toLocaleString()}</span></div>
        <div class="qa-question">${_escapeHtml(question)}</div>
        <div class="qa-answer">
          <strong>Answer:</strong> ${_escapeHtml(answer)}<br>
          <strong>Confidence:</strong> <span class="confidence-${confClass}">${confidence}</span><br>
          <strong>Reason:</strong> ${_escapeHtml(reason)}
        </div></div>`;
    });

    htmlContent += '</body></html>';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
    UIModule.showToast('PDF Export', 'Print dialog opened. Save as PDF.', 'success');
  }

  function handleScroll(e) {
    if (isLoading) return;
    const c = e.target;
    if (c.scrollTop + c.clientHeight >= c.scrollHeight - SCROLL_THRESHOLD && currentPage * ITEMS_PER_PAGE < fullHistory.length) {
      appendHistoryItems();
    }
  }

  function initialize(elements) {
    ELS = elements;
    ELS.clearHistoryButton?.addEventListener('click', clearHistory);
    ELS.exportHistoryButton?.addEventListener('click', exportHistory);

    const pdfBtn = document.getElementById('exportHistoryPDFButton');
    if (pdfBtn) pdfBtn.addEventListener('click', exportHistoryAsPDF);

    document.addEventListener('historyTabActivated', loadHistory);
    document.querySelector('.settings-content')?.addEventListener('scroll', handleScroll);
  }

  return { initialize, exportHistoryAsPDF };
})();