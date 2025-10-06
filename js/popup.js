// === Hafizh Signature Code ===
// Author: Hafizh Rizqullah — Gemini Answer Bot Specialist
// File: js/popup.js
// Created: 2025-08-27 12:05:00

class PopupApp {
  constructor() {
    this.store = {
      _state: {
        view: 'loading', // loading, onboarding, error, analysis
        error: null,
        tab: null,
        config: {},
        url: null, // For caching validation
        originalUserContent: null,
        cleanedContent: null,
        parsedAnswer: null, // { answer, confidence, reason }
        explanationHTML: null,
        isFullExplanationFetched: false, // <-- FIX for explanation tab
        reasoningHTML: null,
        totalTokenCount: 0,
        activeTab: 'explanation',
      },
      _listeners: [],
      getState() { return this._state; },
      setState(newState) {
        const oldState = { ...this._state };
        this._state = { ...this._state, ...newState };
        StorageManager.log('PopupState', 'State changed:', this._state);
        // After state is set, save it for caching
        this._saveCurrentViewState();
        this._listeners.forEach(listener => listener(this._state, oldState));
      },
      subscribe(listener) { this._listeners.push(listener); },
    };

    // Bind class methods to the instance
    this.render = this.render.bind(this);
    this._saveCurrentViewState = this._saveCurrentViewState.bind(this);
    
    this.elements = {};
    this.streamAccumulator = {};
    this._messageHandler = this._handleMessages.bind(this);

    this._queryElements();
    this._bindEvents();
    this.store.subscribe(this.render);
    chrome.runtime.onMessage.addListener(this._messageHandler);

    window.addEventListener('unload', () => {
      chrome.runtime.onMessage.removeListener(this._messageHandler);
    });
  }

  _queryElements() {
    const ids = [
      'settingsButton', 'rescanButton', 'mainContent', 'messageArea',
      'onboardingContainer', 'onboardingGoToSettings', 'analysisContainer',
      'questionDisplay', 'resultCard', 'answerDisplay', 'confidenceDisplay',
      'tokensDisplay', 'resultTabs', 'explanationTab', 'reasoningTab', 'tabContent',
      'feedbackContainer', 'feedbackCorrect', 'feedbackIncorrect'
    ];
    ids.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
  }

  _bindEvents() {
    this.elements.settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
    this.elements.onboardingGoToSettings.addEventListener('click', () => chrome.runtime.openOptionsPage());
    this.elements.rescanButton.addEventListener('click', () => this.start(true));
    this.elements.explanationTab.addEventListener('click', () => this._handleTabClick('explanation'));
    this.elements.reasoningTab.addEventListener('click', () => this._handleTabClick('reasoning'));
    this.elements.feedbackCorrect.addEventListener('click', () => this._handleFeedback('correct'));
    this.elements.feedbackIncorrect.addEventListener('click', () => this._handleFeedback('incorrect'));
  }

  _handleMessages(request) {
    if (request.action === 'geminiStreamUpdate') {
      this._handleStreamUpdate(request);
    }
  }

  async start(isRescan = false) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const config = await StorageManager.get(null);
      this.store.setState({ tab, config, url: tab.url });

      if (!config.geminiApiKey) {
        return this.store.setState({ view: 'onboarding' });
      }
      
      // FIX for Caching: Try to load from persisted state first
      if (!isRescan) {
        const persistedState = await this._getPersistedState();
        if (persistedState && persistedState.url === tab.url) {
            StorageManager.log('Popup', 'Resuming session from cache.');
            // Re-bind methods after deserializing
            persistedState._saveCurrentViewState = this._saveCurrentViewState.bind(this);
            this.store.setState(persistedState);
            return;
        }
      }

      // If no cache or is a rescan, proceed with a fresh analysis
      StorageManager.log('Popup', 'Starting fresh analysis.');
      await this._clearPersistedState();
      this._resetStateForNewScan();
      this.store.setState({ url: tab.url }); // Set URL for new cache entry

      await this._ensureContentScripts(tab.id);

      const response = await this._sendMessageToContentScript({ action: "get_quiz_content" });
      if (!response || !response.content?.trim()) {
        return this.store.setState({ view: 'info', error: { title: 'No Quiz Found', message: 'Could not detect a quiz on this page. Try selecting text or rescanning.' } });
      }

