// js/popup.js

document.addEventListener('DOMContentLoaded', async function () {
    // --- PROMPTS are now loaded from prompts.js and accessed via the global DEFAULT_PROMPTS object ---
    
    // --- DOM Elements ---
    const container = document.querySelector('.container');
    const settingsButton = document.getElementById('settingsButton');
    const historyButton = document.getElementById('historyButton');
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
    const retryAnswerButton = document.getElementById('retryAnswer');
    const retryExplanationButton = document.getElementById('retryExplanation');
    const loadingSpinner = document.querySelector('.loading-spinner'); 

    // --- Global Variables ---
    let currentTab = null;
    let appConfig = {};
    let hideToastTimeout = null; 

    // --- Helper & Utility Functions ---
    function show(element) { if (element) element.classList.remove('hidden'); }
    function hide(element) { if (element) element.classList.add('hidden'); }
    function escapeHtml(unsafe) { return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

    function displayToast(message, type = 'error', duration = 5000) {
        clearTimeout(hideToastTimeout);
        hide(contentDisplayWrapper); hide(answerContainer); hide(explanationContainer); hide(aiActionsWrapper); hide(loadingSpinner);
        messageArea.innerHTML = `<div class="toast-notification toast-${type}">${message}</div>`;
        show(messageArea);
        hideToastTimeout = setTimeout(() => { hide(messageArea); }, duration);
    }

    function formatAIResponse(text) {
        let processedText = String(text).replace(/CODE_BLOCK_START\n([\s\S]*?)\nCODE_BLOCK_END/g, '```\n$1\n```').replace(/CODE_BLOCK_START/g, '`').replace(/CODE_BLOCK_END/g, '`');
        processedText = escapeHtml(processedText).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/^\s*[\*\-]\s(.*)/gm, '<li>$1</li>');
        processedText = processedText.replace(/<\/li>\s*<li>/g, '</li><li>');
        const listRegex = /(<ul><li>.*?<\/li><\/ul>)|(<li>.*<\/li>)/s;
        if (!processedText.startsWith('<ul>') && listRegex.test(processedText)) { processedText = processedText.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>'); }
        processedText = processedText.replace(/\n/g, '<br>');
        const codeBlocks = processedText.match(/```[\s\S]*?```/g) || [];
        codeBlocks.forEach(block => {
            const language = (block.match(/^```(\w+)\n/) || [])[1] || '';
            const cleanCode = block.replace(/^```\w*\n|```$/g, '');
            const codeHtml = `<div class="code-block-wrapper"><button class="copy-code-button" title="Copy Code Snippet"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span></button><pre><code class="language-${language}">${escapeHtml(cleanCode.trim())}</code></pre></div>`;
            processedText = processedText.replace(block, codeHtml);
        });
        return processedText.replace(/<br>\s*<ul>/g, '<ul>').replace(/<\/ul>\s*<br>/g, '</ul>');
    }

    function prepareTextForHighlight(text) {
        let highlightCandidates = [];
        let cleanedText = String(text).replace(/CODE_BLOCK_START\n([\s\S]*?)\nCODE_BLOCK_END/g, '$1').replace(/`([^`]+)`/g, '$1').trim();
        if (cleanedText.length > 0) highlightCandidates.push(cleanedText);
        const htmlTagRegex = /^<([a-z][a-z0-9]*)\b[^>]*>$/i;
        const tagMatch = cleanedText.match(htmlTagRegex);
        if (tagMatch) {
            const tagName = tagMatch[1];
            highlightCandidates.push(`&lt;${tagName}&gt;`);
            highlightCandidates.push(tagName);
        }
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanedText;
        const decodedText = tempDiv.textContent || '';
        if (decodedText !== cleanedText && decodedText.length > 0) {
            highlightCandidates.push(decodedText);
            const decodedTagMatch = decodedText.match(htmlTagRegex);
            if (decodedTagMatch) highlightCandidates.push(decodedTagMatch[1]);
        }
        return [...new Set(highlightCandidates.filter(c => c && c.trim().length > 0))];
    }

    function callGeminiStream(prompt, contentText, purpose, originalUserContent = '') {
        const generationConfig = { temperature: appConfig.temperature !== undefined ? appConfig.temperature : 0.4 };
        show(loadingSpinner);
        chrome.runtime.sendMessage({ action: 'callGeminiStream', payload: { systemPrompt: prompt, userContent: contentText, generationConfig, originalUserContent }, purpose: purpose });
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
        const newEntry = { id: Date.now(), cleanedContent: stateData.cleanedContent, answerHTML: stateData.answerHTML, explanationHTML: stateData.explanationHTML || '', url: currentTab.url, title: currentTab.title, timestamp: new Date().toISOString(), actionType: contextActionType || 'quiz' };
        history.unshift(newEntry);
        if (history.length > 100) history.pop();
        await chrome.storage.local.set({ history });
    }

    function restoreUiFromState(state) {
        hide(messageArea);
        hide(loadingSpinner);
        if (state.cleanedContent) { contentDisplay.innerHTML = formatAIResponse(state.cleanedContent); show(contentDisplayWrapper); }
        if (state.answerHTML) { answerDisplay.innerHTML = state.answerHTML; show(answerContainer); show(aiActionsWrapper); }
        if (state.explanationHTML) { explanationDisplay.innerHTML = formatAIResponse(state.explanationHTML); show(explanationContainer); }
    }

    async function runInitialScan(contentFromContextMenu = null, contextActionType = null) {
        hide(contentDisplayWrapper); hide(answerContainer); hide(explanationContainer); hide(aiActionsWrapper);
        show(messageArea); show(loadingSpinner);
        
        let textToProcess;
        let selectedPrompt;
        let purpose = 'quiz_answer';
        let originalSelectedTextForContext = contentFromContextMenu;

        try {
            if (contentFromContextMenu && contextActionType) {
                textToProcess = contentFromContextMenu;
                const customPrompts = appConfig.customPrompts || {};
                
                switch (contextActionType) {
                    case 'summarize': selectedPrompt = customPrompts.summarize || DEFAULT_PROMPTS.summarize; purpose = 'summarize_action'; break;
                    case 'explain': selectedPrompt = customPrompts.explain_context || DEFAULT_PROMPTS.explanation; purpose = 'explain_action'; break;
                    case 'translate': selectedPrompt = customPrompts.translate || DEFAULT_PROMPTS.translate; purpose = 'translate_action'; break;
                    case 'rephrase':
                        selectedPrompt = customPrompts.rephrase || DEFAULT_PROMPTS.rephrase;
                        purpose = 'rephrase_action';
                        const targetLanguages = appConfig.rephraseLanguages || 'English, Indonesian';
                        textToProcess = `Target languages: ${targetLanguages}\n\nText to rephrase:\n${contentFromContextMenu}`;
                        break;
                    default: selectedPrompt = customPrompts.answer || DEFAULT_PROMPTS.answer; purpose = 'quiz_answer';
                }
                messageArea.innerHTML = `<div class="loading-message">Getting ${contextActionType} for selected text...</div>`;
            } else {
                messageArea.innerHTML = `<div class="loading-message">Step 1/2: Cleaning content...</div>`;
                const response = await new Promise((resolve, reject) => {
                    chrome.tabs.sendMessage(currentTab.id, { action: "get_page_content" }, (res) => {
                        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                        else resolve(res);
                    });
                });
                if (!response || !response.content) throw new Error("Tidak ada konten yang dapat dibaca ditemukan di halaman.");
                textToProcess = response.content;
                if (!textToProcess.trim()) throw new Error("Tidak ada konten yang dapat dibaca ditemukan di halaman.");
                selectedPrompt = appConfig.customPrompts?.cleaning || DEFAULT_PROMPTS.cleaning;
                purpose = 'cleaning';
            }
            if (appConfig.responseTone && appConfig.responseTone !== 'normal' && purpose !== 'cleaning') {
                const toneInstructions = { sederhana: "\n\nExplain it simply.", teknis: "\n\nProvide a technical explanation.", analogi: "\n\nUse Analogies." };
                selectedPrompt += toneInstructions[appConfig.responseTone] || '';
            }
            callGeminiStream(selectedPrompt, textToProcess, purpose, originalSelectedTextForContext);
        } catch (error) {
            displayToast(`<strong>Analisis Gagal:</strong> ${escapeHtml(error.message || 'Terjadi kesalahan tidak dikenal.')}`, 'error');
        }
    }

    function getAnswer() {
        chrome.storage.local.get(currentTab.id.toString(), (result) => {
            const cleanedContent = result[currentTab.id.toString()]?.cleanedContent;
            if (!cleanedContent) { displayToast(`<strong>Error:</strong> Konten yang dibersihkan tidak ditemukan.`, 'error'); retryAnswerButton.disabled = false; return; }
            retryAnswerButton.disabled = true;
            let prompt = appConfig.customPrompts?.answer || DEFAULT_PROMPTS.answer;
            if (appConfig.responseTone && appConfig.responseTone !== 'normal') {
                const toneInstructions = { sederhana: "\n\nExplain it simply.", teknis: "\n\nProvide a technical explanation.", analogi: "\n\nUse Analogies." };
                prompt += toneInstructions[appConfig.responseTone] || '';
            }
            show(loadingSpinner);
            callGeminiStream(prompt, cleanedContent, 'answer');
        });
    }

    function getExplanation() {
        chrome.storage.local.get(currentTab.id.toString(), (result) => {
            const currentState = result[currentTab.id.toString()];
            if (!currentState || !currentState.cleanedContent) { displayToast(`<strong>Error:</strong> Konten yang dibersihkan tidak ditemukan.`, 'error'); explanationButton.disabled = false; retryExplanationButton.disabled = false; return; }
            explanationButton.disabled = true; retryExplanationButton.disabled = true;
            show(explanationContainer);
            explanationDisplay.innerHTML = `<div class="loading-message">The AI is thinking...</div>`;
            let prompt = appConfig.customPrompts?.explanation || DEFAULT_PROMPTS.explanation;
            if (appConfig.responseTone && appConfig.responseTone !== 'normal') {
                const toneInstructions = { sederhana: "\n\nExplain it simply.", teknis: "\n\nProvide a technical explanation.", analogi: "\n\nUse Analogies." };
                prompt += toneInstructions[appConfig.responseTone] || '';
            }
            show(loadingSpinner);
            callGeminiStream(prompt, currentState.cleanedContent, 'explanation');
        });
    }

    function _handleCleaningResult(fullText) {
        const formattedHtml = formatAIResponse(fullText);
        contentDisplay.innerHTML = formattedHtml;
        show(contentDisplayWrapper);
        show(answerContainer);
        answerDisplay.innerHTML = `<div class="loading-message">Step 2/2: Getting answer...</div>`;
        saveState({ cleanedContent: fullText }).then(getAnswer);
    }

    function _handleAnswerResult(fullText) {
        const answerMatch = fullText.match(/Answer:(.*?)(Confidence:|Reason:|$)/is);
        const confidenceMatch = fullText.match(/Confidence:\s*(High|Medium|Low)/i);
        const reasonMatch = fullText ? fullText.match(/Reason:(.*)/is) : null;
        let answerText, formattedHtml;
        if (answerMatch && answerMatch[1].trim()) {
            answerText = answerMatch[1].trim();
            let confidenceHTML = '';
            if (confidenceMatch) {
                const confidence = confidenceMatch[1].toLowerCase();
                const reason = reasonMatch ? reasonMatch[1].trim() : "No reason provided.";
                confidenceHTML = `<div class="confidence-wrapper"><strong>Confidence Level:</strong> <span class="confidence-badge confidence-${confidence}">${confidence.charAt(0).toUpperCase() + confidence.slice(1)}</span><div class="confidence-reason">${escapeHtml(reason)}</div></div>`;
            }
            formattedHtml = formatAIResponse(answerText) + confidenceHTML;
        } else {
            answerText = fullText;
            formattedHtml = formatAIResponse(fullText);
        }
        answerDisplay.innerHTML = formattedHtml;
        retryAnswerButton.disabled = false;
        show(aiActionsWrapper);
        hide(explanationContainer);
        if (appConfig.autoHighlight && answerText) {
            const highlightCandidates = prepareTextForHighlight(answerText);
            chrome.tabs.sendMessage(currentTab.id, { action: 'highlight-answer', text: highlightCandidates });
        }
        saveState({ answerHTML: formattedHtml, explanationHTML: '' }).then((state) => saveToHistory(state, 'quiz'));
    }

    function _handleExplanationResult(fullText) {
        const formattedHtml = formatAIResponse(fullText);
        explanationDisplay.innerHTML = formattedHtml;
        explanationButton.disabled = false;
        retryExplanationButton.disabled = false;
        saveState({ explanationHTML: formattedHtml }).then((state) => saveToHistory(state, 'explanation'));
    }

    function _handleContextMenuResult(fullText, originalUserContent, purpose) {
        const formattedHtml = formatAIResponse(fullText);
        answerDisplay.innerHTML = formattedHtml;
        hide(aiActionsWrapper);
        hide(explanationContainer);
        saveToHistory({ cleanedContent: originalUserContent, answerHTML: formattedHtml, explanationHTML: '' }, purpose.replace('_action', ''));
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'geminiStreamUpdate') {
            const { payload, purpose } = request;
            let targetDisplay;
            if (purpose === 'cleaning') targetDisplay = contentDisplay;
            else if (purpose === 'answer' || purpose === 'quiz_answer') targetDisplay = answerDisplay;
            else if (purpose === 'explanation') targetDisplay = explanationDisplay;
            else if (['summarize_action', 'explain_action', 'translate_action', 'rephrase_action'].includes(purpose)) {
                targetDisplay = answerDisplay;
                if (payload.chunk && !contentDisplay.dataset.contextTextSet) {
                    show(contentDisplayWrapper); show(answerContainer);
                    contentDisplay.innerHTML = `<h3>Selected Text:</h3><div class="selected-text-preview">${escapeHtml(request.payload.originalUserContent || 'No text selected.')}</div><hr>`;
                    contentDisplay.dataset.contextTextSet = 'true';
                    targetDisplay.innerHTML = '';
                }
            }

            if (payload.success) {
                if (payload.chunk) {
                    if (targetDisplay.querySelector('.loading-message')) targetDisplay.innerHTML = '';
                    targetDisplay.textContent += payload.chunk;
                } else if (payload.done) {
                    hide(loadingSpinner);
                    if (contentDisplay.dataset.contextTextSet) delete contentDisplay.dataset.contextTextSet;
                    hide(messageArea);

                    const fullText = payload.fullText || targetDisplay.textContent;
                    
                    switch(purpose) {
                        case 'cleaning': _handleCleaningResult(fullText); break;
                        case 'answer':
                        case 'quiz_answer': _handleAnswerResult(fullText); break;
                        case 'explanation': _handleExplanationResult(fullText); break;
                        case 'summarize_action':
                        case 'explain_action':
                        case 'translate_action':
                        case 'rephrase_action':
                            _handleContextMenuResult(fullText, request.payload.originalUserContent, purpose);
                            break;
                    }
                }
            } else {
                hide(loadingSpinner);
                displayToast(`<strong>Error AI:</strong> ${escapeHtml(payload.error || 'Terjadi kesalahan.')}`, 'error');
                if (purpose === 'answer' || purpose === 'quiz_answer') retryAnswerButton.disabled = false;
                if (purpose === 'explanation') { explanationButton.disabled = false; retryExplanationButton.disabled = false; }
            }
        }
        return true; 
    });

    async function initialize() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) { displayToast(`Tidak dapat menemukan tab aktif.`, 'error'); return; }
        currentTab = tab;

        appConfig = await chrome.storage.sync.get(['geminiApiKey', 'responseTone', 'temperature', 'customPrompts', 'autoHighlight', 'rephraseLanguages']);
        if (!appConfig.geminiApiKey) { 
            displayToast('Kunci API Gemini belum diatur. Buka halaman pengaturan.', 'error');
            return; 
        }

        try {
            await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files: ['js/mark.min.js', 'js/content.js'] });
            await chrome.scripting.insertCSS({ target: { tabId: currentTab.id }, files: ['assets/highlighter.css'] });
            
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("Handshake timeout")), 3000);
                chrome.tabs.sendMessage(currentTab.id, { action: "ping_content_script" }, (response) => {
                    clearTimeout(timeout);
                    if (chrome.runtime.lastError || !response?.ready) {
                        reject(new Error(chrome.runtime.lastError?.message || "Content script not ready"));
                    } else {
                        resolve(response);
                    }
                });
            });
        } catch (e) {
            let errorMessage = `Ekstensi tidak dapat berjalan di halaman ini. Coba di situs web yang berbeda.`;
            if (e.message.includes("Cannot access a chrome://")) errorMessage = `Ekstensi tidak dapat berjalan di halaman internal Chrome.`;
            else if (e.message.includes("Handshake timeout")) errorMessage = `Handshake timeout. Coba muat ulang halaman.`;
            displayToast(`<strong>Gagal Memuat:</strong> ${errorMessage}`, 'error');
            return;
        }

        const contextKey = `contextSelection_${currentTab.id}`;
        const actionKey = `contextAction_${currentTab.id}`;
        const contextData = await chrome.storage.local.get([contextKey, actionKey]);

        if (contextData[contextKey] && contextData[actionKey]) {
            const selectedText = contextData[contextKey];
            const actionType = contextData[actionKey];
            await chrome.storage.local.remove([contextKey, actionKey, currentTab.id.toString()]);
            runInitialScan(selectedText, actionType);
        } else {
            const savedState = (await chrome.storage.local.get(currentTab.id.toString()))[currentTab.id.toString()];
            if (savedState && savedState.cleanedContent) {
                restoreUiFromState(savedState);
            } else {
                runInitialScan();
            }
        }
    }

    // --- Event Listeners ---
    settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
    historyButton.addEventListener('click', () => chrome.tabs.create({ url: 'ui/history.html' }));
    rescanButton.addEventListener('click', () => {
        if (!currentTab) return;
        chrome.storage.local.remove(currentTab.id.toString());
        runInitialScan();
    });
    explanationButton.addEventListener('click', getExplanation);
    retryAnswerButton.addEventListener('click', () => {
        hide(aiActionsWrapper);
        answerDisplay.innerHTML = `<div class="loading-message">AI is re-thinking the answer...</div>`;
        getAnswer();
    });
    retryExplanationButton.addEventListener('click', getExplanation);
    container.addEventListener('click', (event) => {
        const copyBtn = event.target.closest('.copy-code-button');
        if (copyBtn) {
            const codeElement = copyBtn.closest('.code-block-wrapper')?.querySelector('code');
            if (codeElement) navigator.clipboard.writeText(codeElement.innerText).then(() => {
                const span = copyBtn.querySelector('span');
                span.textContent = 'Copied!';
                copyBtn.classList.add('copied');
                setTimeout(() => { span.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2000);
            });
        }
    });

    initialize();
});