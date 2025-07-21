// js/popup.js

document.addEventListener('DOMContentLoaded', async function () {
    // --- PROMPTS ---
    // Menggunakan CODE_BLOCK_START/END sebagai placeholder untuk menghindari masalah sintaks JavaScript
    const CLEANING_PROMPT = `You are an extremely meticulous text cleaner and quiz content extractor. Your SOLE purpose is to identify and extract ONLY the quiz question and its exact provided options from the raw, potentially noisy webpage text provided.

CRITICAL RULES FOR EXTRACTION:
1.  **Identify The Single Question:** Locate the main quiz question.
2.  **Identify All Options:** Locate *all* the multiple-choice or selection options directly associated with that question.
3.  **Strict Exclusion:** ABSOLUTELY filter out and remove *all other text and elements*. This includes, but is not limited to: menus, sidebars, headers, footers, advertisements, navigation links, contextual instructions not part of the question itself (e.g., "Next", "Previous", "Submit"), scores, category names, general page content unrelated to the specific quiz question and its options.
4.  **Preserve Original Formatting:** Maintain the exact wording, spelling, and any special characters or code snippets within the question and options.
5.  **Markdown Formatting:** Format the extracted content using standard Markdown. Use CODE_BLOCK_START and CODE_BLOCK_END for any multi-line code blocks found within options (e.g., "CODE_BLOCK_START\\nconsole.log('hello')\\nCODE_BLOCK_END"), and wrap inline code with single backticks (\`inline code\`). If the option text itself is a HTML tag (like <p>), you should also wrap it in CODE_BLOCK_START/END to preserve its literal form.
6.  **Direct Output:** Return ONLY the cleaned Markdown text. Do NOT add any introductory phrases, summaries, explanations, or conversational text. Your output must be purely the extracted question and its options.
7.  **CRITICAL LANGUAGE RULE**: Analyze the language of the provided raw webpage text. You MUST respond in the EXACT SAME LANGUAGE as the input text. No translation is allowed unless explicitly requested for a translation task.
`;

    const ANSWER_PROMPT = `Act as an expert quiz solver. Based on the following cleaned quiz text (containing only the question and its options), your tasks are:
1. Identify the single, most correct answer *from the provided options*.
2. Provide a confidence score (High, Medium, or Low).
3. Provide a brief, one-sentence reason for your confidence level.

Respond in the exact format below, without any extra words or explanations.
FORMAT:
Answer: [The exact text of the chosen option. If it's a multi-line code block, output it as CODE_BLOCK_START...CODE_BLOCK_END. If it's inline code, output it as \`inline code\`.]
Confidence: [High/Medium/Low]
Reason: [Your one-sentence reason here]
CRITICAL LANGUAGE RULE: Respond in the EXACT SAME LANGUAGE as the quiz content you processed. Do NOT translate any part of the answer or reason.
`;

    const EXPLANATION_PROMPT = `Act as an expert tutor. For the following quiz content, provide a clear, step-by-step explanation for why the provided answer is correct and why the other options are incorrect. IMPORTANT: Analyze the language of the provided text. Respond in the *exact same language* as the input text, and use Markdown for formatting. CODE_BLOCK_START and CODE_BLOCK_END denote multi-line code blocks. Single backticks (\`) denote inline code. CRITICAL LANGUAGE RULE: Respond in the EXACT SAME LANGUAGE as the quiz content you processed. Do NOT translate.`; 
    const SUMMARIZE_PROMPT = `Summarize the following text concisely. IMPORTANT: Analyze the language of the provided text. Respond in the *exact same language* as the input text, and use Markdown for formatting: CRITICAL LANGUAGE RULE: Respond in the EXACT SAME LANGUAGE as the input text. Do NOT translate.`; 
    const TRANSLATE_PROMPT = `Translate the following text into 
    1. English
    2. Indonesian
    
    Importnant: if the default language is english, no need to translate to english. vice versa:`; 
    const DEFINE_PROMPT = `Provide a clear and concise definition for the following term or concept found in the text. IMPORTANT: Analyze the language of the provided text. Respond in the *exact same language* as the input text, and use Markdown for formatting: CRITICAL LANGUAGE RULE: Respond in the EXACT SAME LANGUAGE as the input text. Do NOT translate.`; 

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
    let hideToastTimeout = null; 

    // --- Helper & Utility Functions ---
    function show(element) { if (element) element.classList.remove('hidden'); }
    function hide(element) { if (element) element.classList.add('hidden'); }
    function escapeHtml(unsafe) { 
        return String(unsafe) 
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;"); 
    }

    function displayToast(message, type = 'error', duration = 5000) {
        clearTimeout(hideToastTimeout); 

        hide(contentDisplayWrapper);
        hide(answerContainer);
        hide(explanationContainer);
        hide(aiActionsWrapper);
        hide(loadingSpinner); 

        messageArea.innerHTML = `<div class="toast-notification toast-${type}">${message}</div>`;
        show(messageArea);

        hideToastTimeout = setTimeout(() => {
            hide(messageArea);
        }, duration);
    }

    function formatAIResponse(text) {
        // Ganti placeholder CODE_BLOCK_START/END kembali ke triple backticks untuk tampilan
        let processedText = String(text).replace(/CODE_BLOCK_START\n([\s\S]*?)\nCODE_BLOCK_END/g, '```\n$1\n```');
        processedText = processedText.replace(/CODE_BLOCK_START/g, '`').replace(/CODE_BLOCK_END/g, '`'); 

        processedText = escapeHtml(processedText).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/^\s*[\*\-]\s(.*)/gm, '<li>$1</li>');
        processedText = processedText.replace(/<\/li>\s*<li>/g, '</li><li>'); 
        const listRegex = /(<ul><li>.*?<\/li><\/ul>)|(<li>.*<\/li>)/s; 
        if (!processedText.startsWith('<ul>') && listRegex.test(processedText)) { 
            processedText = processedText.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        }
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

    // Helper untuk menyiapkan teks highlight
    function prepareTextForHighlight(text) {
        let highlightCandidates = [];

        // 1. Ambil teks asli dari AI, bersihkan placeholder
        let cleanedText = String(text)
            .replace(/CODE_BLOCK_START\n([\s\S]*?)\nCODE_BLOCK_END/g, '$1') // Untuk multi-line code blocks
            .replace(/`([^`]+)`/g, '$1') // Untuk inline code backticks
            .trim();
        
        if (cleanedText.length > 0) {
            highlightCandidates.push(cleanedText);
        }

        // 2. Jika teks asli dari AI adalah literal tag HTML (misal: <table>)
        // Coba juga mencari variasi escape atau teks polosnya
        const htmlTagRegex = /^<([a-z][a-z0-9]*)\b[^>]*>$/i; 
        const tagMatch = cleanedText.match(htmlTagRegex);

        if (tagMatch) {
            const tagName = tagMatch[1]; // misal: "table" dari "<table>"
            const escapedTag = `&lt;${tagName}&gt;`; // misal: "&lt;table&gt;"
            const plainTextTag = tagName; // misal: "table"

            if (escapedTag.length > 0) highlightCandidates.push(escapedTag);
            if (plainTextTag.length > 0) highlightCandidates.push(plainTextTag);
        }

        // 3. Tambahkan versi yang didekode HTML jika ada entitas di dalamnya (ini untuk page content)
        // Misalnya, jika jawaban AI adalah '&lt;table&gt;', Mark.js perlu mencari `<table>` juga
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanedText;
        const decodedText = tempDiv.textContent || '';
        if (decodedText !== cleanedText && decodedText.length > 0) {
            highlightCandidates.push(decodedText);
             // Jika decodedText adalah tag (misal dari &lt;table&gt; jadi <table>),
             // tambahkan versi plain textnya (table)
             const decodedTagMatch = decodedText.match(htmlTagRegex);
             if (decodedTagMatch) {
                 highlightCandidates.push(decodedTagMatch[1]);
             }
        }
        
        // Filter duplikat dan nilai kosong
        return [...new Set(highlightCandidates.filter(c => c && c.trim().length > 0))];
    }


    function callGeminiStream(prompt, contentText, purpose, originalUserContent = '') {
        console.log("Popup: Sending 'callGeminiStream' to background.js for purpose:", purpose); 
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
            explanationDisplay.innerHTML = formatAIResponse(state.explanationHTML); 
            show(explanationContainer);
        }
    }

    // --- Main Action Handerls ---
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
                        if (chrome.runtime.lastError) {
                            const error = chrome.runtime.lastError;
                            if (error.message.includes("The message channel closed")) {
                                console.warn("Popup: Message channel closed during get_page_content. This often happens if the popup is closed too quickly.");
                                reject(new Error("Pesan tidak dapat dikirim ke halaman karena popup ditutup atau halaman tidak aktif. Silakan coba lagi."));
                            } else if (error.message.includes("Could not establish connection")) { 
                                console.error("Popup: Could not establish connection to content script:", error.message);
                                reject(new Error("Gagal terhubung ke script halaman. Pastikan halaman dimuat sepenuhnya dan coba lagi."));
                            }
                            else {
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
                
                textToProcess = response.content; 
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

        }
        catch (error) {
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
            show(explanationContainer); 
            explanationDisplay.innerHTML = `<div class="loading-message">The AI is thinking...</div>`; 
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
            console.log("Popup: Received 'geminiStreamUpdate' with purpose:", request.purpose, "and payload:", request.payload); 
            const { payload, purpose } = request;
            let targetDisplay;
            if (purpose === 'cleaning') targetDisplay = contentDisplay;
            else if (purpose === 'answer' || purpose === 'quiz_answer') targetDisplay = answerDisplay;
            else if (purpose === 'explanation') targetDisplay = explanationDisplay;
            else if (['summarize_action', 'explain_action', 'translate_action', 'define_action'].includes(purpose)) {
                targetDisplay = answerDisplay;
                if (payload.chunk && !contentDisplay.dataset.contextTextSet) { 
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
                    console.log("Popup: Stream done for purpose:", purpose); 
                    hide(loadingSpinner); 
                    if (contentDisplay.dataset.contextTextSet) {
                        delete contentDisplay.dataset.contextTextSet;
                    }
                    hide(messageArea); 

                    const fullText = payload.fullText || targetDisplay.textContent;
                    
                    if (purpose === 'cleaning') {
                        const formattedHtml = formatAIResponse(fullText);
                        targetDisplay.innerHTML = formattedHtml;
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
                        
                        // Kirim teks jawaban yang sudah disiapkan oleh prepareTextForHighlight
                        if (appConfig.autoHighlight && answerText) {
                            const highlightCandidates = prepareTextForHighlight(answerText);
                            chrome.tabs.sendMessage(currentTab.id, { action: 'highlight-answer', text: highlightCandidates });
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
                console.error("Popup: Gemini stream update failed for purpose:", purpose, "Error:", payload.error); 
                hide(loadingSpinner); 
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
            console.log("popup.js: Attempting to inject Mark.js, content.js and highlighter.css...");
            // Suntikkan Mark.js terlebih dahulu, lalu content.js
            await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files: ['js/mark.min.js', 'js/content.js'] });
            await chrome.scripting.insertCSS({ target: { tabId: currentTab.id }, files: ['assets/highlighter.css'] });
            
            // --- Handshake mechanism ---
            const handshakeResponse = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Handshake timeout: Content script did not respond in time."));
                }, 3000); // 3 detik timeout untuk handshake

                chrome.tabs.sendMessage(currentTab.id, { action: "ping_content_script" }, (response) => {
                    clearTimeout(timeout);
                    if (chrome.runtime.lastError) {
                        const error = chrome.runtime.lastError;
                        if (error.message.includes("The message channel closed")) {
                            reject(new Error("Handshake failed: Message channel closed (popup closed or content script not ready)."));
                        } else if (error.message.includes("Could not establish connection")) {
                            reject(new Error("Handshake failed: Could not establish connection to content script."));
                        } else {
                            reject(new Error(`Handshake failed: ${error.message}`));
                        }
                        return;
                    }
                    if (response && response.ready) {
                        resolve(response);
                    } else {
                        reject(new Error("Handshake failed: Content script not ready."));
                    }
                });
            });
            console.log("popup.js: Content script handshake successful.", handshakeResponse);
            // --- End Handshake mechanism ---

            console.log("popup.js: Mark.js, Content script and CSS injected successfully and ready.");
        } catch (e) {
            console.error("popup.js: Failed to inject content script or CSS / Handshake failed:", e);
            let errorMessage = `Ekstensi tidak dapat berjalan di halaman ini. Coba di situs web yang berbeda (misalnya, artikel berita, halaman kuis).`;
            if (e.message.includes("Cannot access a chrome://")) {
                errorMessage += `<br><br>Ini adalah halaman internal Chrome (seperti chrome://extensions), Anda tidak dapat menjalankan ekstensi di sini.`;
            } else if (e.message.includes("is not allowed to inject script")) {
                 errorMessage += `<br><br>Ekstensi tidak memiliki izin untuk berinteraksi dengan situs ini. Pastikan Anda telah memberikan semua izin yang diminta saat instalasi.`;
            } else if (e.message.includes("The Tab was closed")) {
                 errorMessage = `Tab ditutup sebelum ekstensi dapat memuat.`;
            } else if (e.message.includes("Handshake")) { 
                errorMessage = e.message + "<br><br>Coba muat ulang halaman dan ekstensi, atau pastikan halaman web tidak dalam mode tidur/beku.";
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