      this.store.setState({ originalUserContent: response.content, view: 'analysis' });
      this._callGeminiStream('cleaning', response.content);

    } catch (error) {
      console.error("Initialization failed:", error);
      this.store.setState({ view: 'error', error: ErrorHandler.format(error, 'init') });
    }
  }
  
  _resetStateForNewScan() {
    this.store.setState({
      view: 'loading', error: null, originalUserContent: null, cleanedContent: null,
      parsedAnswer: null, explanationHTML: null, isFullExplanationFetched: false,
      reasoningHTML: null, totalTokenCount: 0, activeTab: 'explanation',
    });
  }

  render(newState, oldState) {
    this.elements.messageArea.classList.add('hidden');
    this.elements.onboardingContainer.classList.add('hidden');
    this.elements.analysisContainer.classList.add('hidden');

    switch (newState.view) {
      case 'loading':
        this.elements.messageArea.classList.remove('hidden');
        this.elements.messageArea.innerHTML = this._getLoadingHTML('Scanning for quiz...');
        break;
      case 'onboarding':
        this.elements.onboardingContainer.classList.remove('hidden');
        break;
      case 'info':
      case 'error':
        this.elements.messageArea.classList.remove('hidden');
        this.elements.messageArea.innerHTML = this._getErrorHTML(newState.error);
        break;
      case 'analysis':
        this.elements.analysisContainer.classList.remove('hidden');
        this._renderAnalysisView(newState, oldState);
        break;
    }
  }

  _renderAnalysisView(state, oldState) {
    if (state.cleanedContent !== oldState.cleanedContent) {
      this.elements.questionDisplay.innerHTML = state.cleanedContent
        ? this._formatQuestionContent(state.cleanedContent)
        : this._getLoadingHTML('Cleaning content...');
    }

    if (state.parsedAnswer) {
      this.elements.answerDisplay.textContent = state.parsedAnswer.answer;
      this.elements.tokensDisplay.textContent = state.totalTokenCount || '--';
      const confidence = state.parsedAnswer.confidence || 'N/A';
      this.elements.confidenceDisplay.innerHTML = `<span class="badge ${confidence.toLowerCase()}">${confidence}</span>`;
    } else {
      this._renderLoadingInto(this.elements.answerDisplay);
      this.elements.confidenceDisplay.innerHTML = '';
      this.elements.tokensDisplay.textContent = '--';
    }
    
    this._updateTabs(state);
    this._renderTabContent(state);
  }
  
  _updateTabs(state) {
      this.elements.explanationTab.classList.toggle('active', state.activeTab === 'explanation');
      this.elements.reasoningTab.classList.toggle('active', state.activeTab === 'reasoning');
      this.elements.reasoningTab.disabled = !state.reasoningHTML;
      if (!state.reasoningHTML && state.activeTab === 'reasoning') {
        this.store.setState({ activeTab: 'explanation' });
      }
  }

  _renderTabContent(state) {
    const tabName = state.activeTab;
    const contentHTML = state[`${tabName}HTML`];
    
    if (contentHTML) {
      this.elements.tabContent.innerHTML = contentHTML;
    } else {
      // Show loading only if the main answer is already present
      if (state.parsedAnswer) {
        this._renderLoadingInto(this.elements.tabContent);
      } else {
        this.elements.tabContent.innerHTML = '';
      }
    }
  }

  _handleTabClick(tabName) {
    const state = this.store.getState();
    if (state.activeTab === tabName) return;

    this.store.setState({ activeTab: tabName });

    // FIX for Explanation Tab: Check new state flag
    if (tabName === 'explanation' && !state.isFullExplanationFetched && state.parsedAnswer) {
      this._renderLoadingInto(this.elements.tabContent);
      const content = `${state.cleanedContent}\n\nCorrect Answer: ${state.parsedAnswer.answer}`;
      this._callGeminiStream('quiz_explanation', content);
    }
  }

  _callGeminiStream(purpose, userContent) {
    const { config, tab } = this.store.getState();
    const payload = {
      apiKey: config.geminiApiKey, model: config.selectedModel,
      systemPrompt: (config.promptProfiles?.[config.activeProfile]?.[purpose]) || DEFAULT_PROMPTS[purpose],
      userContent, purpose, tabId: tab.id
    };
    chrome.runtime.sendMessage({ action: 'callGeminiStream', payload });
  }

  _handleStreamUpdate(request) {
    const { payload, purpose } = request;
    if (!payload.success) return this.store.setState({ view: 'error', error: payload.error });
    if (payload.chunk) this.streamAccumulator[purpose] = (this.streamAccumulator[purpose] || '') + payload.chunk;
    
    if (payload.done) {
      const fullText = this.streamAccumulator[purpose] || '';
      delete this.streamAccumulator[purpose];

      const handlers = {
        'cleaning': text => {
          this.store.setState({ cleanedContent: text });
          this._callGeminiStream('answer', text);
        },
        'answer': text => this._handleAnswerResult(text, payload.totalTokenCount),
        'quiz_explanation': text => {
          this.store.setState({
            explanationHTML: DOMPurify.sanitize(marked.parse(text)),
            isFullExplanationFetched: true
          });
        }
      };
      
      if(handlers[purpose]) handlers[purpose](fullText);
    }
  }
  
  _handleAnswerResult(text, tokenCount) {
    const parsed = {
      answer: text.match(/Answer:\s*(.*)/i)?.[1].trim().replace(/`/g, '') || "N/A",
      confidence: text.match(/Confidence:\s*(High|Medium|Low)/i)?.[1] || "N/A",
      reason: text.match(/Reason:\s*([\s\S]*)/i)?.[1].trim() || ""
    };
    
    this.store.setState({
      parsedAnswer: parsed,
      totalTokenCount: tokenCount,
      explanationHTML: DOMPurify.sanitize(marked.parse(parsed.reason)), // Pre-populate with short reason
      isFullExplanationFetched: false, // Reset for new answer
      reasoningHTML: null,
    });

    if (this.store.getState().config.autoHighlight) {
      this._sendMessageToContentScript({
          action: 'highlight-answer', payload: { text: [parsed.answer] }
      }).catch(err => StorageManager.log('Popup', 'Could not highlight answer on page:', err.message));
    }
  }

  // --- HTML TEMPLATES ---
  _getLoadingHTML(text) { return `<div class="loading-indicator"><p style="font-size:13px; color:var(--secondary-text);">${_escapeHtml(text)}</p><div class="spinner"></div></div>`; }
  _renderLoadingInto(element) { element.innerHTML = `<div class="loading-indicator"><div class="spinner"></div></div>`; }
  _getErrorHTML(error) { return `<div class="info-panel error"><h3>${_escapeHtml(error.title)}</h3><p>${_escapeHtml(error.message)}</p></div>`; }
  _formatQuestionContent(content) { return DOMPurify.sanitize(marked.parse(content.replace(/Question:/i, '### Question\n'))); }
  
  _handleFeedback(type) {
    this.elements.feedbackCorrect.classList.toggle('selected-correct', type === 'correct');
    this.elements.feedbackIncorrect.classList.toggle('selected-incorrect', type === 'incorrect');
    this.elements.feedbackCorrect.disabled = true;
    this.elements.feedbackIncorrect.disabled = true;
  }
  
  // --- UTILITIES ---
  // FIX for Highlighting: Ensure all required scripts and styles are injected.
  async _ensureContentScripts(tabId) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping_content_script' });
      if (response && response.ready) return;
    } catch (e) {
      StorageManager.log('Injection', 'Content script not found, injecting now...');
      try {
        await chrome.scripting.insertCSS({ target: { tabId }, files: ['assets/highlighter.css', 'assets/dialog.css', 'assets/toolbar.css', 'assets/resultDialog.css'] });
        await chrome.scripting.executeScript({ 
            target: { tabId }, 
            files: [
                'js/vendor/dompurify.min.js', 'js/vendor/marked.min.js', 'js/vendor/mark.min.js',
                'js/utils/helpers.js', 'js/utils/errorHandler.js', 'js/vendor/Readability.js', 'js/content.js'
            ] 
        });
      } catch (injectionError) {
        throw new Error('Script injection failed. This page may not be supported.');
      }
    }
  }
  
  _sendMessageToContentScript(message) { return chrome.tabs.sendMessage(this.store.getState().tab.id, message); }
  
  // FIX for Caching: Add functions to manage state persistence
  async _getPersistedState() {
    const { tab } = this.store.getState();
    if (!tab) return null;
    const key = tab.id.toString();
    const result = await StorageManager.local.get(key);
    return result[key] || null;
  }
  
  async _saveCurrentViewState() {
    const state = this.store.getState();
    if (!state.tab || state.view === 'loading' || state.view === 'onboarding') return;
    const key = state.tab.id.toString();
    const stateToSave = { ...state };
    // Avoid saving non-serializable or transient properties
    delete stateToSave.tab;
    delete stateToSave.config;
    delete stateToSave._listeners;
    await StorageManager.local.set({ [key]: stateToSave });
  }

  async _clearPersistedState() {
    const { tab } = this.store.getState();
    if (!tab) return;
    await StorageManager.local.remove(tab.id.toString());
  }
}

document.addEventListener('DOMContentLoaded', () => { new PopupApp().start(); });