// js/popup.js

/**
 * Fungsi hashing sederhana untuk membuat kunci cache yang unik dan pendek.
 */
function simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return 'cache_' + new Uint32Array([hash])[0].toString(16);
}

// =================================================================
// PEMINDAHAN SEMUA FUNGSI PEMBANTU KE ATAS
// =================================================================

function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

// FUNGSI YANG DIPERBAIKI DENGAN BENAR
function escapeHtml(unsafe) {
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

/**
 * Mengirim pesan ke content script dengan timeout.
 * Mencegah popup hang jika content script tidak merespons.
 */
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
    return trimmed.startsWith('<') && trimmed.endsWith('>');
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
        if (isCode(cleanOption)) {
            return `<li><code>${cleanOption}</code></li>`;
        }
        return `<li>${cleanOption}</li>`;
    }).join('');
    return `<div class="question-text">${question}</div><ul>${optionsHtml}</ul>`;
}

function createQuizFingerprint(cleanedContent) {
    if (!cleanedContent) return null;

    const lines = cleanedContent
        .split('\n')
        .map(l => l.trim())
        .filter(l => l);

    if (lines.length < 2) return null;

    // Gabungkan seluruh lines (soal + opsi) untuk memastikan fingerprint unik
    const normalizedLines = lines.map(l =>
        l.toLowerCase().replace(/\s+/g, ' ').trim()
    );

    const joinedContent = normalizedLines.join('\n');
    return joinedContent;
}


