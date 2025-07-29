// js/popup.js

function simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return 'cache_' + new Uint32Array([hash])[0].toString(16);
}

function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function sendMessageWithTimeout(tabId, message, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Content script did not respond in time. Please reload the page.'));
        }, timeout);

        chrome.tabs.sendMessage(tabId, message, (response) => {
            clearTimeout(timer);
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message || 'Failed to communicate with the page. Try reloading the page.'));
            } else {
                resolve(response);
            }
        });
    });
}

function isCode(str) {
    const trimmed = String(str).trim();
    return trimmed.startsWith('<') && trimmed.endsWith('>') || trimmed.includes('(') || trimmed.includes('{');
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
        options = optionsString.split('\n')
            .map(opt => opt.trim().replace(/^[\*\-•]\s*|\d+\.\s*|[a-zA-Z]\)\s*/, ''))
            .filter(opt => opt);
    } else {
        const lines = content.split('\n').filter(line => line.trim() !== '');
        question = lines.shift() || '';
        options = lines;
    }
    question = escapeHtml(question.replace(/^Question:\s*/i, '').trim());
    const optionsHtml = options.map(option => {
        const cleanOption = escapeHtml(option.trim());
        return `<li>${cleanOption}</li>`;
    }).join('');
    return `<div class="question-text">${question}</div><ul>${optionsHtml}</ul>`;
}

