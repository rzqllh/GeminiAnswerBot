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
        originalUserContent: null,
        cleanedContent: null,
        parsedAnswer: null, // { answer, confidence, reason }
        explanationHTML: null,
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
        this._listeners.forEach(listener => listener(this._state, oldState));
      },
      subscribe(listener) { this._listeners.push(listener); },
    };

    this.elements = {};
    this.streamAccumulator = {};
    this._messageHandler = this._handleMessages.bind(this);

    this._queryElements();
    this._bindEvents();
    this.store.subscribe(this.render.bind(this));
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
    this._resetStateForNewScan();
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const config = await StorageManager.get(null);
      this.store.setState({ tab, config });

      if (!config.geminiApiKey) {
        return this.store.setState({ view: 'onboarding' });
      }

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
      parsedAnswer: null, explanationHTML: null, reasoningHTML: null,
      totalTokenCount: 0, activeTab: 'explanation',
    });
  }

  render(newState, oldState) {
    // Hide all containers
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
    // Render question panel only when content changes
    if (state.cleanedContent !== oldState.cleanedContent) {
      if (state.cleanedContent) {
        this.elements.questionDisplay.innerHTML = this._formatQuestionContent(state.cleanedContent);
      } else {
        this._renderLoadingInto(this.elements.questionDisplay);
      }
    }

    // Render result card
    if (state.parsedAnswer) {
      this.elements.answerDisplay.textContent = state.parsedAnswer.answer;
      this.elements.tokensDisplay.textContent = state.totalTokenCount || '--';
      
      const confidence = state.parsedAnswer.confidence || 'N/A';
      this.elements.confidenceDisplay.innerHTML = `<span class="badge ${confidence.toLowerCase()}">${confidence}</span>`;

      // Update tabs and content
      this._updateTabs(state);
      this._renderTabContent(state);

    } else {
      this._renderLoadingInto(this.elements.answerDisplay);
      this.elements.tabContent.innerHTML = '';
      this.elements.confidenceDisplay.innerHTML = '';
      this.elements.tokensDisplay.textContent = '--';
    }
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
    if (state.activeTab === 'explanation') {
      if (state.explanationHTML) {
        this.elements.tabContent.innerHTML = state.explanationHTML;
      } else {
        // If there's an answer but no explanation yet, show loading state.
        this._renderLoadingInto(this.elements.tabContent);
      }
    } else if (state.activeTab === 'reasoning') {
      if (state.reasoningHTML) {
        this.elements.tabContent.innerHTML = state.reasoningHTML;
      }
    }
  }

  _handleTabClick(tabName) {
    const state = this.store.getState();
    if (state.activeTab === tabName) return; // No change needed

    this.store.setState({ activeTab: tabName });

    if (tabName === 'explanation' && !state.explanationHTML && state.parsedAnswer) {
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
    if (!payload.success) {
      return this.store.setState({ view: 'error', error: payload.error });
    }

    if (payload.chunk) {
      this.streamAccumulator[purpose] = (this.streamAccumulator[purpose] || '') + payload.chunk;
    }
    
    if (payload.done) {
      const fullText = this.streamAccumulator[purpose] || '';
      delete this.streamAccumulator[purpose];

      const handlers = {
        'cleaning': (text) => {
          this.store.setState({ cleanedContent: text });
          this._callGeminiStream('answer', text);
        },
        'answer': (text) => this._handleAnswerResult(text, payload.totalTokenCount),
        'quiz_explanation': (text) => this.store.setState({ explanationHTML: DOMPurify.sanitize(marked.parse(text)) })
      };
      
      if(handlers[purpose]) handlers[purpose](fullText);
    }
  }
  
  _handleAnswerResult(text, tokenCount) {
    const answerMatch = text.match(/Answer:\s*(.*)/i);
    const confidenceMatch = text.match(/Confidence:\s*(High|Medium|Low)/i);
    const reasonMatch = text.match(/Reason:\s*([\s\S]*)/i);
    
    const parsedAnswer = {
      answer: answerMatch ? answerMatch[1].trim().replace(/`/g, '') : "Could not determine answer.",
      confidence: confidenceMatch ? confidenceMatch[1] : "N/A",
      reason: reasonMatch ? reasonMatch[1].trim() : "No reason provided."
    };
    
    this.store.setState({ parsedAnswer, totalTokenCount: tokenCount });

    // Pre-populate explanation tab with the short reason from the answer
    this.store.setState({
        explanationHTML: DOMPurify.sanitize(marked.parse(parsedAnswer.reason)),
        reasoningHTML: null // Reset reasoning, fetched on tab click
    });

    if (this.store.getState().config.autoHighlight) {
        this._sendMessageToContentScript({
            action: 'highlight-answer', payload: { text: [parsedAnswer.answer] }
        });
    }
  }

  // --- HTML TEMPLATES ---
  _getLoadingHTML(text) { return `<div class="loading-indicator"><div class="spinner"></div></div><p>${_escapeHtml(text)}</p>`; }
  _renderLoadingInto(element) { element.innerHTML = `<div class="loading-indicator"><div class="spinner"></div></div>`; }
  _getErrorHTML(error) {
    return `<div class="info-panel error"><h3>${_escapeHtml(error.title)}</h3><p>${_escapeHtml(error.message)}</p></div>`;
  }
  _formatQuestionContent(content) {
    const q = content.replace(/Question:/i, '### Question\n');
    return DOMPurify.sanitize(marked.parse(q));
  }
  
  _handleFeedback(type) {
    this.elements.feedbackCorrect.classList.toggle('selected-correct', type === 'correct');
    this.elements.feedbackIncorrect.classList.toggle('selected-incorrect', type === 'incorrect');
    this.elements.feedbackCorrect.disabled = true;
    this.elements.feedbackIncorrect.disabled = true;
  }
  
  // --- UTILITIES ---
  _ensureContentScripts(tabId) { /* Logic remains same as previous versions */
      return chrome.scripting.executeScript({ 
          target: { tabId }, 
          files: ['js/vendor/Readability.js', 'js/content.js']
      }).catch(err => {
          if(!err.message.includes('Cannot create script')) console.error("Script injection failed:", err);
      });
  }
  _sendMessageToContentScript(message) { /* Logic remains same */ 
      return chrome.tabs.sendMessage(this.store.getState().tab.id, message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupApp().start();
});