document.addEventListener('DOMContentLoaded', () => {
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            sanitize: true
        });
    }

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
    let currentCacheKey = null;

    function displayMessage(htmlContent, isError = false) {
        hide(resultsWrapper);
        if (isError) {
            messageArea.innerHTML = `<div class="error-message"><strong>Analysis Failed:</strong><br>${htmlContent}</div>`;
        } else {
            messageArea.innerHTML = `<div class="loading-state">${htmlContent}</div>`;
        }
        show(messageArea);
    }

    async function callGeminiStream(purpose, contentText, originalUserContent = '') {
        const { promptProfiles, activeProfile, temperature, selectedModel, geminiApiKey } = appConfig;
        const currentPrompts = (promptProfiles && promptProfiles[activeProfile]) || DEFAULT_PROMPTS;
        
        let systemPrompt = '';
        let userContent = contentText;

        if (purpose.startsWith('rephrase-')) {
            const language = purpose.split('-')[1];
            systemPrompt = currentPrompts.rephrase || DEFAULT_PROMPTS.rephrase;
            userContent = `Target Language: ${language}\n\nText to rephrase:\n${contentText}`;
        } else {
            switch(purpose) {
                case 'cleaning': systemPrompt = currentPrompts.cleaning || DEFAULT_PROMPTS.cleaning; break;
                case 'answer': systemPrompt = currentPrompts.answer || DEFAULT_PROMPTS.answer; break;
                case 'explanation': systemPrompt = currentPrompts.explanation || DEFAULT_PROMPTS.explanation; break;
                case 'summarize': systemPrompt = currentPrompts.summarize || DEFAULT_PROMPTS.summarize; break;
                case 'explain': systemPrompt = currentPrompts.explanation || DEFAULT_PROMPTS.explanation; break;
                case 'translate': systemPrompt = currentPrompts.translate || DEFAULT_PROMPTS.translate; break;
            }
        }

        const generationConfig = { temperature: temperature !== undefined ? temperature : 0.4 };
        
        chrome.runtime.sendMessage({ 
            action: 'callGeminiStream', 
            payload: { 
                apiKey: geminiApiKey,
                model: selectedModel,
                systemPrompt, 
                userContent: userContent,
                generationConfig, 
                originalUserContent,
                purpose
            }
        });
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
        contentDisplay.innerHTML = formatQuestionContent(fullText);
        show(contentDisplayWrapper);
        show(answerContainer);
        answerDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div></div>`;
        saveState({ cleanedContent: fullText }).then(getAnswer);
    }

    async function _handleAnswerResult(fullText, fromCache = false, totalTokenCount = 0) {
        const answerMatch = fullText.match(/Answer:(.*?)(Confidence:|Reason:|$)/is);
        const confidenceMatch = fullText.match(/Confidence:\s*(High|Medium|Low)/i);
        const reasonMatch = fullText.match(/Reason:(.*)/is);
        let answerText = (answerMatch ? answerMatch[1].trim() : fullText.trim()).replace(/`/g, '');
        
        let cleanAnswerText = escapeHtml(answerText);
        let formattedHtml = `<p class="answer-highlight">${isCode(cleanAnswerText) ? `<code>${cleanAnswerText}</code>` : cleanAnswerText.replace(/\n/g, '<br>')}</p>`;
        
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
        if(confidenceWrapperHtml) {
            formattedHtml += `<div class="confidence-wrapper">${confidenceWrapperHtml}</div>`;
        }

        answerDisplay.innerHTML = formattedHtml;
        copyAnswerButton.dataset.copyText = answerText;
        retryAnswerButton.disabled = false;
        show(aiActionsWrapper);
        hide(explanationContainer);
        if (appConfig.autoHighlight) {
            chrome.tabs.sendMessage(currentTab.id, { action: 'highlight-answer', text: [answerText] });
        }
        if (!fromCache && currentCacheKey) {
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);
    const rawQuestion = lines.length > 0 ? lines[0] : '';
    await chrome.storage.local.set({
        [currentCacheKey]: {
            answerHTML: fullText,
            totalTokenCount: totalTokenCount,
            rawQuestion
        }
    });
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

    function _handleContextMenuResult(fullText, originalUserContent, purpose) {
        show(contentDisplayWrapper);
        show(answerContainer);
        contentDisplay.innerHTML = `<div class="question-text">${escapeHtml(originalUserContent)}</div>`;
        answerDisplay.innerHTML = marked.parse(fullText);
        copyAnswerButton.dataset.copyText = fullText;
        hide(aiActionsWrapper);
        hide(explanationContainer);
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
    
    async function initialize() {
        [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!currentTab || !currentTab.id) {
            displayMessage('Cannot find active tab.', true);
            return;
        }
        
        appConfig = await chrome.storage.sync.get(null);
        if (!appConfig.geminiApiKey) { 
            displayMessage('API Key not set. Please go to options page.', true);
            return; 
        }

        try { 
            await chrome.scripting.executeScript({ 
                target: { tabId: currentTab.id }, 
                files: ['js/vendor/marked.min.js', 'js/mark.min.js', 'js/content.js'] 
            }); 

            const isReady = await sendMessageWithTimeout(currentTab.id, { action: "ping_content_script" });

            if (!isReady || !isReady.ready) {
                throw new Error("Content script is not ready. Please reload the page and try again.");
            }

            const contextKey = `context_action_${currentTab.id}`;
            const contextData = (await chrome.storage.local.get(contextKey))[contextKey];

            if (contextData?.action && contextData?.selectionText) {
                await chrome.storage.local.remove(contextKey);
                const displayAction = contextData.action.split('-')[0];
                displayMessage(`<div class="spinner"></div><p>Getting ${displayAction}...</p>`);
                callGeminiStream(contextData.action, contextData.selectionText, contextData.selectionText);
            } else {
                const state = await getState();
                if (state.cleanedContent) {
                    hide(messageArea);
                    show(resultsWrapper);
                    contentDisplay.innerHTML = formatQuestionContent(state.cleanedContent);
                    show(contentDisplayWrapper);
                    show(answerContainer);
                    if (state.answerHTML) {
                        await _handleAnswerResult(state.answerHTML, false, state.totalTokenCount);
                    }
                    if (state.explanationHTML) {
                        _handleExplanationResult(state.explanationHTML);
                    }
                } else {
                    displayMessage(`<div class="spinner"></div><p>Step 1/2: Cleaning content...</p>`);
                    const response = await sendMessageWithTimeout(currentTab.id, { action: "get_page_content" });
                    if (!response || !response.content?.trim()) {
                        throw new Error("No readable content found on this page.");
                    }
                    callGeminiStream('cleaning', response.content);
                }
            }

        } catch (e) { 
            console.error("Initialization failed:", e);
            displayMessage(`This page cannot be scripted or is not ready. Try reloading the page and opening the extension again. <br><small>(${e.message})</small>`, true); 
        }
    }

    settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
    rescanButton.addEventListener('click', async () => {
        if (!currentTab) return;
        await chrome.storage.local.remove(currentTab.id.toString());
        initialize();
    });
    explanationButton.addEventListener('click', getExplanation);
    retryAnswerButton.addEventListener('click', getAnswer);
    retryExplanationButton.addEventListener('click', getExplanation);
    
    chrome.runtime.onMessage.addListener((request, sender) => {
        if (sender.tab || request.action !== 'geminiStreamUpdate') return;
        const { payload, purpose } = request;
        hide(messageArea);
        show(resultsWrapper);
        
        let targetDisplay;
        if (purpose === 'cleaning') targetDisplay = contentDisplay;
        else if (purpose.includes('answer')) targetDisplay = answerDisplay;
        else if (purpose === 'explanation') targetDisplay = explanationDisplay;
        else targetDisplay = answerDisplay;

        if (payload.success) {
            if (payload.chunk) {
                if (targetDisplay?.querySelector('.loading-state')) targetDisplay.innerHTML = '';
                if (targetDisplay) targetDisplay.textContent += payload.chunk;
            } else if (payload.done) {
                const fullText = payload.fullText || (targetDisplay ? targetDisplay.textContent : '');
                switch(purpose) {
                    case 'cleaning': _handleCleaningResult(fullText); break;
                    case 'answer': _handleAnswerResult(fullText, false, payload.totalTokenCount); break;
                    case 'explanation': _handleExplanationResult(fullText); break;
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
        } else {
            displayMessage(escapeHtml(payload.error), true);
        }
    });

    initialize();
});