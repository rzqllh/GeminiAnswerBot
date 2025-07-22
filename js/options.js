// js/options.js
document.addEventListener('DOMContentLoaded', function() {
  
  function showToast(title, message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (container.firstChild) {
      container.firstChild.remove();
    }
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    const icon = {
      success: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      error: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
      info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };
    toast.innerHTML = `
      <div class="toast-icon toast-icon-${type}">${icon[type] || icon.info}</div>
      <div class="toast-text-content">
        <strong>${title}</strong>
        <div class="toast-message">${message}</div>
      </div>
    `;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { toast.remove(); }, 500);
    }, 4000);
  }

  const historyListContainer = document.getElementById('history-list-container');

  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function formatQuestionContent(content) {
    if (!content) return '';
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return '';
    const question = escapeHtml(lines.shift().replace(/^Question:\s*/i, ''));
    const optionsHtml = lines.map(option => {
        const cleanedOption = option.trim().replace(/^[\*\-]\s*Options:\s*|^\s*[\*\-]\s*/, '');
        return `<li>${escapeHtml(cleanedOption)}</li>`;
    }).join('');
    return `
      <p class="history-question">${question}</p>
      <ul class="history-options">${optionsHtml}</ul>
    `;
  }

  async function loadHistory() {
    historyListContainer.innerHTML = `<div class="loading-message">Loading history...</div>`;
    const { history = [] } = await chrome.storage.local.get('history');
    if (history.length === 0) {
      historyListContainer.innerHTML = `<div class="empty-state">No history found.</div>`;
      return;
    }
    historyListContainer.innerHTML = '';
    history.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'history-item';
      const formattedDate = new Date(item.timestamp).toLocaleString();
      const actionLabel = item.actionType.charAt(0).toUpperCase() + item.actionType.slice(1);
      const contentSource = item.actionType === 'quiz' ? 'Question Content' : 'Selected Text';
      const contentDisplay = item.cleanedContent ? `
        <h3>${contentSource}</h3>
        <div class="answer-block">
            ${formatQuestionContent(item.cleanedContent)}
        </div>
      ` : '';
      const responseTitle = item.explanationHTML ? 'AI Answer' : 'AI Response';
      itemElement.innerHTML = `
        <div class="history-item-header">
          <div class="history-item-title">
            <a href="${item.url}" target="_blank" title="${item.title}">${item.title}</a>
          </div>
          <div class="history-item-meta">${actionLabel} &bull; ${formattedDate}</div>
        </div>
        <div class="history-item-content">
          ${contentDisplay}
          <h3>${responseTitle}</h3>
          <div class="answer-block">${item.answerHTML}</div>
          ${item.explanationHTML ? `
            <h3>Explanation</h3>
            <div class="answer-block">${item.explanationHTML}</div>
          ` : ''}
        </div>
      `;
      historyListContainer.appendChild(itemElement);
    });
  }

  const navLinks = document.querySelectorAll('.settings-sidebar a');
  const contentPanes = document.querySelectorAll('.content-pane');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      navLinks.forEach(navLink => navLink.classList.remove('active'));
      link.classList.add('active');
      contentPanes.forEach(pane => pane.classList.toggle('active', pane.id === targetId));
      if (targetId === 'history') {
        loadHistory();
      }
    });
  });

  const saveGeneralButton = document.getElementById('saveGeneralButton');
  const savePromptsButton = document.getElementById('savePromptsButton');
  const testButton = document.getElementById('testButton');
  const apiKeyInput = document.getElementById('apiKey');
  const revealApiKey = document.getElementById('revealApiKey');
  const modelSelect = document.getElementById('modelSelect');
  const responseToneSelect = document.getElementById('responseToneSelect'); 
  const autoHighlightToggle = document.getElementById('autoHighlightToggle');
  const temperatureSlider = document.getElementById('temperatureSlider');
  const temperatureValueSpan = document.getElementById('temperatureValue');
  const clearHistoryButton = document.getElementById('clearHistoryButton');
  const cleaningPromptTextarea = document.getElementById('cleaningPrompt');
  const answerPromptTextarea = document.getElementById('answerPrompt');
  const explanationPromptTextarea = document.getElementById('explanationPrompt');
  const summarizePromptTextarea = document.getElementById('summarizePrompt');
  const translatePromptTextarea = document.getElementById('translatePrompt');
  const rephrasePromptTextarea = document.getElementById('rephrasePrompt');
  const rephraseLanguagesInput = document.getElementById('rephraseLanguages');

  chrome.storage.sync.get([
    'geminiApiKey', 'selectedModel', 'responseTone', 'autoHighlight', 
    'customPrompts', 'temperature', 'rephraseLanguages'
  ], (result) => {
    apiKeyInput.value = result.geminiApiKey || '';
    modelSelect.value = result.selectedModel || 'gemini-1.5-flash-latest';
    responseToneSelect.value = result.responseTone || 'normal'; 
    autoHighlightToggle.checked = result.autoHighlight || false;
    rephraseLanguagesInput.value = result.rephraseLanguages || 'English, Indonesian';
    const temperature = result.temperature !== undefined ? result.temperature : 0.4;
    temperatureSlider.value = temperature;
    temperatureValueSpan.textContent = parseFloat(temperature).toFixed(1);
    const prompts = result.customPrompts || {};
    cleaningPromptTextarea.placeholder = DEFAULT_PROMPTS.cleaning;
    answerPromptTextarea.placeholder = DEFAULT_PROMPTS.answer;
    explanationPromptTextarea.placeholder = DEFAULT_PROMPTS.explanation;
    summarizePromptTextarea.placeholder = DEFAULT_PROMPTS.summarize; 
    translatePromptTextarea.placeholder = DEFAULT_PROMPTS.translate;
    rephrasePromptTextarea.placeholder = DEFAULT_PROMPTS.rephrase;
    cleaningPromptTextarea.value = prompts.cleaning || '';
    answerPromptTextarea.value = prompts.answer || '';
    explanationPromptTextarea.value = prompts.explanation || '';
    summarizePromptTextarea.value = prompts.summarize || ''; 
    translatePromptTextarea.value = prompts.translate || '';
    rephrasePromptTextarea.value = prompts.rephrase || '';
  });

  temperatureSlider.addEventListener('input', function() {
    temperatureValueSpan.textContent = parseFloat(this.value).toFixed(1);
  });
  
  revealApiKey.addEventListener('click', function() {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    revealApiKey.querySelector('.icon-eye').classList.toggle('hidden', isPassword);
    revealApiKey.querySelector('.icon-eye-slash').classList.toggle('hidden', !isPassword);
  });

  saveGeneralButton.addEventListener('click', function() {
    const settingsToSave = {
      'geminiApiKey': apiKeyInput.value.trim(),
      'selectedModel': modelSelect.value,
      'responseTone': responseToneSelect.value,
      'autoHighlight': autoHighlightToggle.checked,
      'temperature': parseFloat(temperatureSlider.value)
    };
    chrome.storage.sync.set(settingsToSave, () => {
      showToast('Success', 'General settings have been saved!', 'success');
    });
  });

  savePromptsButton.addEventListener('click', function() {
    const customPrompts = {
      cleaning: cleaningPromptTextarea.value.trim(),
      answer: answerPromptTextarea.value.trim(),
      explanation: explanationPromptTextarea.value.trim(),
      summarize: summarizePromptTextarea.value.trim(), 
      translate: translatePromptTextarea.value.trim(),
      rephrase: rephrasePromptTextarea.value.trim()
    };
    const rephraseLanguages = rephraseLanguagesInput.value.trim();
    chrome.storage.sync.set({ 
      'customPrompts': customPrompts,
      'rephraseLanguages': rephraseLanguages
    }, () => {
      showToast('Success', 'Custom prompts have been saved!', 'success');
    });
  });

  testButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showToast('API Key Missing', 'Please enter an API key to test.', 'error');
      return;
    }
    showToast('Testing', 'Testing connection, please wait...', 'info');
    testButton.disabled = true;
    chrome.runtime.sendMessage({ action: 'testApiConnection', payload: { apiKey } }, (response) => {
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
    });
  });

  clearHistoryButton.addEventListener('click', function() {
    if (confirm('Are you sure you want to delete all history? This action cannot be undone.')) {
        chrome.storage.local.remove('history', () => {
            showToast('Success', 'All history has been cleared.', 'success');
            loadHistory();
        });
    }
  });
});