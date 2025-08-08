// === Hafizh Signature Code ===
// Author: Hafizh Rizqullah — GeminiAnswerBot
// File: js/popup.js
// Created: 2025-08-08 16:42:03

class PopupApp {
    constructor() {
        // Centralized state management
        this.store = {
            _state: {
                tab: null, config: {}, view: 'loading', lastView: 'quiz', url: null,
                error: null, cleanedContent: null, originalUserContent: null,
                answerHTML: null, explanationHTML: null, thoughtProcess: null,
                totalTokenCount: 0, cacheKey: null, incorrectAnswer: null,
                isImageMode: false, imageUrl: null, base64ImageData: null,
                action: null, generalTaskResult: null,
            },
            _listeners: [],
            getState() { return this._state; },
            setState(newState) {
                this._state = { ...this._state, ...newState };
                StorageManager.log('PopupState', 'State changed:', this._state);
                this._listeners.forEach(listener => listener(this._state));
            },
            subscribe(listener) { this._listeners.push(listener); }
        };

        this.elements = {};
        this.streamAccumulator = {};
        this._messageHandler = this._handleMessages.bind(this);
        this._tabUpdateHandler = this._handleTabUpdate.bind(this);

        // --- ONE-TIME SETUP LOGIC ---
        this._queryElements();
        this._bindEvents();
        this.store.subscribe(this.render.bind(this));
        chrome.runtime.onMessage.addListener(this._messageHandler);

        // Listen for tab updates to handle navigation
        chrome.tabs.onUpdated.addListener(this._tabUpdateHandler);

        window.addEventListener('unload', () => {
            chrome.runtime.onMessage.removeListener(this._messageHandler);
            chrome.tabs.onUpdated.removeListener(this._tabUpdateHandler);
        });
    }

    _queryElements() {
        const ids = [
            'settingsButton', 'analyzePageButton', 'rescanButton', 'explanationButton',
            'aiActionsWrapper', 'quizModeContainer', 'contentDisplayWrapper', 
            'contentDisplay', 'answerContainer', 'answerDisplay', 'explanationContainer', 
            'explanationDisplay', 'messageArea', 'retryAnswer', 'retryExplanation', 
            'copyAnswer', 'copyExplanation', 'feedbackContainer', 'feedbackCorrect', 
            'feedbackIncorrect', 'correctionPanel', 'correctionOptions', 
            'imagePreviewContainer', 'imagePreview', 'imageStatusText', 'answerCardTitle',
            'generalTaskContainer', 'generalTaskTitle', 'generalTaskDisplay', 'copyGeneralTask',
            'showReasoningButton', 'reasoningDisplay',
            'verificationContainer', 'verifyButton'
        ];
        ids.forEach(id => {
            const key = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
            this.elements[key] = document.getElementById(id);
        });
    }

    _bindEvents() {
        this.elements.settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
        this.elements.analyzePageButton.addEventListener('click', () => this._handlePageAnalysis());
        this.elements.rescanButton.addEventListener('click', () => this.start(true));
        this.elements.explanationButton.addEventListener('click', () => this._getExplanation());
        this.elements.retryAnswer.addEventListener('click', () => this._getAnswer());
        this.elements.retryExplanation.addEventListener('click', () => this._getExplanation());
        this.elements.feedbackCorrect.addEventListener('click', () => this._handleFeedbackCorrect());
        this.elements.feedbackIncorrect.addEventListener('click', () => this._handleFeedbackIncorrect());
        this.elements.copyAnswer.addEventListener('click', e => this._copyToClipboard(e.currentTarget));
        this.elements.copyExplanation.addEventListener('click', e => this._copyToClipboard(e.currentTarget));
        this.elements.copyGeneralTask.addEventListener('click', e => this._copyToClipboard(e.currentTarget));
        this.elements.showReasoningButton.addEventListener('click', () => this._toggleReasoningDisplay());
        this.elements.verifyButton.addEventListener('click', () => this._handleVerification());
    }

