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

    const EXPLANATION_PROMPT = `Act as an expert tutor. For the following quiz content, provide a clear, step-by-step explanation for why the provided answer is correct and why the other options are incorrect. IMPORTANT: Respond in the same language as the question and use Markdown for formatting.`;

    // New predefined prompts for context menu
    const SUMMARIZE_PROMPT = `Summarize the following text concisely. Respond in the same language as the provided text and use Markdown for formatting:`;
    const TRANSLATE_PROMPT = `Translate the following text into 
    1. English
    2. Indonesian
    
    Importnant: if the default language is english, no need to translate to english. vice versa:`; // Bisa diubah ke bahasa lain jika ada setting
    const DEFINE_PROMPT = `Provide a clear and concise definition for the following term or concept found in the text:`;

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

    // --- Global Variables ---
    let currentTab = null;
    let appConfig = {};
    let streamingAnswerText = '';
    let streamingExplanationText = '';

    // --- Helper & Utility Functions ---
    function show(element) { if (element) element.classList.remove('hidden'); }
    function hide(element) { if (element) element.classList.add('hidden'); }
    // Revisi di sini: Memastikan 'unsafe' selalu berupa string
    function escapeHtml(unsafe) { 
        return String(unsafe) // Mengkonversi 'unsafe' menjadi string
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;"); 
    }

    function displayError(htmlMessage) {
        hide(contentDisplayWrapper);
        hide(answerContainer);
        hide(explanationContainer);
        hide(aiActionsWrapper);
        messageArea.innerHTML = htmlMessage;
        show(messageArea);
    }

    function formatAIResponse(text) {
        // Revisi di sini: Memastikan 'text' selalu berupa string sebelum pemrosesan
        let processedText = String(text).replace(/```[\s\S]*?```/g, '~~~CODE_BLOCK~~~');
        processedText = escapeHtml(processedText).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/^\s*[\*\-]\s(.*)/gm, '<li>$1</li>');
        processedText = processedText.replace(/<\/li>\s*<li>/g, '</li><li>'); // Handle multiple list items on one line
        const listRegex = /(<ul><li>.*?<\/li><\/ul>)|(<li>.*<\/li>)/s; // Updated regex to handle full <ul> or individual <li>
        if (!processedText.startsWith('<ul>') && listRegex.test(processedText)) { // Only add <ul> if not already wrapped
            processedText = processedText.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        }
        processedText = processedText.replace(/\n/g, '<br>');
        const codeBlocks = String(text).match(/```[\s\S]*?```/g) || []; // Memastikan 'text' adalah string
        codeBlocks.forEach(block => {
            const language = (block.match(/^```(\w+)\n/) || [])[1] || '';
            const cleanCode = block.replace(/^```\w*\n|```$/g, '');
            const codeHtml = `<div class="code-block-wrapper"><button class="copy-code-button" title="Copy Code Snippet"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span></button><pre><code class="language-${language}">${escapeHtml(cleanCode.trim())}</code></pre></div>`;
            processedText = processedText.replace('~~~CODE_BLOCK~~~', codeHtml);
        });
        return processedText.replace(/<br>\s*<ul>/g, '<ul>').replace(/<\/ul>\s*<br>/g, '</ul>');
    }

    function callGeminiStream(prompt, contentText, purpose) {
        const generationConfig = { temperature: appConfig.temperature !== undefined ? appConfig.temperature : 0.4 };
        chrome.runtime.sendMessage({ action: 'callGeminiStream', payload: { systemPrompt: prompt, userContent: contentText, generationConfig }, purpose: purpose });
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
            cleanedContent: stateData.cleanedContent, // This might be the raw selected text for context actions
            answerHTML: stateData.answerHTML,
            explanationHTML: stateData.explanationHTML || '',
            url: currentTab.url,
            title: currentTab.title,
            timestamp: new Date().toISOString(),
            actionType: contextActionType || 'quiz' // Tambahkan tipe aksi ke history
        };
        history.unshift(newEntry);
        if (history.length > 100) history.pop();
        await chrome.storage.local.set({ history });
    }

    function restoreUiFromState(state) {
        hide(messageArea);
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
        
        let textToProcess;
        let selectedPrompt;
        let purpose = 'quiz_answer'; // Default purpose for initial scan (quiz solving)

        try {
            if (contentFromContextMenu && contextActionType) {
                // Scenario: Opened via context menu
                textToProcess = contentFromContextMenu;
                
                // Determine prompt based on contextActionType
                const customPrompts = appConfig.customPrompts || {};
                switch (contextActionType) {
                    case 'summarize':
                        selectedPrompt = customPrompts.summarize || SUMMARIZE_PROMPT;
                        purpose = 'summarize_action';
                        break;
                    case 'explain':
                        selectedPrompt = customPrompts.explain_context || EXPLANATION_PROMPT; // Use general explanation or custom
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
                        // Fallback to general answer if context action is unknown
                        selectedPrompt = customPrompts.answer || ANSWER_PROMPT;
                        purpose = 'quiz_answer';
                }
                messageArea.innerHTML = `<div class="loading-message">Getting ${contextActionType} for selected text...</div>`;
            } else {
                // Scenario: Standard popup open or rescan
                messageArea.innerHTML = `<div class="loading-message">Step 1/2: Cleaning content...</div>`;
                const response = await chrome.tabs.sendMessage(currentTab.id, { action: "get_page_content" });
                if (chrome.runtime.lastError) throw new Error(chrome.runtime.lastError.message);
                if (!response || !response.content) throw new Error("Could not get a response from the content script.");
                
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = response.content.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>|<\/div>|<\/li>/gi, '\n');
                textToProcess = tempDiv.innerText;
                if (!textToProcess.trim()) throw new Error("No readable content was found on the page.");
                
                selectedPrompt = appConfig.customPrompts?.cleaning || CLEANING_PROMPT;
                purpose = 'cleaning';
            }

            // Apply general response tone if set and not a specific cleaning prompt
            if (appConfig.responseTone && appConfig.responseTone !== 'normal' && purpose !== 'cleaning') {
                const toneInstructions = { 
                    sederhana: "\n\nExplain it simply.", 
                    teknis: "\n\nProvide a technical explanation.", 
                    analogi: "\n\nUse analogies." 
                };
                selectedPrompt += toneInstructions[appConfig.responseTone] || '';
            }

            callGeminiStream(selectedPrompt, textToProcess, purpose);

        } catch (error) {
            // Revisi di sini: Memastikan error.message selalu berupa string
            displayError(`<div class="error-message"><strong>Analysis Failed:</strong> ${escapeHtml(error.message || 'Unknown error occurred.')}</div>`);
        }
    }

    function getAnswer() {
        chrome.storage.local.get(currentTab.id.toString(), (result) => {
            const cleanedContent = result[currentTab.id.toString()]?.cleanedContent;
            if (!cleanedContent) {
                answerDisplay.innerHTML = `<div class="error-message"><strong>Error:</strong> Cleaned content not found for getting answer.</div>`;
                return;
            }
            retryAnswerButton.disabled = true;
            streamingAnswerText = '';
            let prompt = appConfig.customPrompts?.answer || ANSWER_PROMPT;

            // Apply general response tone if set
            if (appConfig.responseTone && appConfig.responseTone !== 'normal') {
                const toneInstructions = { 
                    sederhana: "\n\nExplain it simply.", 
                    teknis: "\n\nProvide a technical explanation.", 
                    analogi: "\n\nUse analogies." 
                };
                prompt += toneInstructions[appConfig.responseTone] || '';
            }

            callGeminiStream(prompt, cleanedContent, 'answer');
        });
    }

    function getExplanation() {
        chrome.storage.local.get(currentTab.id.toString(), (result) => {
            const currentState = result[currentTab.id.toString()];
            if (!currentState || !currentState.cleanedContent) return;
            explanationButton.disabled = true;
            retryExplanationButton.disabled = true;
            show(explanationContainer);
            explanationDisplay.innerHTML = `<div class="loading-message">The AI is thinking...</div>`;
            streamingExplanationText = '';
            let prompt = appConfig.customPrompts?.explanation || EXPLANATION_PROMPT;
            
            // Apply general response tone if set
            if (appConfig.responseTone && appConfig.responseTone !== 'normal') {
                const toneInstructions = { 
                    sederhana: "\n\nExplain it simply.", 
                    teknis: "\n\nProvide a technical explanation.", 
                    analogi: "\n\nUse analogies." 
                };
                prompt += toneInstructions[appConfig.responseTone] || '';
            }

            callGeminiStream(prompt, currentState.cleanedContent, 'explanation');
        });
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'geminiStreamUpdate') {
            const { payload, purpose } = request;
            let targetDisplay;
            // Determine target display based on purpose
            if (purpose === 'cleaning') targetDisplay = contentDisplay;
            else if (purpose === 'answer' || purpose === 'quiz_answer') targetDisplay = answerDisplay;
            else if (purpose === 'explanation') targetDisplay = explanationDisplay;
            else if (['summarize_action', 'explain_action', 'translate_action', 'define_action'].includes(purpose)) {
                // For context menu actions, display directly in answerDisplay
                targetDisplay = answerDisplay;
                if (payload.chunk) {
                    // Clear message area and set initial UI if first chunk for context action
                    if (messageArea.classList.contains('hidden') === false) { // check if messageArea is visible
                        hide(messageArea);
                        show(contentDisplayWrapper); // contentDisplayWrapper for showing the selected text
                        show(answerContainer); // answerContainer for the AI response
                        // Revisi di sini: Memastikan request.payload.userContent selalu string
                        contentDisplay.innerHTML = `<strong>Selected Text:</strong><br>${escapeHtml(request.payload.userContent || 'No text selected.')}<br><hr>`; // Display selected text
                        targetDisplay.innerHTML = ''; // Clear loading message from answerDisplay
                    }
                }
            }


            if (payload.success) {
                if (payload.chunk) {
                    if (targetDisplay.querySelector('.loading-message')) targetDisplay.innerHTML = '';
                    targetDisplay.textContent += payload.chunk;
                } else if (payload.done) {
                    const fullText = payload.fullText || targetDisplay.textContent;
                    
                    if (purpose === 'cleaning') {
                        const formattedHtml = formatAIResponse(fullText);
                        targetDisplay.innerHTML = formattedHtml;
                        hide(messageArea);
                        show(contentDisplayWrapper);
                        show(answerContainer);
                        answerDisplay.innerHTML = `<div class="loading-message">Step 2/2: Getting answer...</div>`;
                        saveState({ cleanedContent: fullText }).then(getAnswer);
                    } else if (purpose === 'answer' || purpose === 'quiz_answer') {
                        const answerMatch = fullText.match(/Answer:(.*?)(Confidence:|Reason:|$)/is);
                        const confidenceMatch = fullText.match(/Confidence:\s*(High|Medium|Low)/i);
                        const reasonMatch = fullText.match(/Reason:(.*)/is);

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
                        hide(explanationContainer); // Hide explanation container if it's a new answer
                        
                        if (appConfig.autoHighlight && answerText) {
                            chrome.tabs.sendMessage(currentTab.id, { action: 'highlight-answer', text: answerText });
                        }
                        saveState({ answerHTML: formattedHtml, explanationHTML: '' }).then(() => saveToHistory({ cleanedContent: fullText, answerHTML: formattedHtml, explanationHTML: '' }, 'quiz')); // Save as quiz action

                    } else if (purpose === 'explanation') {
                        const formattedHtml = formatAIResponse(fullText);
                        targetDisplay.innerHTML = formattedHtml;
                        explanationButton.disabled = false;
                        retryExplanationButton.disabled = false;
                        saveState({ explanationHTML: formattedHtml }).then(() => saveToHistory({ cleanedContent: 'N/A', answerHTML: formattedHtml, explanationHTML: '' }, 'explanation')); // Save explanation

                    } else if (['summarize_action', 'explain_action', 'translate_action', 'define_action'].includes(purpose)) {
                        // For context menu actions, the fullText is the direct answer.
                        const formattedHtml = formatAIResponse(fullText);
                        targetDisplay.innerHTML = formattedHtml;
                        // Hide the "Get Explanation" button for these direct actions
                        hide(aiActionsWrapper); 
                        hide(explanationContainer); // Ensure explanation is hidden

                        // Save this action to history
                        // Pass the original selected text to cleanedContent for history context
                        const originalSelectedText = request.payload.userContent; 
                        saveToHistory({ 
                            cleanedContent: originalSelectedText, 
                            answerHTML: formattedHtml, 
                            explanationHTML: '' 
                        }, purpose.replace('_action', '')); // Save purpose without '_action'
                    }
                }
            } else {
                // Revisi di sini: Memastikan payload.error selalu berupa string
                (targetDisplay || messageArea).innerHTML = `<div class="error-message"><strong>Error:</strong> ${escapeHtml(payload.error || 'An unknown error occurred during AI streaming.')}</div>`;
                if (purpose === 'answer' || purpose === 'quiz_answer') retryAnswerButton.disabled = false;
                if (purpose === 'explanation') { explanationButton.disabled = false; retryExplanationButton.disabled = false; }
            }
        }
        return true;
    });

    async function initialize() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) { displayError(`<div class="error-message">Could not find an active tab.</div>`); return; }
        currentTab = tab;

        // Load config including new 'responseTone'
        appConfig = await chrome.storage.sync.get(['geminiApiKey', 'responseTone', 'temperature', 'customPrompts', 'autoHighlight']);
        if (!appConfig.geminiApiKey) { showSetupView(); return; }

        try {
            await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files: ['js/content.js'] });
            await chrome.scripting.insertCSS({ target: { tabId: currentTab.id }, files: ['assets/highlighter.css'] });
        } catch (e) {
            displayError(`<div class="error-message">Cannot run on this page. Try on a different website (e.g., a news article).</div>`);
            return;
        }

        const contextKey = `contextSelection_${currentTab.id}`;
        const actionKey = `contextAction_${currentTab.id}`; // Get context action key
        const contextData = await chrome.storage.local.get([contextKey, actionKey]);

        // Check if popup was opened from context menu
        if (contextData[contextKey] && contextData[actionKey]) {
            const selectedText = contextData[contextKey];
            const actionType = contextData[actionKey];
            // Clear context data from storage
            await chrome.storage.local.remove([contextKey, actionKey, currentTab.id.toString()]);
            // Run scan with specific action
            runInitialScan(selectedText, actionType);
        } else {
            // Standard flow: check saved state or perform new scan
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