function createQuizFingerprint(cleanedContent) {
    if (!cleanedContent) return null;
    const lines = cleanedContent.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return null;
    const normalizedLines = lines.map(l => l.toLowerCase().replace(/\s+/g, ' ').trim());
    const joinedContent = normalizedLines.join('\n');
    return joinedContent;
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof marked !== 'undefined') {
        marked.setOptions({ sanitize: true });
    }

    const settingsButton = document.getElementById('settingsButton');
    const analyzePageButton = document.getElementById('analyzePageButton');
    const rescanButton = document.getElementById('rescanButton');
    const explanationButton = document.getElementById('explanationButton');
    const aiActionsWrapper = document.getElementById('aiActionsWrapper');
    const pageSummaryContainer = document.getElementById('pageSummaryContainer');
    const quizModeContainer = document.getElementById('quizModeContainer');
    const contentDisplayWrapper = document.getElementById('contentDisplayWrapper');
    const contentDisplay = document.getElementById('contentDisplay');
    const answerContainer = document.getElementById('answerContainer');
    const answerDisplay = document.getElementById('answerDisplay');
    const explanationContainer = document.getElementById('explanationContainer');
    const explanationDisplay = document.getElementById('explanationDisplay');
    const messageArea = document.getElementById('messageArea');
    const retryAnswerButton = document.getElementById('retryAnswer');
    const retryExplanationButton = document.getElementById('retryExplanation');
    const copyAnswerButton = document.getElementById('copyAnswer');
    const copyExplanationButton = document.getElementById('copyExplanation');
    const feedbackContainer = document.getElementById('feedbackContainer');
    const feedbackCorrectBtn = document.getElementById('feedbackCorrect');
    const feedbackIncorrectBtn = document.getElementById('feedbackIncorrect');
    const correctionPanel = document.getElementById('correctionPanel');
    const correctionOptionsContainer = document.getElementById('correctionOptions');

    let currentTab = null;
    let appConfig = {};
    let currentCacheKey = null;
    let currentIncorrectAnswer = null;

    function displayInfoPanel(title, message) {
        hide(quizModeContainer);
        hide(pageSummaryContainer);
        show(messageArea);
        const infoHtml = `<div class="info-panel"><div class="info-panel-header">${title}</div><div class="info-panel-body"><p>${message}</p></div></div>`;
        messageArea.innerHTML = infoHtml;
    }

    async function displayError(error) {
        hide(quizModeContainer);
        hide(pageSummaryContainer);
        show(messageArea);
        let title = 'An Error Occurred';
        let userMessage = 'Something went wrong. Please try again.';
        let actionsHtml = `<button id="error-retry-btn" class="button-error">Try Again</button>`;
        const state = await getState();
        const query = state.cleanedContent || state.originalUserContent || '';
        switch (error.type) {
            case 'INVALID_API_KEY': title = 'Invalid API Key'; userMessage = 'The provided API key is not valid or has been revoked. Please check your key in the settings.'; actionsHtml = `<button id="error-settings-btn" class="button-error primary">Open Settings</button>`; break;
            case 'QUOTA_EXCEEDED': title = 'API Quota Exceeded'; userMessage = 'You have exceeded your Google AI API quota. Please check your usage and billing in the Google AI Studio.'; actionsHtml = `<button id="error-quota-btn" class="button-error">Check Quota</button> <button id="error-retry-btn" class="button-error">Try Again</button>`; break;
            case 'NETWORK_ERROR': title = 'Network Error'; userMessage = 'Could not connect to the API. Please check your internet connection.'; break;
            case 'INTERNAL_ERROR': title = 'Connection Failed'; userMessage = 'Could not connect to the current page. Some pages may not be compatible.'; break;
            case 'INVALID_JSON': title = 'Analysis Failed'; userMessage = 'The AI returned an invalid response. You can try again.'; break;
            case 'API_ERROR': default: title = 'API Error'; userMessage = 'The API returned an error. See details below.'; if (query) actionsHtml += ` <button id="error-google-btn" class="button-error">Search on Google</button>`; break;
        }
        const errorHtml = `<div class="error-panel"><div class="error-panel-header">${title}</div><div class="error-panel-body"><p>${userMessage}</p><details class="error-details"><summary>Technical Details</summary><code>${escapeHtml(error.message)}</code></details></div><div class="error-panel-actions">${actionsHtml}</div></div>`;
        messageArea.innerHTML = errorHtml;
        document.getElementById('error-retry-btn')?.addEventListener('click', initialize);
        document.getElementById('error-settings-btn')?.addEventListener('click', () => chrome.runtime.openOptionsPage());
        document.getElementById('error-quota-btn')?.addEventListener('click', () => chrome.tabs.create({ url: 'https://aistudio.google.com/billing' }));
        document.getElementById('error-google-btn')?.addEventListener('click', () => { if (!query) return; const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`; chrome.tabs.create({ url: searchUrl }); });
    }

    function displayMessage(htmlContent) {
        hide(quizModeContainer);
        hide(pageSummaryContainer);
        messageArea.innerHTML = `<div class="loading-state">${htmlContent}</div>`;
        show(messageArea);
    }

    async function callGeminiStream(purpose, contentText, originalUserContent = '') {
        const { promptProfiles, activeProfile, selectedModel, geminiApiKey } = appConfig;
        const currentPrompts = (promptProfiles && promptProfiles[activeProfile]) || DEFAULT_PROMPTS;
        let systemPrompt = '';
        let userContent = contentText;
        switch (purpose) {
            case 'cleaning': systemPrompt = currentPrompts.cleaning || DEFAULT_PROMPTS.cleaning; break;
            case 'answer': systemPrompt = currentPrompts.answer || DEFAULT_PROMPTS.answer; break;
            case 'explanation': systemPrompt = currentPrompts.explanation || DEFAULT_PROMPTS.explanation; break;
            case 'correction': systemPrompt = currentPrompts.correction || DEFAULT_PROMPTS.correction; break;
            case 'pageAnalysis': systemPrompt = currentPrompts.pageAnalysis || DEFAULT_PROMPTS.pageAnalysis; break;
            case 'summarize': systemPrompt = currentPrompts.summarize || DEFAULT_PROMPTS.summarize; break;
            case 'explain': systemPrompt = currentPrompts.explanation || DEFAULT_PROMPTS.explanation; break;
            case 'translate': systemPrompt = currentPrompts.translate || DEFAULT_PROMPTS.translate; break;
            default: if (purpose.startsWith('rephrase-')) { const language = purpose.split('-')[1]; systemPrompt = currentPrompts.rephrase || DEFAULT_PROMPTS.rephrase; userContent = `Target Language: ${language}\n\nText to rephrase:\n${contentText}`; } break;
        }
        chrome.runtime.sendMessage({ action: 'callGeminiStream', payload: { apiKey: geminiApiKey, model: selectedModel, systemPrompt, userContent, generationConfig: {}, originalUserContent, purpose } });
    }

    async function getAnswer() {
        const state = await getState();
        if (!state.cleanedContent) return;
        const fingerprint = createQuizFingerprint(state.cleanedContent);
        if (fingerprint) {
            currentCacheKey = simpleHash(fingerprint);
            const cachedResult = (await chrome.storage.local.get(currentCacheKey))[currentCacheKey];
            const lines = state.cleanedContent.split('\n').map(l => l.trim()).filter(l => l);
            const rawQuestion = lines.length > 0 ? lines[0] : '';
            if (cachedResult?.answerHTML && cachedResult.rawQuestion === rawQuestion) {
                await _handleAnswerResult(cachedResult.answerHTML, true, cachedResult.totalTokenCount);
                return;
            }
        }
        retryAnswerButton.disabled = true;
        answerDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div></div>`;
        callGeminiStream('answer', state.cleanedContent);
    }

    async function getExplanation() {
        const state = await getState();
        if (!state.cleanedContent) return;
        explanationButton.disabled = true;
        retryExplanationButton.disabled = true;
        show(explanationContainer);
        explanationDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div></div>`;
        callGeminiStream('explanation', state.cleanedContent);
    }

    function _handleCleaningResult(fullText) {
        hide(messageArea);
        show(quizModeContainer);
        show(contentDisplayWrapper);
        show(answerContainer);
        contentDisplay.innerHTML = formatQuestionContent(fullText);
        answerDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div></div>`;
        saveState({ cleanedContent: fullText }).then(getAnswer);
    }

    async function _handleAnswerResult(fullText, fromCache = false, totalTokenCount = 0) {
        const answerMatch = fullText.match(/Answer:(.*?)(Confidence:|Reason:|$)/is);
        const confidenceMatch = fullText.match(/Confidence:\s*(High|Medium|Low)/i);
        const reasonMatch = fullText.match(/Reason:(.*)/is);
        let answerText = (answerMatch ? answerMatch[1].trim() : fullText.trim()).replace(/`/g, '');
        let cleanAnswerText = escapeHtml(answerText);
        let formattedHtml = `<p class="answer-highlight">${cleanAnswerText.replace(/\n/g, '<br>')}</p>`;
        let confidenceWrapperHtml = '';
        if (confidenceMatch) {
            const confidence = confidenceMatch[1].toLowerCase();
            const reason = reasonMatch ? reasonMatch[1].trim() : "";
            confidenceWrapperHtml += `<div class="confidence-level"><span class="confidence-level-label">Confidence ${fromCache ? '<span>⚡️ Cached</span>' : ''}</span><span class="confidence-badge confidence-${confidence}">${confidence.charAt(0).toUpperCase() + confidence.slice(1)}</span></div>${reason ? `<div class="confidence-reason">${escapeHtml(reason)}</div>` : ''}`;
        } else if (fromCache) {
            confidenceWrapperHtml += `<div class="confidence-level"><span class="confidence-level-label">⚡️ From Cache</span></div>`;
        }
        if (totalTokenCount > 0) {
            confidenceWrapperHtml += `<div class="token-count"><span class="token-count-label">Tokens Used</span><span class="token-count-value">${totalTokenCount}</span></div>`;
        }
        if (confidenceWrapperHtml) {
            formattedHtml += `<div class="confidence-wrapper">${confidenceWrapperHtml}</div>`;
        }
        answerDisplay.innerHTML = formattedHtml;
        copyAnswerButton.dataset.copyText = answerText;
        retryAnswerButton.disabled = false;
        show(aiActionsWrapper);
        hide(explanationContainer);
        hide(correctionPanel);
        show(feedbackContainer);
        resetFeedbackButtons();
        currentIncorrectAnswer = answerText;

        if (appConfig.autoHighlight) {
            chrome.tabs.sendMessage(currentTab.id, { action: 'highlight-answer', text: [answerText] });
        }
        if (!fromCache && currentCacheKey) {
            const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);
            const rawQuestion = lines.length > 0 ? lines[0] : '';
            await chrome.storage.local.set({ [currentCacheKey]: { answerHTML: fullText, totalTokenCount: totalTokenCount, rawQuestion } });
        }
        await saveState({ answerHTML: fullText, totalTokenCount });
        if (!fromCache) {
            const state = await getState();
            saveToHistory({ cleanedContent: state.cleanedContent, answerHTML: fullText }, 'quiz');
        }
    }

    async function _handleExplanationResult(fullText) {
        explanationDisplay.innerHTML = marked.parse(fullText);
        copyExplanationButton.dataset.copyText = fullText;
        explanationButton.disabled = false;
        retryExplanationButton.disabled = false;
        show(explanationContainer);
        const state = await getState();
        saveToHistory({ ...state, explanationHTML: fullText }, 'explanation');
    }

    async function _handleCorrectionResult(fullText) {
        explanationDisplay.innerHTML = marked.parse(fullText);
        copyExplanationButton.dataset.copyText = fullText;
        explanationButton.disabled = false;
        retryExplanationButton.disabled = false;
        show(explanationContainer);
        const state = await getState();
        saveToHistory({ ...state, explanationHTML: fullText }, 'correction');
    }

    function _handleContextMenuResult(fullText, originalUserContent, purpose) {
        hide(pageSummaryContainer);
        show(quizModeContainer);
        show(contentDisplayWrapper);
        show(answerContainer);
        contentDisplay.innerHTML = `<div class="question-text">${escapeHtml(originalUserContent)}</div>`;
        answerDisplay.innerHTML = marked.parse(fullText);
        copyAnswerButton.dataset.copyText = fullText;
        hide(aiActionsWrapper);
        hide(explanationContainer);
        hide(feedbackContainer);
        const historyActionType = purpose.split('-')[0];
        saveToHistory({ cleanedContent: originalUserContent, answerHTML: fullText }, historyActionType);
    }

    async function getState() {
        if (!currentTab) return {};
        const key = currentTab.id.toString();
        return (await chrome.storage.local.get(key))[key] || {};
    }

    async function saveState(data) {
        if (!currentTab) return;
        const key = currentTab.id.toString();
        const currentState = await getState();
        const newState = { ...currentState, ...data };
        await chrome.storage.local.set({ [key]: newState });
    }

    async function saveToHistory(stateData, actionType) {
        const { history = [] } = await chrome.storage.local.get('history');
        const newEntry = { ...stateData, id: Date.now(), url: currentTab.url, title: currentTab.title, timestamp: new Date().toISOString(), actionType };
        history.unshift(newEntry);
        if (history.length > 100) history.pop();
        await chrome.storage.local.set({ history });
    }

    function resetFeedbackButtons() {
        feedbackCorrectBtn.disabled = false;
        feedbackIncorrectBtn.disabled = false;
        feedbackCorrectBtn.classList.remove('selected-correct');
        feedbackIncorrectBtn.classList.remove('selected-incorrect');
    }

    async function handleIncorrectFeedback() {
        feedbackIncorrectBtn.disabled = true;
        feedbackCorrectBtn.disabled = true;
        feedbackIncorrectBtn.classList.add('selected-incorrect');

        hide(aiActionsWrapper);
        show(correctionPanel);
        correctionOptionsContainer.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Fetching options...</p></div>`;

        try {
            const response = await sendMessageWithTimeout(currentTab.id, { action: "get_quiz_options" });
            if (response && response.options && response.options.length > 0) {
                renderCorrectionOptions(response.options);
            } else {
                correctionOptionsContainer.innerHTML = '<p class="text-center">Could not automatically find options on the page.</p>';
            }
        } catch (e) {
            correctionOptionsContainer.innerHTML = `<p class="text-center">Error fetching options: ${e.message}</p>`;
        }
    }

    function renderCorrectionOptions(options) {
        correctionOptionsContainer.innerHTML = '';
        options.forEach(optionText => {
            const button = document.createElement('button');
            button.className = 'correction-option-button';
            button.innerHTML = escapeHtml(optionText);

            button.addEventListener('click', async () => {
                const state = await getState();
                const userCorrectAnswer = optionText;
                const correctionContent = `The original quiz content was:\n${state.cleanedContent}\n\nMy previous incorrect answer was: \`${currentIncorrectAnswer}\`\n\nThe user has indicated the correct answer is: \`${userCorrectAnswer}\``;
                hide(correctionPanel);
                show(explanationContainer);
                explanationDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div><p>Generating corrected explanation...</p></div>`;
                callGeminiStream('correction', correctionContent);
            });
            correctionOptionsContainer.appendChild(button);
        });
    }

    function renderPageSummary(data) {
        hide(messageArea);
        hide(quizModeContainer);
        show(pageSummaryContainer);
        const tldrHtml = data.tldr ? `<div class="summary-section summary-tldr"><h3 class="summary-section-title">TL;DR</h3><p>${escapeHtml(data.tldr)}</p></div>` : '';
        const takeawaysHtml = (data.takeaways && data.takeaways.length > 0) ? `<div class="summary-section summary-takeaways"><h3 class="summary-section-title">Key Takeaways</h3><ul>${data.takeaways.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : '';
        const renderEntities = (entities, label) => (entities && entities.length > 0) ? `<div class="entity-group"><span class="entity-label">${label}</span><div class="entity-tags">${entities.map(e => `<span class="entity-tag">${escapeHtml(e)}</span>`).join('')}</div></div>` : '';
        const entitiesHtml = (data.entities && (data.entities.people?.length || data.entities.organizations?.length || data.entities.locations?.length)) ? `<div class="summary-section summary-entities"><h3 class="summary-section-title">Entities Mentioned</h3>${renderEntities(data.entities.people, 'People')}${renderEntities(data.entities.organizations, 'Organizations')}${renderEntities(data.entities.locations, 'Locations')}</div>` : '';
        pageSummaryContainer.innerHTML = tldrHtml + takeawaysHtml + entitiesHtml;
    }

    async function handlePageAnalysis() {
        displayMessage(`<div class="spinner"></div><p>Analyzing the entire page...</p>`);
        try {
            const response = await sendMessageWithTimeout(currentTab.id, { action: "get_page_content" });
            if (!response || !response.content?.trim()) {
                throw new Error("No readable content found on this page.");
            }
            callGeminiStream('pageAnalysis', response.content);
        } catch (e) {
            displayError({ type: 'INTERNAL_ERROR', message: e.message });
        }
    }

    async function initialize() {
        [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!currentTab || !currentTab.id) {
            displayError({ type: 'INTERNAL_ERROR', message: 'Cannot find the active tab.' });
            return;
        }
        const protectedUrls = ['chrome://', 'https://chrome.google.com/'];
        if (protectedUrls.some(url => currentTab.url.startsWith(url))) {
            displayInfoPanel('Page Not Supported', 'For your security, Chrome extensions cannot run on this special page.');
            return;
        }
        appConfig = await chrome.storage.sync.get(null);
        if (!appConfig.geminiApiKey) {
            displayError({ type: 'INVALID_API_KEY', message: 'API Key not set. Please go to the options page to set it up.' });
            return;
        }

        try {
            await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files: ['js/vendor/marked.min.js', 'js/mark.min.js', 'js/content.js'] });
            await sendMessageWithTimeout(currentTab.id, { action: "ping_content_script" });
            const contextKey = `context_action_${currentTab.id}`;
            const contextData = (await chrome.storage.local.get(contextKey))[contextKey];
            if (contextData?.action && contextData?.selectionText) {
                hide(pageSummaryContainer);
                show(quizModeContainer);
                await chrome.storage.local.remove(contextKey);
                const displayAction = contextData.action.split('-')[0];
                displayMessage(`<div class="spinner"></div><p>Getting ${displayAction}...</p>`);
                saveState({ originalUserContent: contextData.selectionText });
                callGeminiStream(contextData.action, contextData.selectionText, contextData.selectionText);
            } else {
                hide(pageSummaryContainer);
                show(quizModeContainer);
                const state = await getState();
                if (state.cleanedContent) {
                    hide(messageArea);
                    show(contentDisplayWrapper);
                    show(answerContainer);
                    contentDisplay.innerHTML = formatQuestionContent(state.cleanedContent);
                    if (state.answerHTML) {
                        await _handleAnswerResult(state.answerHTML, false, state.totalTokenCount);
                    } else {
                        getAnswer();
                    }
                    if (state.explanationHTML) {
                        await _handleExplanationResult(state.explanationHTML);
                    }
                } else {
                    displayMessage(`<div class="spinner"></div><p>Scanning for quiz...</p>`);
                    const response = await sendMessageWithTimeout(currentTab.id, { action: "get_page_content" });
                    if (!response || !response.content?.trim()) {
                        throw new Error("No readable content found on this page.");
                    }
                    saveState({ originalUserContent: response.content });
                    callGeminiStream('cleaning', response.content);
                }
            }
        } catch (e) {
            console.error("Initialization failed:", e);
            displayError({ type: 'INTERNAL_ERROR', message: `Could not establish connection. ${e.message}` });
        }
    }

    settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
    analyzePageButton.addEventListener('click', handlePageAnalysis);
    rescanButton.addEventListener('click', async () => {
        if (!currentTab) return;
        await chrome.storage.local.remove(currentTab.id.toString());
        hide(pageSummaryContainer);
        show(quizModeContainer);
        initialize();
    });
    explanationButton.addEventListener('click', getExplanation);
    retryAnswerButton.addEventListener('click', getAnswer);
    retryExplanationButton.addEventListener('click', getExplanation);
    feedbackCorrectBtn.addEventListener('click', () => {
        feedbackCorrectBtn.disabled = true;
        feedbackIncorrectBtn.disabled = true;
        feedbackCorrectBtn.classList.add('selected-correct');
    });
    feedbackIncorrectBtn.addEventListener('click', handleIncorrectFeedback);

    let streamAccumulator = {};
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action !== 'geminiStreamUpdate') return;
        const { payload, purpose } = request;
        if (!payload.success) { displayError(payload.error); return; }

        if (purpose === 'pageAnalysis') {
            const targetDisplay = messageArea.querySelector('.loading-state');
            if (payload.chunk) {
                if (targetDisplay) {
                    if (!targetDisplay.dataset.fullText) targetDisplay.dataset.fullText = '';
                    targetDisplay.dataset.fullText += payload.chunk;
                }
            } else if (payload.done) {
                const fullText = (payload.fullText || targetDisplay?.dataset.fullText || '').replace(/```json|```/g, '').trim();
                try {
                    const jsonData = JSON.parse(fullText);
                    renderPageSummary(jsonData);
                } catch (e) {
                    displayError({ type: 'INVALID_JSON', message: `Failed to parse AI response. Details: ${e.message}\n\nReceived: ${fullText}` });
                }
            }
            return;
        }

        hide(messageArea);
        show(quizModeContainer);

        if (payload.chunk && !streamAccumulator[purpose]) {
            streamAccumulator[purpose] = '';
        }

        if (payload.chunk) {
            streamAccumulator[purpose] += payload.chunk;
        }

        if (payload.done) {
            const fullText = payload.fullText || streamAccumulator[purpose] || '';
            delete streamAccumulator[purpose];

            switch (purpose) {
                case 'cleaning': _handleCleaningResult(fullText); break;
                case 'answer': _handleAnswerResult(fullText, false, payload.totalTokenCount); break;
                case 'explanation': _handleExplanationResult(fullText); break;
                case 'correction': _handleCorrectionResult(fullText); break;
                case 'summarize': case 'explain': case 'translate':
                    _handleContextMenuResult(fullText, payload.originalUserContent, purpose);
                    break;
                default:
                    if (purpose.startsWith('rephrase-')) {
                        _handleContextMenuResult(fullText, payload.originalUserContent, purpose);
                    }
                    break;
            }
        }
    });

    initialize();
});