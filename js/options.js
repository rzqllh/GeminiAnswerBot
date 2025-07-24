// js/options.js

document.addEventListener('DOMContentLoaded', function () {
  let activeToast = null;
  const notificationContainer = document.getElementById('notification-container');

  function showToast(title, message, type = 'info') {
    if (activeToast) {
      activeToast.remove();
    }
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    const icon = {
      success:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      error:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
      info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    };
    toast.innerHTML = `
          <div class="toast-icon toast-icon-${type}">${icon[type] || icon.info}</div>
          <div class="toast-text-content">
            <strong>${title}</strong>
            <div class="toast-message">${message}</div>
          </div>
        `;
    notificationContainer.appendChild(toast);
    activeToast = toast;
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
        if (activeToast === toast) {
          activeToast = null;
        }
      }, 500);
    }, 4000);
  }

  const historyListContainer = document.getElementById('history-list-container');
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatQuestionContent(content) {
    if (!content) return '';
    const lines = content.split('\n').filter((line) => line.trim() !== '');
    if (lines.length === 0) return '';
    const question = escapeHtml(lines.shift().replace(/^Question:\s*/i, ''));
    const optionsHtml = lines
      .map((option) => {
        const cleanedOption = option.trim().replace(/^[\*\-]\s*Options:\s*|^\s*[\*\-]\s*/, '');
        return `<li>${escapeHtml(cleanedOption)}</li>`;
      })
      .join('');
    return `<p class="history-question">${question}</p><ul class="history-options">${optionsHtml}</ul>`;
  }

  async function loadHistory() {
    if (!historyListContainer) return;
    historyListContainer.innerHTML = `<div class="loading-message">Loading history...</div>`;
    const { history = [] } = await chrome.storage.local.get('history');
    if (history.length === 0) {
      historyListContainer.innerHTML = `<div class="empty-state">No history found.</div>`;
      return;
    }
    historyListContainer.innerHTML = '';
    history.forEach((item) => {
      const itemElement = document.createElement('div');
      itemElement.className = 'card';
      const formattedDate = new Date(item.timestamp).toLocaleString();
      const actionLabel = item.actionType.charAt(0).toUpperCase() + item.actionType.slice(1);

      const contentDisplay = item.cleanedContent
        ? `
                <div class="history-item-content">
                    <h3>Question Content</h3>
                    <div class="answer-block">${formatQuestionContent(item.cleanedContent)}</div>
                </div>
            `
        : '';

      itemElement.innerHTML = `
                <div class="history-item-header">
                    <div class="history-item-title"><a href="${item.url}" target="_blank" title="${item.title}">${item.title}</a></div>
                    <div class="history-item-meta">${actionLabel} &bull; ${formattedDate}</div>
                </div>
                ${contentDisplay}
                <div class="history-item-content">
                    <h3>AI Response</h3>
                    <div class="answer-block">${item.answerHTML || 'No response captured.'}</div>
                </div>
            `;
      historyListContainer.appendChild(itemElement);
    });
  }

  const navLinks = document.querySelectorAll('.settings-sidebar a');
  const contentPanes = document.querySelectorAll('.content-pane');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      navLinks.forEach((navLink) => navLink.classList.remove('active'));
      link.classList.add('active');
      contentPanes.forEach((pane) => pane.classList.toggle('active', pane.id === targetId));
      if (targetId === 'history') {
        loadHistory();
      }
    });
  });

  // --- Element Selectors ---
  const saveGeneralButton = document.getElementById('saveGeneralButton');
  const savePromptsButton = document.getElementById('savePromptsButton');
  const testButton = document.getElementById('testButton');
  const apiKeyInput = document.getElementById('apiKey');
  const revealApiKey = document.getElementById('revealApiKey');
  const modelSelect = document.getElementById('modelSelect');
  const autoHighlightToggle = document.getElementById('autoHighlightToggle');
  const temperatureSlider = document.getElementById('temperatureSlider');
  const clearHistoryButton = document.getElementById('clearHistoryButton');
  const exportHistoryButton = document.getElementById('exportHistoryButton');

  const cleaningPromptTextarea = document.getElementById('cleaningPrompt');
  const summarizePromptTextarea = document.getElementById('summarizePrompt');
  const rephrasePromptTextarea = document.getElementById('rephrasePrompt');
  const rephraseLanguagesInput = document.getElementById('rephraseLanguages');

  // --- Load Initial Settings ---
  chrome.storage.sync.get(
    [
      'geminiApiKey',
      'selectedModel',
      'autoHighlight',
      'customPrompts',
      'temperature',
      'rephraseLanguages',
    ],
    (result) => {
      if (apiKeyInput) apiKeyInput.value = result.geminiApiKey || '';
      if (modelSelect) modelSelect.value = result.selectedModel || 'gemini-1.5-flash-latest';
      if (autoHighlightToggle) autoHighlightToggle.checked = result.autoHighlight || false;
      if (rephraseLanguagesInput)
        rephraseLanguagesInput.value = result.rephraseLanguages || 'English, Indonesian';
      if (temperatureSlider) {
        temperatureSlider.value = result.temperature !== undefined ? result.temperature : 0.4;
      }

      const prompts = result.customPrompts || {};
      if (cleaningPromptTextarea) cleaningPromptTextarea.placeholder = DEFAULT_PROMPTS.cleaning;
      if (summarizePromptTextarea) summarizePromptTextarea.placeholder = DEFAULT_PROMPTS.summarize;
      if (rephrasePromptTextarea) rephrasePromptTextarea.placeholder = DEFAULT_PROMPTS.rephrase;

      if (cleaningPromptTextarea) cleaningPromptTextarea.value = prompts.cleaning || '';
      if (summarizePromptTextarea) summarizePromptTextarea.value = prompts.summarize || '';
      if (rephrasePromptTextarea) rephrasePromptTextarea.value = prompts.rephrase || '';
    }
  );

  // --- Event Listeners ---
  if (revealApiKey) {
    revealApiKey.addEventListener('click', function () {
      const isPassword = apiKeyInput.type === 'password';
      apiKeyInput.type = isPassword ? 'text' : 'password';
      revealApiKey.querySelector('.icon-eye').classList.toggle('hidden', isPassword);
      revealApiKey.querySelector('.icon-eye-slash').classList.toggle('hidden', !isPassword);
    });
  }

  if (saveGeneralButton) {
    saveGeneralButton.addEventListener('click', function () {
      const settingsToSave = {
        geminiApiKey: apiKeyInput.value.trim(),
        selectedModel: modelSelect.value,
        autoHighlight: autoHighlightToggle.checked,
        temperature: parseFloat(temperatureSlider.value),
      };
      chrome.storage.sync.set(settingsToSave, () => {
        showToast('Success', 'General settings have been saved!', 'success');
      });
    });
  }

  if (savePromptsButton) {
    savePromptsButton.addEventListener('click', function () {
      const customPrompts = {
        cleaning: cleaningPromptTextarea.value.trim(),
        summarize: summarizePromptTextarea.value.trim(),
        rephrase: rephrasePromptTextarea.value.trim(),
      };
      const rephraseLanguages = rephraseLanguagesInput.value.trim();
      chrome.storage.sync.set(
        { customPrompts: customPrompts, rephraseLanguages: rephraseLanguages },
        () => {
          showToast('Success', 'Custom prompts have been saved!', 'success');
        }
      );
    });
  }

  if (testButton) {
    testButton.addEventListener('click', function () {
      const apiKey = apiKeyInput.value.trim();
      if (!apiKey) {
        showToast('API Key Missing', 'Please enter an API key to test.', 'error');
        return;
      }
      showToast('Testing', 'Testing connection, please wait...', 'info');
      testButton.disabled = true;
      chrome.runtime.sendMessage(
        { action: 'testApiConnection', payload: { apiKey } },
        (response) => {
          testButton.disabled = false;
          if (chrome.runtime.lastError) {
            showToast('Connection Error', `Error: ${chrome.runtime.lastError.message}`, 'error');
            return;
          }
          if (response && response.success) {
            showToast('Connection Successful', response.text, 'success');
          } else {
            showToast('Connection Failed', response.error || 'An unknown error occurred.', 'error');
          }
        }
      );
    });
  }

  if (clearHistoryButton) {
    clearHistoryButton.addEventListener('click', function () {
      if (confirm('Are you sure you want to delete all history? This action cannot be undone.')) {
        chrome.storage.local.remove('history', () => {
          showToast('Success', 'All history has been cleared.', 'success');
          loadHistory();
        });
      }
    });
  }

  if (exportHistoryButton) {
    exportHistoryButton.addEventListener('click', async function () {
      const { history = [] } = await chrome.storage.local.get('history');
      if (history.length === 0) {
        showToast('No History', 'There is no history to export.', 'info');
        return;
      }
      const dataStr = JSON.stringify(history, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `gemini-answer-bot-history-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
      showToast('Success', 'History has been exported!', 'success');
    });
  }
});