    _handleTabUpdate(tabId, changeInfo) {
        const state = this.store.getState();
        // If the active tab has finished loading a new URL, trigger a rescan.
        if (state.tab && tabId === state.tab.id && changeInfo.status === 'complete') {
            StorageManager.log('Popup', 'Active tab updated, triggering rescan.');
            this.start(true);
        }
    }

    _handleMessages(request) {
        if (request.action === 'geminiStreamUpdate') {
            this._handleStreamUpdate(request);
        }
    }

    _renderLoadingState(container) {
        if (!container) return;
        container.innerHTML = `<div class="panel-loader"><div class="panel-spinner"></div></div>`;
    }
    
    async _ensureContentScripts(tabId) {
        StorageManager.log('Injection', 'Ensuring content scripts are present...');
        try {
            const response = await chrome.tabs.sendMessage(tabId, { action: 'ping_content_script' });
            if (response && response.ready) {
                StorageManager.log('Injection', 'Content script already loaded and ready.');
                return;
            }
        } catch (e) {
            // This error is expected if the script isn't injected yet.
            StorageManager.log('Injection', 'Content script not found, injecting now...');
            try {
                await chrome.scripting.insertCSS({ target: { tabId }, files: ['assets/highlighter.css', 'assets/dialog.css', 'assets/toolbar.css'] });
                await chrome.scripting.executeScript({ 
                    target: { tabId }, 
                    files: [
                        'js/utils/helpers.js', 
                        'js/utils/errorHandler.js', 
                        'js/vendor/dompurify.min.js', 
                        'js/vendor/marked.min.js', 
                        'js/vendor/mark.min.js',
                        'js/vendor/Readability.js', // Ensure library is injected before our script
                        'js/content.js'
                    ] 
                });
                // Give a brief moment for the script to initialize after injection
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (injectionError) {
                StorageManager.log('Injection', 'Critical injection failure:', injectionError);
                throw new Error('Script injection failed. This page may not be supported.');
            }
        }
    }

    async start(isRescan = false) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id) throw new Error('Cannot find the active tab.');
            
            const config = await StorageManager.get(null);
            this.store.setState({ tab, config });

            if (['chrome://', 'https://chrome.google.com/'].some(url => tab.url.startsWith(url))) {
                this.store.setState({ view: 'info', error: { title: 'Page Not Supported', message: 'For your security, Chrome extensions cannot run on special browser pages.' } });
                return;
            }

            if (!config.geminiApiKey) throw { type: 'INVALID_API_KEY' };
            
            await this._ensureContentScripts(tab.id);

            const contextData = await chrome.runtime.sendMessage({ action: 'popupReady' });

