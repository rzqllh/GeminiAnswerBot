// js/popup.js
document.addEventListener('DOMContentLoaded', async function () {
  const container = document.querySelector('.container');
  const settingsButton = document.getElementById('settingsButton');
  const rescanButton = document.getElementById('rescanButton');
  const explanationButton = document.getElementById('explanationButton');
  const aiActionsWrapper = document.getElementById('aiActionsWrapper');
  const contentDisplayWrapper = document.getElementById('contentDisplayWrapper');
  const contentDisplay = document.getElementById('contentDisplay');
  const answerContainer = document.getElementById('answerContainer');
  const answerDisplay = document.getElementById('answerDisplay');
  const explanationContainer = document.getElementById('explanationContainer');
  const explanationDisplay = document.getElementById('explanationDisplay');
  const messageArea = document.getElementById('messageArea');
  const resultsWrapper = document.getElementById('resultsWrapper');
  const retryAnswerButton = document.getElementById('retryAnswer');
  const retryExplanationButton = document.getElementById('retryExplanation');
  const copyAnswerButton = document.getElementById('copyAnswer');
  const copyExplanationButton = document.getElementById('copyExplanation');

  let currentTab = null;
  let appConfig = {};

  function show(el) {
    if (el) el.classList.remove('hidden');
  }
  function hide(el) {
    if (el) el.classList.add('hidden');
  }
  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function displayMessage(htmlContent, isError = false) {
    hide(resultsWrapper);
    messageArea.innerHTML = isError
      ? `<div class="error-message">${htmlContent}</div>`
      : htmlContent;
    show(messageArea);
  }

  function formatQuestionContent(content) {
    if (!content) return '';
    let question = '';
    let options = [];

    const optionMarkers = ['\n- ', '\n* ', '\n• ', '\n1. ', '\na) ', '\nA. '];
    let splitIndex = -1;
    for (const marker of optionMarkers) {
      const index = content.indexOf(marker);
      if (index !== -1 && (splitIndex === -1 || index < splitIndex)) {
        splitIndex = index;
      }
    }

    if (splitIndex !== -1) {
      question = content.substring(0, splitIndex).trim();
      const optionsString = content.substring(splitIndex).trim();
      options = optionsString
        .split('\n')
        .map((opt) => opt.trim().replace(/^[\*\-•]\s*|\d+\.\s*|[a-zA-Z]\)\s*/, ''))
        .filter((opt) => opt);
    } else if (content.includes('*')) {
      const parts = content
        .split('*')
        .map((p) => p.trim())
        .filter((p) => p);
      question = parts.shift() || '';
      options = parts;
    } else {
      const lines = content.split('\n').filter((line) => line.trim() !== '');
      question = lines.shift() || '';
      options = lines;
    }

    question = escapeHtml(question.replace(/^Question:\s*/i, '').trim());
    const optionsHtml = options.map((option) => `<li>${escapeHtml(option.trim())}</li>`).join('');
    return `<div class="question-text">${question}</div><ul>${optionsHtml}</ul>`;
  }

  function _handleCleaningResult(fullText) {
    contentDisplay.innerHTML = formatQuestionContent(fullText);
    show(contentDisplayWrapper);
    show(answerContainer);
    answerDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div></div>`;
    saveState({ cleanedContent: fullText }).then(getAnswer);
  }

  function _handleAnswerResult(fullText) {
    const answerMatch = fullText.match(/Answer:(.*?)(Confidence:|Reason:|$)/is);
    const confidenceMatch = fullText.match(/Confidence:\s*(High|Medium|Low)/i);
    const reasonMatch = fullText.match(/Reason:(.*)/is);

    const answerText = answerMatch ? answerMatch[1].trim() : fullText.trim();
    let formattedHtml = `<p class="answer-highlight">${escapeHtml(answerText).replace(/\n/g, '<br>')}</p>`;

    if (confidenceMatch) {
      const confidence = confidenceMatch[1].toLowerCase();
      const reason = reasonMatch ? reasonMatch[1].trim() : '';
      formattedHtml += `
                <div class="confidence-wrapper">
                    <div class="confidence-level">
                        <span class="confidence-level-label">Confidence</span> 
                        <span class="confidence-badge confidence-${confidence}">${confidence.charAt(0).toUpperCase() + confidence.slice(1)}</span>
                    </div>
                    ${reason ? `<div class="confidence-reason">${escapeHtml(reason)}</div>` : ''}
                </div>`;
    }

    answerDisplay.innerHTML = formattedHtml;
    copyAnswerButton.dataset.copyText = answerText;
    retryAnswerButton.disabled = false;
    show(aiActionsWrapper);
    hide(explanationContainer);

    if (appConfig.autoHighlight) {
      chrome.tabs.sendMessage(currentTab.id, { action: 'highlight-answer', text: [answerText] });
    }

    saveState({ answerHTML: fullText }).then((state) => saveToHistory(state, 'quiz'));
  }

  function _handleExplanationResult(fullText) {
    explanationDisplay.innerHTML = escapeHtml(fullText).replace(/\n/g, '<br>');
    copyExplanationButton.dataset.copyText = fullText;
    explanationButton.disabled = false;
    retryExplanationButton.disabled = false;
    show(explanationContainer);
    saveState({ explanationHTML: fullText }).then((state) => saveToHistory(state, 'explanation'));
  }

  function _handleContextMenuResult(fullText, originalUserContent, purpose) {
    show(contentDisplayWrapper);
    show(answerContainer);
    contentDisplay.innerHTML = `<div class="question-text">${escapeHtml(originalUserContent)}</div>`;
    answerDisplay.innerHTML = `<p class="answer-highlight">${escapeHtml(fullText).replace(/\n/g, '<br>')}</p>`;
    copyAnswerButton.dataset.copyText = fullText;
    hide(aiActionsWrapper);
    hide(explanationContainer);
    saveToHistory(
      { cleanedContent: originalUserContent, answerHTML: fullText },
      purpose.replace('_action', '')
    );
  }

  function callGeminiStream(prompt, contentText, purpose, originalUserContent = '') {
    const generationConfig = {
      temperature: appConfig.temperature !== undefined ? appConfig.temperature : 0.4,
    };
    chrome.runtime.sendMessage({
      action: 'callGeminiStream',
      payload: {
        systemPrompt: prompt,
        userContent: contentText,
        generationConfig,
        originalUserContent,
      },
      purpose: purpose,
    });
  }

  async function saveState(data) {
    if (!currentTab) return;
    const key = currentTab.id.toString();
    const currentState = (await chrome.storage.local.get(key))[key] || {};
    const newState = { ...currentState, ...data };
    await chrome.storage.local.set({ [key]: newState });
    return newState;
  }

  async function saveToHistory(stateData, contextActionType = null) {
    const { history = [] } = await chrome.storage.local.get('history');
    const newEntry = {
      id: Date.now(),
      cleanedContent: stateData.cleanedContent,
      answerHTML: stateData.answerHTML,
      explanationHTML: stateData.explanationHTML || '',
      url: currentTab.url,
      title: currentTab.title,
      timestamp: new Date().toISOString(),
      actionType: contextActionType || 'quiz',
    };
    history.unshift(newEntry);
    if (history.length > 100) history.pop();
    await chrome.storage.local.set({ history });
  }

  function restoreUiFromState(state) {
    hide(messageArea);
    show(resultsWrapper);
    if (state.cleanedContent) {
      _handleCleaningResult(state.cleanedContent);
    }
    if (state.answerHTML) {
      _handleAnswerResult(state.answerHTML);
    }
    if (state.explanationHTML) {
      _handleExplanationResult(state.explanationHTML);
    }
  }

  async function runInitialScan(contentFromContextMenu = null, contextActionType = null) {
    hide(resultsWrapper);
    displayMessage(
      `<div class="loading-state"><div class="spinner"></div><p>Analyzing Page...</p></div>`
    );

    let textToProcess;
    let selectedPrompt;
    let purpose = 'quiz_answer';

    try {
      if (contentFromContextMenu && contextActionType) {
        textToProcess = contentFromContextMenu;
        const customPrompts = appConfig.customPrompts || {};

        switch (contextActionType) {
          case 'summarize':
            selectedPrompt = customPrompts.summarize || DEFAULT_PROMPTS.summarize;
            purpose = 'summarize_action';
            break;
          case 'explain':
            selectedPrompt = customPrompts.explanation;
            purpose = 'explain_action';
            break;
          case 'translate':
            selectedPrompt = customPrompts.translate || DEFAULT_PROMPTS.translate;
            purpose = 'translate_action';
            break;
          case 'rephrase':
            selectedPrompt = customPrompts.rephrase || DEFAULT_PROMPTS.rephrase;
            purpose = 'rephrase_action';
            textToProcess = `Target languages: ${appConfig.rephraseLanguages}\n\nText to rephrase:\n${contentFromContextMenu}`;
            break;
        }
        displayMessage(
          `<div class="loading-state"><div class="spinner"></div><p>Getting ${contextActionType}...</p></div>`
        );
      } else {
        displayMessage(
          `<div class="loading-state"><div class="spinner"></div><p>Step 1/2: Cleaning content...</p></div>`
        );
        const response = await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(currentTab.id, { action: 'get_page_content' }, (res) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(res);
          });
        });
        if (!response || !response.content?.trim()) throw new Error('No readable content found.');
        textToProcess = response.content;
        selectedPrompt = appConfig.customPrompts?.cleaning || DEFAULT_PROMPTS.cleaning;
        purpose = 'cleaning';
      }
      callGeminiStream(selectedPrompt, textToProcess, purpose, contentFromContextMenu);
    } catch (error) {
      displayMessage(`<strong>Analysis Failed:</strong> ${escapeHtml(error.message)}`, true);
    }
  }

  function getAnswer() {
    chrome.storage.local.get(currentTab.id.toString(), (result) => {
      const cleanedContent = result[currentTab.id.toString()]?.cleanedContent;
      retryAnswerButton.disabled = true;
      answerDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div></div>`;
      callGeminiStream(
        appConfig.customPrompts?.answer || DEFAULT_PROMPTS.answer,
        cleanedContent,
        'answer'
      );
    });
  }

  function getExplanation() {
    chrome.storage.local.get(currentTab.id.toString(), (result) => {
      const cleanedContent = result[currentTab.id.toString()]?.cleanedContent;
      explanationButton.disabled = true;
      retryExplanationButton.disabled = true;
      show(explanationContainer);
      explanationDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div></div>`;
      callGeminiStream(
        appConfig.customPrompts?.explanation || DEFAULT_PROMPTS.explanation,
        cleanedContent,
        'explanation'
      );
    });
  }

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'geminiStreamUpdate') {
      const { payload, purpose } = request;
      hide(messageArea);
      show(resultsWrapper);

      let targetDisplay;
      if (purpose === 'cleaning') {
        targetDisplay = contentDisplay;
      } else if (purpose.includes('answer')) {
        targetDisplay = answerDisplay;
      } else if (purpose === 'explanation') {
        targetDisplay = explanationDisplay;
      } else if (purpose.includes('_action')) {
        targetDisplay = answerDisplay;
      }

      if (payload.success) {
        if (payload.chunk) {
          if (targetDisplay.querySelector('.loading-state')) targetDisplay.innerHTML = '';
          targetDisplay.textContent += payload.chunk;
        } else if (payload.done) {
          const fullText = payload.fullText || targetDisplay.textContent;
          switch (purpose) {
            case 'cleaning':
              _handleCleaningResult(fullText);
              break;
            case 'answer':
            case 'quiz_answer':
              _handleAnswerResult(fullText);
              break;
            case 'explanation':
              _handleExplanationResult(fullText);
              break;
            case 'summarize_action':
            case 'explain_action':
            case 'translate_action':
            case 'rephrase_action':
              _handleContextMenuResult(fullText, request.payload.originalUserContent, purpose);
              break;
          }
        }
      } else {
        displayMessage(`<strong>Error:</strong> ${escapeHtml(payload.error)}`, true);
      }
    }
    return true;
  });

  async function initialize() {
    [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!currentTab) {
      displayMessage('Cannot find active tab.', true);
      return;
    }

    appConfig = await chrome.storage.sync.get(null);
    if (!appConfig.geminiApiKey) {
      displayMessage('API Key is not set. Please configure it in the options page.', true);
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['js/mark.min.js', 'js/content.js'],
      });
    } catch (e) {
      displayMessage(`Extension cannot run on this page. Error: ${e.message.split(':')[0]}`, true);
      return;
    }

    const contextKey = `contextSelection_${currentTab.id}`;
    const actionKey = `contextAction_${currentTab.id}`;
    const contextData = await chrome.storage.local.get([contextKey, actionKey]);

    if (contextData[contextKey] && contextData[actionKey]) {
      await chrome.storage.local.remove([contextKey, actionKey, currentTab.id.toString()]);
      runInitialScan(contextData[contextKey], contextData[actionKey]);
    } else {
      const savedState = (await chrome.storage.local.get(currentTab.id.toString()))[
        currentTab.id.toString()
      ];
      if (savedState) {
        restoreUiFromState(savedState);
      } else {
        runInitialScan();
      }
    }
  }

  settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
  rescanButton.addEventListener('click', () => {
    if (!currentTab) return;
    chrome.storage.local.remove(currentTab.id.toString());
    runInitialScan();
  });
  explanationButton.addEventListener('click', getExplanation);
  retryAnswerButton.addEventListener('click', getAnswer);
  retryExplanationButton.addEventListener('click', getExplanation);

  function handleCopy(button) {
    const textToCopy = button.dataset.copyText;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalIcon = button.innerHTML;
        button.innerHTML = `Copied!`;
        button.classList.add('copied');
        setTimeout(() => {
          button.innerHTML = originalIcon;
          button.classList.remove('copied');
        }, 2000);
      });
    }
  }
  copyAnswerButton.addEventListener('click', () => handleCopy(copyAnswerButton));
  copyExplanationButton.addEventListener('click', () => handleCopy(copyExplanationButton));

  initialize();
});
