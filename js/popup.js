// js/popup.js

document.addEventListener('DOMContentLoaded', async function () {
    // --- PROMPTS ---
    const CLEANING_PROMPT = `You are a text cleaner. Your only job is to analyze the following messy text from a webpage and extract the main quiz content. 
RULES: 
1. Remove all irrelevant text (menus, sidebars, footers, ads, navigation links, etc.). 
2. Preserve the original formatting of the question, options, and especially code blocks. 
3. Format all content using standard Markdown (e.g., use triple backticks for code). 
4. Directly return only the cleaned Markdown text. Do not add any introductory phrases like "Here is the cleaned text:".`;

    const ANSWER_PROMPT = `Act as an expert quiz solver. Based on the following cleaned text, your tasks are:
1.  Provide the single, most correct answer for the question(s).
2.  Provide a confidence score (High, Medium, or Low).
3.  Provide a brief, one-sentence reason for your confidence level.

Respond in the exact format below, without any extra words or explanations.
FORMAT:
Answer: [Your Answer Here]
Confidence: [High/Medium/Low]
Reason: [Your one-sentence reason here]`;

    const EXPLANATION_PROMPT = `Act as an expert tutor. For the following quiz content, provide a clear, step-by-step explanation for why the provided answer is correct and why the other options are incorrect. IMPORTANT: Analyze the language of the provided text. Respond in the *exact same language* as the input text, and use Markdown for formatting.`;

    // New predefined prompts for context menu
    const SUMMARIZE_PROMPT = `Summarize the following text concisely. IMPORTANT: Analyze the language of the provided text. Respond in the *exact same language* as the input text, and use Markdown for formatting:`;
    const TRANSLATE_PROMPT = `Translate the following text into 
    1. English
    2. Indonesian
    
    Importnant: if the default language is english, no need to translate to english. vice versa:`; 
    const DEFINE_PROMPT = `Provide a clear and concise definition for the following term or concept found in the text. IMPORTANT: Analyze the language of the provided text. Respond in the *exact same language* as the input text, and use Markdown for formatting:`;

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
    let streamingAnswerText = '';
    let streamingExplanationText = '';
    let hideToastTimeout = null; // Untuk mengelola timeout toast

    // --- Helper & Utility Functions ---
    function show(element) { if (element) element.classList.remove('hidden'); }
    function hide(element) { if (element) element.classList.add('hidden'); }
    // Revisi di sini: Memastikan 'unsafe' selalu berupa string
    function escapeHtml(unsafe) { 
        return String(unsafe) 
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;"); 
    }

    // Fungsi displayError sekarang akan menampilkan pesan sebagai "toast"
    function displayToast(message, type = 'error', duration = 5000) {
        clearTimeout(hideToastTimeout); // Bersihkan timeout sebelumnya jika ada

        // Sembunyikan elemen UI utama dan tampilkan messageArea
        hide(contentDisplayWrapper);
        hide(answerContainer);
        hide(explanationContainer);
        hide(aiActionsWrapper);
        hide(loadingSpinner); 

        messageArea.innerHTML = `<div class="toast-notification toast-${type}">${message}</div>`;
        show(messageArea);

        // Atur timeout untuk menyembunyikan toast
        hideToastTimeout = setTimeout(() => {
            hide(messageArea);
        }, duration);
    }

    function formatAIResponse(text) {
        let processedText = String(text).replace(/```[\s\S]*?```/g, '~~~CODE_BLOCK~~~');
        processedText = escapeHtml(processedText).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/^\s*[\*\-]\s(.*)/gm, '<li>$1</li>');
        processedText = processedText.replace(/<\/li>\s*<li>/g, '</li><li>'); 
        const listRegex = /(<ul><li>.*?<\/li><\/ul>)|(<li>.*<\/li>)/s; 
        if (!processedText.startsWith('<ul>') && listRegex.test(processedText)) { 
            processedText = processedText.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        }
        processedText = processedText.replace(/\n/g, '<br>');
        const codeBlocks = String(text).match(/```[\s\S]*?```/g) || []; 
        codeBlocks.forEach(block => {
            const language = (block.match(/^```(\w+)\n/) || [])[1] || '';
            const cleanCode = block.replace(/^```\w*\n|```$/g, '');
            const codeHtml = `<div class="code-block-wrapper"><button class="copy-code-button" title="Copy Code Snippet"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span></button><pre><code class="language-${language}">${escapeHtml(cleanCode.trim())}</code></pre></div>`;
            processedText = processedText.replace('~~~CODE_BLOCK~~~', codeHtml);
        });
        return processedText.replace(/<br>\s*<ul>/g, '<ul>').replace(/<\/ul>\s*<br>/g, '</ul>');
    }

    function callGeminiStream(prompt, contentText, purpose, originalUserContent = '') {
        console.log("Popup: Sending 'callGeminiStream' to background.js for purpose:", purpose); // Debugging
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
        const newEntry = {
            id: Date.now(),
            cleanedContent: stateData.cleanedContent, 
            answerHTML: stateData.answerHTML,
            explanationHTML: stateData.explanationHTML || '',
            url: currentTab.url,
            title: currentTab.title,
            timestamp: new Date().toISOString(),
            actionType: contextActionType || 'quiz' 
        };
        history.unshift(newEntry);
        if (history.length > 100) history.pop();
        await chrome.storage.local.set({ history });
    }

    function restoreUiFromState(state) {
        hide(messageArea);
        hide(loadingSpinner); 
        if (state.cleanedContent) {
            contentDisplay.innerHTML = formatAIResponse(state.cleanedContent);
            show(contentDisplayWrapper);
        }
        if (state.answerHTML) {
            answerDisplay.innerHTML = state.answerHTML;
            show(answerContainer);
            show(aiActionsWrapper);
        }
        if (state.explanationHTML) {
            explanationDisplay.innerHTML = state.explanationHTML;
            show(explanationContainer);
        }
    }

    // --- Main Action Handlers ---
    async function runInitialScan(contentFromContextMenu = null, contextActionType = null) {
        hide(contentDisplayWrapper); hide(answerContainer); hide(explanationContainer); hide(aiActionsWrapper);
        show(messageArea);
        show(loadingSpinner); 
        
        let textToProcess;
        let selectedPrompt;
        let purpose = 'quiz_answer'; 
        let originalSelectedTextForContext = contentFromContextMenu; 

        try {
            if (contentFromContextMenu && contextActionType) {
                textToProcess = contentFromContextMenu;
                
                const customPrompts = appConfig.customPrompts || {};
                switch (contextActionType) {
                    case 'summarize':
                        selectedPrompt = customPrompts.summarize || SUMMARIZE_PROMPT;
                        purpose = 'summarize_action';
                        break;
                    case 'explain':
                        selectedPrompt = customPrompts.explain_context || EXPLANATION_PROMPT; 
                        purpose = 'explain_action';
                        break;
                    case 'translate':
                        selectedPrompt = customPrompts.translate || TRANSLATE_PROMPT;
                        purpose = 'translate_action';
                        break;
                    case 'define':
                        selectedPrompt = customPrompts.define || DEFINE_PROMPT;
                        purpose = 'define_action';
                        break;
                    default:
                        selectedPrompt = customPrompts.answer || ANSWER_PROMPT;
                        purpose = 'quiz_answer';
                }
                messageArea.innerHTML = `<div class="loading-message">Getting ${contextActionType} for selected text...</div>`;
            } else {
                messageArea.innerHTML = `<div class="loading-message">Step 1/2: Cleaning content...</div>`;
                const response = await new Promise((resolve, reject) => {
                    chrome.tabs.sendMessage(currentTab.id, { action: "get_page_content" }, (response) => {
                        // Check chrome.runtime.lastError immediately after sendMessage
                        if (chrome.runtime.lastError) {
                            const error = chrome.runtime.lastError;
                            if (error.message.includes("The message channel closed")) {
                                console.warn("Popup: Message channel closed during get_page_content. This often happens if the popup is closed too quickly.");
                                reject(new Error("Pesan tidak dapat dikirim ke halaman karena popup ditutup atau halaman tidak aktif. Silakan coba lagi."));
                            } else {
                                reject(new Error(`Terjadi kesalahan saat mendapatkan konten halaman: ${error.message}`));
                            }
                            return; 
                        }
                        resolve(response);
                    });
                });
                
                if (!response || !response.content) {
                    throw new Error("Tidak ada konten yang dapat dibaca ditemukan di halaman. Atau script konten tidak merespons.");
                }
                
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = response.content.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>|<\/div>|<\/li>/gi, '\n');
                textToProcess = tempDiv.innerText;
                if (!textToProcess.trim()) throw new Error("Tidak ada konten yang dapat dibaca ditemukan di halaman.");
                
                selectedPrompt = appConfig.customPrompts?.cleaning || CLEANING_PROMPT;
                purpose = 'cleaning';
            }

            if (appConfig.responseTone && appConfig.responseTone !== 'normal' && purpose !== 'cleaning') {
                const toneInstructions = { 
                    sederhana: "\n\nExplain it simply.", 
                    teknis: "\n\nProvide a technical explanation.", 
                    analogi: "\n\nUse Analogies." 
                };
                selectedPrompt += toneInstructions[appConfig.responseTone] || '';
            }

            callGeminiStream(selectedPrompt, textToProcess, purpose, originalSelectedTextForContext);

        } catch (error) {
            // Menggunakan displayToast untuk semua error di runInitialScan
            displayToast(`<strong>Analisis Gagal:</strong> ${escapeHtml(error.message || 'Terjadi kesalahan tidak dikenal.')}`, 'error');
        }
    }

    function getAnswer() {
        chrome.storage.local.get(currentTab.id.toString(), (result) => {
            const cleanedContent = result[currentTab.id.toString()]?.cleanedContent;
            if (!cleanedContent) {
                displayToast(`<strong>Error:</strong> Konten yang dibersihkan tidak ditemukan untuk mendapatkan jawaban.`, 'error');
                retryAnswerButton.disabled = false;
                return;
            }
            retryAnswerButton.disabled = true;
            streamingAnswerText = '';
            let prompt = appConfig.customPrompts?.answer || ANSWER_PROMPT;

            if (appConfig.responseTone && appConfig.responseTone !== 'normal') {
                const toneInstructions = { 
                    sederhana: "\n\nExplain it simply.", 
                    teknis: "\n\nProvide a technical explanation.", 
                    analogi: "\n\nUse Analogies." 
                };
                prompt += toneInstructions[appConfig.responseTone] || '';
            }
            show(loadingSpinner); 
            callGeminiStream(prompt, cleanedContent, 'answer');
        });
    }

    function getExplanation() {
        chrome.storage.local.get(currentTab.id.toString(), (result) => {
            const currentState = result[currentTab.id.toString()];
            if (!currentState || !currentState.cleanedContent) {
                displayToast(`<strong>Error:</strong> Konten yang dibersihkan tidak ditemukan untuk mendapatkan penjelasan.`, 'error');
                explanationButton.disabled = false;
                retryExplanationButton.disabled = false;
                return;
            }
            explanationButton.disabled = true;
            retryExplanationButton.disabled = true;
            show(explanationContainer); // Tetap tampilkan kontainer penjelasan
            explanationDisplay.innerHTML = `<div class="loading-message">The AI is thinking...</div>`; // Pesan loading standar di area penjelasan
            streamingExplanationText = '';
            let prompt = appConfig.customPrompts?.explanation || EXPLANATION_PROMPT;
            
            if (appConfig.responseTone && appConfig.responseTone !== 'normal') {
                const toneInstructions = { 
                    sederhana: "\n\nExplain it simply.", 
                    teknis: "\n\nProvide a technical explanation.", 
                    analogi: "\n\nUse Analogies." 
                };
                prompt += toneInstructions[appConfig.responseTone] || '';
            }
            show(loadingSpinner); 
            callGeminiStream(prompt, currentState.cleanedContent, 'explanation');
        });
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'geminiStreamUpdate') {
            console.log("Popup: Received 'geminiStreamUpdate' with purpose:", request.purpose, "and payload:", request.payload); // Debugging
            const { payload, purpose } = request;
            let targetDisplay;
            if (purpose === 'cleaning') targetDisplay = contentDisplay;
            else if (purpose === 'answer' || purpose === 'quiz_answer') targetDisplay = answerDisplay;
            else if (purpose === 'explanation') targetDisplay = explanationDisplay;
            else if (['summarize_action', 'explain_action', 'translate_action', 'define_action'].includes(purpose)) {
                targetDisplay = answerDisplay;
                if (payload.chunk && !contentDisplay.dataset.contextTextSet) { 
                    //hide(messageArea); // Tidak perlu hide messageArea jika kita akan pakai untuk toast notif
                    show(contentDisplayWrapper);
                    show(answerContainer);
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
                    console.log("Popup: Stream done for purpose:", purpose); // Debugging
                    hide(loadingSpinner); 
                    // Reset flag contextTextSet
                    if (contentDisplay.dataset.contextTextSet) {
                        delete contentDisplay.dataset.contextTextSet;
                    }
                    hide(messageArea); // Sembunyikan messageArea jika sukses dan tidak ada error

                    const fullText = payload.fullText || targetDisplay.textContent;
                    
                    if (purpose === 'cleaning') {
                        const formattedHtml = formatAIResponse(fullText);
                        targetDisplay.innerHTML = formattedHtml;
                        //hide(messageArea); // Sudah di hide di awal stream, atau tidak perlu di sini jika messageArea untuk toast
                        show(contentDisplayWrapper);
                        show(answerContainer);
                        answerDisplay.innerHTML = `<div class="loading-message">Step 2/2: Getting answer...</div>`;
                        saveState({ cleanedContent: fullText }).then(getAnswer);
                    } else if (purpose === 'answer' || purpose === 'quiz_answer') {
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

                        targetDisplay.innerHTML = formattedHtml;
                        retryAnswerButton.disabled = false;
                        show(aiActionsWrapper);
                        hide(explanationContainer); 
                        
                        if (appConfig.autoHighlight && answerText) {
                            chrome.tabs.sendMessage(currentTab.id, { action: 'highlight-answer', text: answerText });
                        }
                        saveState({ answerHTML: formattedHtml, explanationHTML: '' }).then(() => saveToHistory({ cleanedContent: fullText, answerHTML: formattedHtml, explanationHTML: '' }, 'quiz')); 

                    } else if (purpose === 'explanation') {
                        const formattedHtml = formatAIResponse(fullText);
                        targetDisplay.innerHTML = formattedHtml;
                        explanationButton.disabled = false;
                        retryExplanationButton.disabled = false;
                        saveState({ explanationHTML: formattedHtml }).then(() => saveToHistory({ cleanedContent: 'N/A', answerHTML: formattedHtml, explanationHTML: '' }, 'explanation')); 

                    } else if (['summarize_action', 'explain_action', 'translate_action', 'define_action'].includes(purpose)) {
                        const formattedHtml = formatAIResponse(fullText);
                        targetDisplay.innerHTML = formattedHtml;
                        hide(aiActionsWrapper); 
                        hide(explanationContainer); 

                        const originalSelectedText = request.payload.originalUserContent; 
                        saveToHistory({ 
                            cleanedContent: originalSelectedText, 
                            answerHTML: formattedHtml, 
                            explanationHTML: '' 
                        }, purpose.replace('_action', '')); 
                    }
                }
            } else {
                console.error("Popup: Gemini stream update failed for purpose:", purpose, "Error:", payload.error); // Debugging
                hide(loadingSpinner); 
                // Menggunakan displayToast untuk menampilkan error dari background.js
                displayToast(`<strong>Error AI:</strong> ${escapeHtml(payload.error || 'Terjadi kesalahan tidak dikenal saat streaming AI.')}`, 'error');
                if (purpose === 'answer' || purpose === 'quiz_answer') retryAnswerButton.disabled = false;
                if (purpose === 'explanation') { explanationButton.disabled = false; retryExplanationButton.disabled = false; }
            }
        }
        return false; 
    });

    async function initialize() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) { displayToast(`Tidak dapat menemukan tab aktif.`, 'error'); return; }
        currentTab = tab;

        appConfig = await chrome.storage.sync.get(['geminiApiKey', 'responseTone', 'temperature', 'customPrompts', 'autoHighlight']);
        if (!appConfig.geminiApiKey) { showSetupView(); return; }

        try {
            console.log("popup.js: Attempting to inject content.js and highlighter.css...");
            await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files: ['js/content.js'] });
            await chrome.scripting.insertCSS({ target: { tabId: currentTab.id }, files: ['assets/highlighter.css'] });
            console.log("popup.js: Content script and CSS injected successfully.");
        } catch (e) {
            console.error("popup.js: Failed to inject content script or CSS:", e);
            let errorMessage = `Ekstensi tidak dapat berjalan di halaman ini. Coba di situs web yang berbeda (misalnya, artikel berita, halaman kuis).`;
            if (e.message.includes("Cannot access a chrome://")) {
                errorMessage += `<br><br>Ini adalah halaman internal Chrome (seperti chrome://extensions), Anda tidak dapat menjalankan ekstensi di sini.`;
            } else if (e.message.includes("is not allowed to inject script")) {
                 errorMessage += `<br><br>Ekstensi tidak memiliki izin untuk berinteraksi dengan situs ini. Pastikan Anda telah memberikan semua izin yang diminta saat instalasi.`;
            }
            displayToast(`<strong>Gagal Memuat Halaman:</strong> ${errorMessage}`, 'error');
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

    function showSetupView() {
    hide(contentDisplayWrapper); hide(answerContainer); hide(explanationContainer); hide(aiActionsWrapper);
    hide(loadingSpinner); 
    const setupHTML = `<div class="initial-view"><h2 style="margin-bottom: 5px;">Setup Required</h2><p>You need to enter a Gemini API Key to get started.</p><button id="openOptionsButton" class="setup-button">Open Settings Page</button></div>`;
    messageArea.innerHTML = setupHTML;
    show(messageArea);
    document.getElementById('openOptionsButton').addEventListener('click', () => chrome.runtime.openOptionsPage());
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