            if (contextData && contextData.source === 'contextMenu' && !isRescan) {
                await this._clearPersistedState();
                const isGeneralTask = ['summarize', 'explanation', 'translate', 'rephrase'].some(t => contextData.action.startsWith(t));
                
                this.store.setState({
                    action: contextData.action,
                    url: tab.url,
                    originalUserContent: contextData.selectionText || contextData.srcUrl,
                    isImageMode: contextData.action.startsWith('image-'),
                    imageUrl: contextData.srcUrl,
                    base64ImageData: contextData.base64ImageData,
                    view: isGeneralTask ? 'general' : 'quiz'
                });

                this._callGeminiStream(contextData.action, this.store.getState().originalUserContent, this.store.getState().base64ImageData);
            } else {
                const persistedState = await this._getPersistedState();
                if (persistedState && persistedState.url === tab.url && !isRescan) {
                    this.store.setState(persistedState);
                } else {
                    await this._clearPersistedState();
                    this.store.setState({ view: 'loading' });
                    const response = await this._sendMessageToContentScript({ action: "get_quiz_content" });
                    if (!response || !response.content?.trim()) {
                        this.store.setState({ view: 'info', error: { title: 'No Quiz Found', message: 'We couldn\'t detect a quiz on this page. Try using the "Analyze Full Page" button or highlight text to start.' } });
                        return;
                    }
                    this.store.setState({ url: tab.url, originalUserContent: response.content });
                    this._callGeminiStream('cleaning', response.content);
                }
            }
        } catch (error) {
            console.error("Initialization failed:", error);
            this.store.setState({ view: 'error', error: ErrorHandler.format(error, 'init') });
        }
    }
    
    render() {
        const state = this.store.getState();
        this.elements.messageArea.classList.add('hidden');
        this.elements.quizModeContainer.classList.add('hidden');
        this.elements.generalTaskContainer.classList.add('hidden');
        
        switch (state.view) {
            case 'loading': 
                this.elements.messageArea.classList.remove('hidden'); 
                this.elements.messageArea.innerHTML = `<div class="loading-state full-page"><div class="spinner"></div><p>Scanning for quiz...</p></div>`; 
                break;
            case 'info': 
                this.elements.messageArea.classList.remove('hidden');
                this.elements.messageArea.innerHTML = `<div class="info-panel"><div class="info-panel-header">${_escapeHtml(state.error.title)}</div><div class="info-panel-body"><p>${_escapeHtml(state.error.message)}</p></div></div>`;
                break;
            case 'error': 
                this.elements.messageArea.classList.remove('hidden'); 
                this._renderErrorState(); 
                break;
            case 'general': 
                this.elements.generalTaskContainer.classList.remove('hidden'); 
                this._renderGeneralTaskState(); 
                break;
            case 'quiz': 
                this.elements.quizModeContainer.classList.remove('hidden'); 
                this._renderQuizState(); 
                break;
        }
    }

    _renderGeneralTaskState() {
        const state = this.store.getState();
        const titleMap = { 'summarize': 'Summary', 'explanation': 'Explanation', 'translate': 'Translation', 'rephrase': 'Rephrased Text', 'pageAnalysis': 'Page Analysis' };
        const baseAction = state.action ? state.action.split('-')[0] : 'pageAnalysis';
        this.elements.generalTaskTitle.textContent = titleMap[baseAction] || 'Result';
        
        if (state.generalTaskResult) {
            let displayHtml = '';
            if (baseAction === 'pageAnalysis') {
                 try {
                    const data = JSON.parse(state.generalTaskResult);
                    displayHtml += `<h3>Summary</h3><p>${_escapeHtml(data.tldr)}</p>`;
                    if (data.takeaways && data.takeaways.length > 0) {
                        displayHtml += `<h3>Key Takeaways</h3><ul>${data.takeaways.map(t => `<li>${_escapeHtml(t)}</li>`).join('')}</ul>`;
                    }
                } catch (e) {
                    displayHtml = DOMPurify.sanitize(marked.parse(state.generalTaskResult));
                }
            } else {
                 displayHtml = DOMPurify.sanitize(marked.parse(state.generalTaskResult));
            }

            this.elements.generalTaskDisplay.innerHTML = displayHtml;
            this.elements.copyGeneralTask.dataset.copyText = this.elements.generalTaskDisplay.innerText;
        } else {
            this._renderLoadingState(this.elements.generalTaskDisplay);
        }
    }

    _renderQuizState() {
        const state = this.store.getState();
        const titleText = this._getActionTitle(state.action) || 'Answer';
        this.elements.answerCardTitle.textContent = titleText;
        this.elements.imagePreviewContainer.classList.toggle('hidden', !state.isImageMode);
        this.elements.contentDisplayWrapper.classList.toggle('hidden', state.isImageMode);

        if (state.isImageMode) this.elements.imagePreview.src = state.imageUrl;

        const contentToDisplay = state.cleanedContent || state.originalUserContent;
        if (contentToDisplay && !state.isImageMode) {
            this.elements.contentDisplay.innerHTML = this._formatQuestionContent(contentToDisplay);
            this.elements.contentDisplayWrapper.classList.remove('hidden');
        } else if (!state.isImageMode) {
            this.elements.contentDisplayWrapper.classList.add('hidden');
        }

        // Declarative rendering for the answer panel
        if (state.answerHTML) {
            this.elements.answerContainer.classList.remove('hidden');
            this._renderAnswerContent(state.answerHTML, true, state.totalTokenCount, state.thoughtProcess);
        } else if (state.cleanedContent) { // Show loader only after cleaning is done
            this.elements.answerContainer.classList.remove('hidden');
            this._renderLoadingState(this.elements.answerDisplay);
        } else {
            this.elements.answerContainer.classList.add('hidden');
        }
        
        // Declarative rendering for the explanation panel
        if (state.explanationHTML) {
            this.elements.explanationContainer.classList.remove('hidden');
            this._renderExplanationContent(state.explanationHTML);
        } else {
            this.elements.explanationContainer.classList.add('hidden');
        }
    }

    _getActionTitle(action) {
        const titleMap = {
            'image-quiz': 'Quiz from Image', 'image-analyze': 'Image Analysis',
            'image-translate': 'Translate Image', 'summarize': 'Summary',
            'explanation': 'Explanation', 'translate': 'Translation',
            'rephrase': 'Rephrased Text'
        };
        const baseAction = action?.startsWith('rephrase-') ? 'rephrase' : action;
        return titleMap[baseAction];
    }
    
    _renderErrorState() {
        const { title, message, technicalMessage, type } = this.store.getState().error;
        let actionsHtml = `<button id="error-retry-btn" class="button button-secondary">Try Again</button>`;
        
        if (type === 'INVALID_API_KEY') {
            actionsHtml = `<button id="error-settings-btn" class="button button-primary">Open Settings</button>`;
        } else if (type === 'QUOTA_EXCEEDED') {
            actionsHtml = `<button id="error-quota-btn" class="button button-secondary">Check Quota</button> <button id="error-retry-btn" class="button button-secondary">Try Again</button>`;
        }

        this.elements.messageArea.innerHTML = `
            <div class="error-panel">
                <div class="error-panel-header">${_escapeHtml(title)}</div>
                <div class="error-panel-body">
                    <p>${_escapeHtml(message)}</p>
                    <details class="error-details">
                        <summary>Technical Details</summary>
                        <code>${_escapeHtml(technicalMessage)}</code>
                    </details>
                </div>
                <div class="error-panel-actions">${actionsHtml}</div>
            </div>`;

        document.getElementById('error-retry-btn')?.addEventListener('click', () => this.start(true));
        document.getElementById('error-settings-btn')?.addEventListener('click', () => chrome.runtime.openOptionsPage());
        document.getElementById('error-quota-btn')?.addEventListener('click', () => chrome.tabs.create({ url: 'https://aistudio.google.com/billing' }));
    }

    _handleRescan() {
        const { tab, config } = this.store.getState();
        if (!tab) return;
        this._clearPersistedState().then(() => {
            this.store.setState({ ...new PopupApp().store._state, tab, config });
            this.start(true);
        });
    }

    async _handlePageAnalysis() {
        await this._clearPersistedState();
        this.store.setState({ view: 'loading' });
        const loadingText = this.elements.messageArea.querySelector('p');
        if (loadingText) loadingText.textContent = 'Analyzing the entire page...';
        
        try {
            const response = await this._sendMessageToContentScript({ action: "get_full_page_content" });
            if (!response || !response.content?.trim()) throw new Error("No significant text content for analysis.");
            
            this.store.setState({ url: this.store.getState().tab.url, view: 'general' });
            this._callGeminiStream('pageAnalysis', response.content);
        } catch (e) {
            this.store.setState({ view: 'error', error: ErrorHandler.format(e, 'page_analysis') });
        }
    }

    _handleFeedbackCorrect() { this.elements.feedbackCorrect.disabled = true; this.elements.feedbackIncorrect.disabled = true; this.elements.feedbackCorrect.classList.add('selected-correct'); }
    
    async _handleFeedbackIncorrect() { 
        this.elements.feedbackIncorrect.disabled = true; 
        this.elements.feedbackCorrect.disabled = true; 
        this.elements.feedbackIncorrect.classList.add('selected-incorrect'); 
        this.elements.aiActionsWrapper.classList.add('hidden'); 
        this.elements.correctionPanel.classList.remove('hidden'); 
        this.elements.correctionOptions.innerHTML = `<div class="loading-state in-panel"><div class="spinner"></div><p>Fetching options...</p></div>`; 
        try { 
            const response = await this._sendMessageToContentScript({ action: "get_quiz_options" }); 
            if (response?.options?.length > 0) {
                this._renderCorrectionOptions(response.options);
            } else {
                this.elements.correctionOptions.innerHTML = '<p class="text-center">Could not find options on page.</p>'; 
            }
        } catch (e) { 
            this.elements.correctionOptions.innerHTML = `<p class="text-center">Error fetching options: ${e.message}</p>`; 
        } 
    }
    
    _callGeminiStream(purpose, userContent, base64ImageData = null) {
        const { config, tab } = this.store.getState();
        const { promptProfiles, activeProfile, selectedModel, geminiApiKey } = config;
        const currentPrompts = (promptProfiles?.[activeProfile]) || DEFAULT_PROMPTS;
        let systemPrompt = currentPrompts[purpose] || DEFAULT_PROMPTS[purpose];
    
        if (purpose.startsWith('rephrase-')) {
            const language = purpose.split('-')[1];
            systemPrompt = currentPrompts.rephrase || DEFAULT_PROMPTS.rephrase;
            userContent = `Target Language: ${language}\n\nText to rephrase:\n${userContent}`;
        }
    
        chrome.runtime.sendMessage({ action: 'callGeminiStream', payload: { apiKey: geminiApiKey, model: selectedModel, systemPrompt, userContent, base64ImageData, purpose, tabId: tab.id } });
    }
    
    _getAnswer() {
        const state = this.store.getState();
        // Logic is now simplified: just make the API call. The render() function handles the UI.
        if (state.isImageMode) {
            this._callGeminiStream('answer', '', state.base64ImageData);
            return;
        }
        if (!state.cleanedContent) return;
        
        const fingerprint = this._createQuizFingerprint(state.cleanedContent);
        const cacheKey = fingerprint ? this._simpleHash(fingerprint) : null;
        this.store.setState({ cacheKey });
        
        if (cacheKey) {
            StorageManager.local.get(cacheKey).then(cachedResult => {
                if (cachedResult[cacheKey]?.answerHTML) {
                    this._handleAnswerResult(cachedResult[cacheKey].answerHTML, true, cachedResult[cacheKey].totalTokenCount, cachedResult[cacheKey].thoughtProcess);
                } else { this._continueGetAnswer(); }
            });
        } else { this._continueGetAnswer(); }
    }
    
    _continueGetAnswer() {
        this.elements.retryAnswer.disabled = true;
        this._callGeminiStream('answer', this.store.getState().cleanedContent);
    }
    
    _getExplanation() {
        const state = this.store.getState();
        if (!state.cleanedContent) return;
        this.elements.explanationButton.disabled = true;
        this.elements.retryExplanation.disabled = true;
        
        this.elements.explanationContainer.classList.remove('hidden');
        this._renderLoadingState(this.elements.explanationDisplay);

        setTimeout(() => {
            const contentForExplanation = `${state.cleanedContent}\n\nCorrect Answer: ${state.incorrectAnswer}`;
            this._callGeminiStream('quiz_explanation', contentForExplanation);
        }, 0);
    }

    _handleStreamUpdate(request) {
        const { payload, purpose } = request;
        if (!payload.success) {
            this.store.setState({ view: 'error', error: payload.error });
            return;
        }
        
        const targetElementMap = {
            'answer': this.elements.answerDisplay,
            'quiz_explanation': this.elements.explanationDisplay,
            'correction': this.elements.explanationDisplay,
            'verification': this.elements.answerDisplay,
            'general': this.elements.generalTaskDisplay,
        };

        const quizHandlers = {
            'cleaning': text => this._handleCleaningResult(text),
            'answer': text => this._handleAnswerResult(text, false, payload.totalTokenCount),
            'quiz_explanation': text => this._handleExplanationResult(text, false),
            'correction': text => this._handleCorrectionResult(text),
            'verification': text => this._handleAnswerResult(text, false, payload.totalTokenCount, this.store.getState().thoughtProcess),
        };

        let streamTarget = null;
        if(quizHandlers[purpose]) {
            streamTarget = targetElementMap[purpose] || targetElementMap['answer'];
        } else {
            streamTarget = targetElementMap['general'];
        }

        if (payload.chunk) {
            if (!this.streamAccumulator[purpose]) {
                this.streamAccumulator[purpose] = '';
                if (streamTarget) streamTarget.innerHTML = ''; // Clear loader on first chunk
            }
            this.streamAccumulator[purpose] += payload.chunk;
            if (streamTarget) {
                streamTarget.innerHTML = DOMPurify.sanitize(marked.parse(this.streamAccumulator[purpose]));
            }
        }

        if (payload.done) {
            const fullText = payload.fullText || this.streamAccumulator[purpose] || '';
            delete this.streamAccumulator[purpose];

            if (quizHandlers[purpose]) {
                quizHandlers[purpose](fullText);
            } else {
                this._handleGeneralTaskResult(fullText);
            }
        }
    }

    _handleGeneralTaskResult(fullText) {
        const action = this.store.getState().action || 'pageAnalysis';
        this.store.setState({ generalTaskResult: fullText, view: 'general' });
        this._saveToHistory({ originalUserContent: this.store.getState().originalUserContent, generalTaskResult: fullText }, action);
    }
    
    _handleCleaningResult(fullText) {
        this.store.setState({ cleanedContent: fullText, view: 'quiz' });
        this._saveCurrentViewState();
        // The render() function will now show the loader. We just need to trigger the API call.
        this._getAnswer();
    }

    _renderAnswerContent(fullText, fromCache, totalTokenCount, thoughtProcess) {
        const state = this.store.getState();
        
        const thoughtMatch = fullText.match(/\[THOUGHT\]([\s\S]*)\[ENDTHOUGHT\]/);
        const currentThoughtProcess = thoughtProcess || (thoughtMatch ? thoughtMatch[1].trim() : null);
        const cleanText = fullText.replace(/\[THOUGHT\][\s\S]*\[ENDTHOUGHT\]\s*/, '');

        const answerMatch = cleanText.match(/Answer:\s*(.*)/i);
        const answerText = answerMatch ? answerMatch[1].trim() : cleanText.trim();
        const incorrectAnswer = answerText.replace(/`/g, '');
        
        const confidenceMatch = cleanText.match(/Confidence:\s*(High|Medium|Low)/i);
        let answerHtml = `<p class="answer-highlight">${this._renderInlineMarkdown(answerText)}</p>`;
        let confidenceHtml = '';
        if (confidenceMatch) {
            const confidence = confidenceMatch[1].toLowerCase();
            const reasonMatch = cleanText.match(/Reason:\s*([\s\S]*)/i);
            const reasonText = reasonMatch ? reasonMatch[1].trim() : "";
            const reasonHtml = this._renderInlineMarkdown(reasonText);
            confidenceHtml = `<div class="confidence-wrapper"><div class="confidence-level"><span class="confidence-level-label">Confidence ${fromCache ? '<span>⚡️</span>' : ''}</span><span class="confidence-badge confidence-${confidence}">${confidence[0].toUpperCase() + confidence.slice(1)}</span></div>${reasonHtml ? `<div class="confidence-reason">${reasonHtml}</div>` : ''}</div>`;
        }
        let tokenHtml = (totalTokenCount > 0 && !fromCache) ? `<div class="token-count"><span class="token-count-label">Tokens Used</span><span class="token-count-value">${totalTokenCount}</span></div>` : '';
        
        this.elements.answerDisplay.innerHTML = answerHtml + confidenceHtml + tokenHtml;
        this.elements.copyAnswer.dataset.copyText = incorrectAnswer;
        this.elements.retryAnswer.disabled = false;
        this.elements.aiActionsWrapper.classList.remove('hidden');
        this.elements.feedbackContainer.classList.remove('hidden');
        this.elements.showReasoningButton.classList.toggle('hidden', !currentThoughtProcess);
        this._resetFeedbackButtons();
        
        if (confidenceMatch && confidenceMatch[1].toLowerCase() === 'low') {
            this.elements.verificationContainer.classList.remove('hidden');
        } else {
            this.elements.verificationContainer.classList.add('hidden');
        }

        this.elements.verifyButton.disabled = false;
        this.elements.verifyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg> Verify with Google`;

        const answersToHighlight = incorrectAnswer.split(',').map(s => s.trim());
        if (state.config.autoHighlight && !state.isImageMode) {
            this._sendMessageToContentScript({
                action: 'highlight-answer',
                text: answersToHighlight,
                preSubmissionCheck: state.config.preSubmissionCheck ?? true
            })
            .catch(err => StorageManager.log('Popup', 'Could not highlight answer on page:', err.message));
        }
    }

    _handleAnswerResult(fullText, fromCache = false, totalTokenCount = 0, thoughtProcess = null) {
        const state = this.store.getState();
        this.store.setState({
            answerHTML: fullText,
            totalTokenCount,
            thoughtProcess,
            incorrectAnswer: fullText.match(/Answer:\s*(.*)/i)?.[1].trim().replace(/`/g, '') || ''
        });
        
        if (!fromCache && state.cacheKey) {
            StorageManager.local.set({ [state.cacheKey]: { answerHTML: fullText, totalTokenCount, thoughtProcess } });
        }
        
        this._saveCurrentViewState();
        if (!fromCache) {
            this._saveToHistory({ cleanedContent: state.cleanedContent, answerHTML: fullText, thoughtProcess }, 'quiz');
        }
    }

    _renderExplanationContent(fullText) {
        this.elements.explanationDisplay.innerHTML = DOMPurify.sanitize(marked.parse(fullText)); 
        this.elements.copyExplanation.dataset.copyText = fullText; 
        this.elements.explanationButton.disabled = false; 
        this.elements.retryExplanation.disabled = false; 
        this.elements.explanationContainer.classList.remove('hidden'); 
    }

    _handleExplanationResult(fullText, fromCache = false) { 
        this.store.setState({ explanationHTML: fullText });
        this._saveCurrentViewState(); 
        if (!fromCache) this._saveToHistory({ ...this.store.getState() }, 'explanation'); 
    }
    
    _handleCorrectionResult(fullText) { this._handleExplanationResult(fullText, false); }
    
    _formatQuestionContent(content) {
        if (!content) return '';
        
        const parts = content.split('Options:');
        const question = parts[0].replace(/Question:/i, '### Question\n');
        let options = '';

        if (parts.length > 1) {
            const optionLines = parts[1].trim().split('\n');
            const formattedOptions = optionLines.map(line => {
                // Robustly find the text after the hyphen
                const textMatch = line.match(/^\s*-\s*(.*)/);
                if (!textMatch) return ''; // Skip empty or malformed lines
                
                const optionText = textMatch[1].trim();
                // Check if the option looks like code and wrap it in backticks
                if (optionText.includes('<') && optionText.includes('>')) {
                    return `- \`${optionText}\``;
                }
                return `- ${optionText}`; // Return as plain text if not code
            }).filter(Boolean).join('\n');
            options = '\n### Options\n' + formattedOptions;
        }

        const reconstructedContent = question + options;
        return DOMPurify.sanitize(marked.parse(reconstructedContent));
    }
    
    _renderInlineMarkdown(text) {
        if (!text) return '';
        const parsed = marked.parse(text);
        return DOMPurify.sanitize(parsed.replace(/^<p>|<\/p>$/g, ''));
    }

    _renderCorrectionOptions(options) { 
        const state = this.store.getState();
        this.elements.correctionOptions.innerHTML = ''; 
        options.forEach(optionText => { 
            const button = document.createElement('button'); 
            button.className = 'correction-option-button'; 
            button.innerHTML = _escapeHtml(optionText); 
            button.addEventListener('click', () => { 
                const correctionContent = `The original quiz content was:\n${state.cleanedContent}\n\nMy previous incorrect answer was: \`${state.incorrectAnswer}\`\n\nThe user has indicated the correct answer is: \`${optionText}\``; 
                this.elements.correctionPanel.classList.add('hidden'); 
                this.elements.explanationContainer.classList.remove('hidden'); 
                this._renderLoadingState(this.elements.explanationDisplay);
                this._callGeminiStream('correction', correctionContent); 
            }); 
            this.elements.correctionOptions.appendChild(button); 
        }); 
    }

    _toggleReasoningDisplay() {
        const state = this.store.getState();
        const reasoningDisplay = this.elements.reasoningDisplay;
        const button = this.elements.showReasoningButton;
        const isHidden = reasoningDisplay.classList.toggle('hidden');
        button.classList.toggle('active', !isHidden);
        if (!isHidden && state.thoughtProcess) {
            reasoningDisplay.innerHTML = `<h3>AI Reasoning</h3>${DOMPurify.sanitize(marked.parse(state.thoughtProcess))}`;
        }
    }

    _resetFeedbackButtons() { 
        this.elements.feedbackCorrect.disabled = false; 
        this.elements.feedbackIncorrect.disabled = false; 
        this.elements.feedbackCorrect.classList.remove('selected-correct'); 
        this.elements.feedbackIncorrect.classList.remove('selected-incorrect'); 
    }

    _copyToClipboard(button) { 
        const textToCopy = button.dataset.copyText; 
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => { 
                const originalTitle = button.title; 
                button.title = 'Copied!'; 
                button.classList.add('copied'); 
                setTimeout(() => { 
                    button.classList.remove('copied'); 
                    button.title = originalTitle; 
                }, 1500); 
            }); 
        }
    }

    _getPersistedState() { 
        const { tab } = this.store.getState();
        return tab ? StorageManager.local.get(tab.id.toString()).then(r => r[tab.id.toString()] || null) : Promise.resolve(null); 
    }
    
    _clearPersistedState() { 
        const { tab } = this.store.getState();
        return tab ? StorageManager.local.remove(tab.id.toString()) : Promise.resolve(null); 
    }
    
    _saveCurrentViewState() { 
        const state = this.store.getState();
        if (!state.tab) return; 
        const key = state.tab.id.toString(); 
        const stateToSave = { ...state };
        delete stateToSave.tab;
        delete stateToSave.config;
        StorageManager.local.set({ [key]: stateToSave }); 
    }

    async _saveToHistory(stateData, actionType) { 
        const state = this.store.getState();
        if (!state.tab) return; 
        const { history = [] } = await StorageManager.local.get('history'); 
        const newEntry = { ...stateData, id: Date.now(), url: state.tab.url, title: state.tab.title, timestamp: new Date().toISOString(), actionType }; 
        history.unshift(newEntry); 
        if (history.length > 100) history.pop(); 
        await StorageManager.local.set({ history }); 
    }

    _sendMessageToContentScript(message, timeout = 5000) { 
        const { tab } = this.store.getState();
        return new Promise((resolve, reject) => { 
            if (!tab || tab.id === undefined) return reject(new Error("Invalid tab ID.")); 
            const timer = setTimeout(() => reject(new Error('Content script timeout.')), timeout); 
            chrome.tabs.sendMessage(tab.id, message, (response) => { 
                clearTimeout(timer); 
                if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message)); 
                else resolve(response); 
            }); 
        }); 
    }

    _createQuizFingerprint(cleanedContent) { 
        if (!cleanedContent) return null; 
        const lines = cleanedContent.split('\n').map(l => l.trim()).filter(l => l); 
        return lines.length < 2 ? null : lines.map(l => l.toLowerCase().replace(/\s+/g, ' ').trim()).join('\n'); 
    }
    
    _simpleHash(str) { 
        let hash = 0; 
        for (let i = 0; i < str.length; i++) { 
            hash = ((hash << 5) - hash) + str.charCodeAt(i); 
            hash |= 0; 
        } 
        return 'cache_' + new Uint32Array([hash])[0].toString(16); 
    }

    _handleVerification() {
        const state = this.store.getState();
        this.elements.verifyButton.disabled = true;
        this.elements.verifyButton.innerHTML = `<div class="spinner"></div> Verifying...`;
        this.streamAccumulator.answer = '';
        this.streamAccumulator.verification = '';
        this.elements.answerDisplay.innerHTML = '';
        this._renderLoadingState(this.elements.answerDisplay);

        chrome.runtime.sendMessage({
            action: 'verifyAnswerWithSearch',
            payload: {
                cleanedContent: state.cleanedContent,
                initialAnswer: state.incorrectAnswer
            }
        });
    }
}

const app = new PopupApp();
document.addEventListener('DOMContentLoaded', () => {
    app.start();
});