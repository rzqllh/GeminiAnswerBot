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
  // To hold the full text from the stream
  let streamingAnswerText = '';
  let streamingExplanationText = '';

  // --- Helper & Utility Functions ---
  function show(element) { if (element) element.classList.remove('hidden'); }
  function hide(element) { if (element) element.classList.add('hidden'); }
  function escapeHtml(unsafe) { return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
  
  function displayError(element, htmlMessage) {
    if (element) {
      element.innerHTML = htmlMessage;
      if(element.parentElement) show(element.parentElement);
      const link = element.querySelector('.error-link');
      if (link) link.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage() });
    }
  }

  function formatAIResponse(text) {
    let processedText = text.replace(/```[\s\S]*?```/g, '~~~CODE_BLOCK~~~');
    processedText = escapeHtml(processedText).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/^\s*[\*\-]\s(.*)/gm, '<li>$1</li>');
    processedText = processedText.replace(/<\/li>\s*<li>/g, '</li><li>');
    const listRegex = /(<li>.*<\/li>)/s;
    if (listRegex.test(processedText)) processedText = processedText.replace(listRegex, '<ul>$1</ul>');
    processedText = processedText.replace(/\n/g, '<br>');
    const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
    codeBlocks.forEach(block => {
        const language = (block.match(/^```(\w+)\n/) || [])[1] || '';
        const cleanCode = block.replace(/^```\w*\n|```$/g, '');
        const codeHtml = `<div class="code-block-wrapper"><button class="copy-code-button" title="Copy Code Snippet"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span></button><pre><code class="language-${language}">${escapeHtml(cleanCode.trim())}</code></pre></div>`;
        processedText = processedText.replace('~~~CODE_BLOCK~~~', codeHtml);
    });
    return processedText.replace(/<br>\s*<ul>/g, '<ul>').replace(/<\/ul>\s*<br>/g, '</ul>');
  }

  // --- Core Logic & API Calls (Now for Streaming) ---
  function callGeminiStream(prompt, contentText, purpose) {
      const generationConfig = {
          temperature: appConfig.temperature !== undefined ? appConfig.temperature : 0.4,
      };
      // Send a message to background to START the stream
      chrome.runtime.sendMessage({
          action: 'callGeminiStream',
          payload: { systemPrompt: prompt, userContent: contentText, generationConfig },
          purpose: purpose // e.g., 'answer', 'explanation', 'cleaning'
      });
  }

  // --- State & History Management ---
  async function saveState(data) {
    if (!currentTab) return;
    const key = currentTab.id.toString();
    const currentState = (await chrome.storage.local.get(key))[key] || {};
    const newState = { ...currentState, ...data };
    await chrome.storage.local.set({ [key]: newState });
    return newState;
  }

  async function saveToHistory(stateData) {
    const { history = [] } = await chrome.storage.local.get('history');
    const newEntry = {
      id: Date.now(),
      cleanedContent: stateData.cleanedContent,
      answerHTML: stateData.answerHTML,
      explanationHTML: stateData.explanationHTML || '',
      url: currentTab.url,
      title: currentTab.title,
      timestamp: new Date().toISOString()
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
  async function runInitialScan(contentFromContextMenu = null) {
    hide(contentDisplayWrapper); hide(answerContainer); hide(explanationContainer); hide(aiActionsWrapper);
    show(messageArea);
    messageArea.innerHTML = `<div class="loading-message">Step 1/2: Cleaning content...</div>`;

    try {
        let textToSendToAI;
        if (contentFromContextMenu) {
            textToSendToAI = contentFromContextMenu;
        } else {
            const response = await chrome.tabs.sendMessage(currentTab.id, { action: "get_page_content" });
            if (chrome.runtime.lastError || !response || !response.content) throw new Error("Failed to read content from the page.");
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = response.content.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>|<\/div>|<\/li>/gi, '\n');
            textToSendToAI = tempDiv.innerText;
        }
        
        const cleaningPrompt = appConfig.customPrompts?.cleaning || CLEANING_PROMPT;
        // Start the stream for "cleaning"
        callGeminiStream(cleaningPrompt, textToSendToAI, 'cleaning');

    } catch (error) {
        hide(messageArea);
        displayError(contentDisplay, `<div class="error-message"><strong>Failed to clean content:</strong> ${escapeHtml(error.message)}</div>`);
    }
  }
  
  function getAnswer(isInitialRun = false) {
    const stateKey = currentTab.id.toString();
    chrome.storage.local.get(stateKey, (result) => {
        const cleanedContent = result[stateKey]?.cleanedContent;
        if (!cleanedContent) {
            displayError(answerDisplay, `<div class="error-message"><strong>Error:</strong> Cleaned content not found.</div>`);
            return;
        }

        if (isInitialRun) {
            show(answerContainer);
        } else {
            hide(aiActionsWrapper);
        }
        
        retryAnswerButton.disabled = true;
        answerDisplay.innerHTML = `<div class="loading-message">The AI is thinking...</div>`;
        streamingAnswerText = ''; // Reset buffer

        const answerPrompt = appConfig.customPrompts?.answer || ANSWER_PROMPT;
        callGeminiStream(answerPrompt, cleanedContent, 'answer');
    });
  }

  function getExplanation() {
      const stateKey = currentTab.id.toString();
      chrome.storage.local.get(stateKey, (result) => {
        const currentState = result[stateKey];
        if (!currentState || !currentState.cleanedContent) return;

        explanationButton.disabled = true;
        retryExplanationButton.disabled = true;
        show(explanationContainer);
        explanationDisplay.innerHTML = `<div class="loading-message">The AI is thinking...</div>`;
        streamingExplanationText = ''; // Reset buffer

        let prompt = appConfig.customPrompts?.explanation || EXPLANATION_PROMPT;
        if (appConfig.explanationTone && appConfig.explanationTone !== 'normal') {
            const toneInstructions = { sederhana: "\n\nExplain it simply.", teknis: "\n\nProvide a technical explanation.", analogi: "\n\nUse analogies." };
            prompt += toneInstructions[appConfig.explanationTone] || '';
        }
        callGeminiStream(prompt, currentState.cleanedContent, 'explanation');
      });
  }
  
  // --- LISTEN FOR STREAMING UPDATES FROM BACKGROUND.JS ---
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'geminiStreamUpdate') {
          const { payload, purpose } = request;
          
          if (payload.success) {
              if (payload.chunk) {
                  // A new piece of text has arrived
                  if (purpose === 'cleaning') {
                      if (contentDisplay.querySelector('.loading-message')) contentDisplay.innerHTML = '';
                      contentDisplay.textContent += payload.chunk;
                  } else if (purpose === 'answer') {
                      if (answerDisplay.querySelector('.loading-message')) answerDisplay.innerHTML = '';
                      streamingAnswerText += payload.chunk;
                      answerDisplay.textContent += payload.chunk;
                  } else if (purpose === 'explanation') {
                      if (explanationDisplay.querySelector('.loading-message')) explanationDisplay.innerHTML = '';
                      streamingExplanationText += payload.chunk;
                      explanationDisplay.textContent += payload.chunk;
                  }
              } else if (payload.done) {
                  // The stream for this purpose is complete
                  if (purpose === 'cleaning') {
                      const cleanedContent = payload.fullText;
                      contentDisplay.innerHTML = formatAIResponse(cleanedContent);
                      show(contentDisplayWrapper);
                      hide(messageArea);
                      saveState({ cleanedContent }).then(() => {
                        getAnswer(true); // Automatically start getting the answer
                      });
                  } else if (purpose === 'answer') {
                      const answerHTML = formatAIResponse(streamingAnswerText);
                      answerDisplay.innerHTML = answerHTML;
                      retryAnswerButton.disabled = false;
                      show(aiActionsWrapper);
                      hide(explanationContainer);
                      
                      const answerMatch = streamingAnswerText.match(/Answer:([\s\S]*?)(Confidence:|Reason:|$)/);
                      const plainAnswer = answerMatch ? answerMatch[1].trim() : '';
                      if (plainAnswer) {
                        chrome.tabs.sendMessage(currentTab.id, { action: 'highlight-answer', text: plainAnswer });
                      }

                      saveState({ answerHTML, explanationHTML: '' }).then(newState => saveToHistory(newState));
                  } else if (purpose === 'explanation') {
                      const explanationHTML = formatAIResponse(streamingExplanationText);
                      explanationDisplay.innerHTML = explanationHTML;
                      explanationButton.disabled = false;
                      retryExplanationButton.disabled = false;
                      
                      saveState({ explanationHTML }).then(newState => saveToHistory(newState));
                  }
              }
          } else {
              // An error occurred
              const errorMessage = `<div class="error-message"><strong>Error:</strong> ${escapeHtml(payload.error)}</div>`;
              if (purpose === 'cleaning') displayError(contentDisplay, errorMessage);
              else if (purpose === 'answer') displayError(answerDisplay, errorMessage);
              else if (purpose === 'explanation') displayError(explanationDisplay, errorMessage);
          }
      }
  });


  // --- Initialization ---
  async function initializePopup() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) { messageArea.innerHTML = `<div class="error-message">Could not find an active tab.</div>`; return; }
      currentTab = tab;

      appConfig = await chrome.storage.sync.get(['geminiApiKey', 'explanationTone', 'temperature', 'customPrompts']);
      if (!appConfig.geminiApiKey) { showSetupView(); return; }

      try {
          await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files: ['content.js'] });
          await chrome.scripting.insertCSS({ target: { tabId: currentTab.id }, files: ['highlighter.css'] });
      } catch (e) { messageArea.innerHTML = `<div class="error-message">Cannot run on this page. Try reloading the page or using it on a different website.</div>`; return; }
      
      const contextKey = `contextSelection_${currentTab.id}`;
      const contextData = await chrome.storage.local.get(contextKey);
      
      if (contextData[contextKey]) {
          await chrome.storage.local.remove(contextKey);
          await chrome.storage.local.remove(currentTab.id.toString());
          runInitialScan(contextData[contextKey]);
      } else {
        const savedState = await chrome.storage.local.get(currentTab.id.toString());
        if (savedState[currentTab.id.toString()] && savedState[currentTab.id.toString()].cleanedContent) {
          restoreUiFromState(savedState[currentTab.id.toString()]);
        } else {
          runInitialScan();
        }
      }
  }

   function showSetupView() {
    hide(contentDisplayWrapper); hide(answerContainer); hide(explanationContainer); hide(aiActionsWrapper);
    const setupHTML = `<div class="initial-view"><svg class="initial-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9z"></path><line x1="12" y1="18" x2="12" y2="22"></line><line x1="12" y1="2" x2="12" y2="6"></line></svg><h2 style="margin-bottom: 5px;">Setup Required</h2><p>You need to enter a Gemini API Key to get started.</p><button id="openOptionsButton" class="setup-button">Open Settings Page</button></div>`;
    messageArea.innerHTML = setupHTML;
    document.getElementById('openOptionsButton').addEventListener('click', () => chrome.runtime.openOptionsPage());
  }
  
  // --- Event Listeners ---
  if (settingsButton) settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
  if (historyButton) historyButton.addEventListener('click', () => chrome.tabs.create({ url: 'history.html' }));
  if (rescanButton) rescanButton.addEventListener('click', async () => {
    if (currentTab) {
        await chrome.storage.local.remove(currentTab.id.toString());
        // Reset buffers
        streamingAnswerText = '';
        streamingExplanationText = '';
        runInitialScan();
    }
  });
  if (explanationButton) explanationButton.addEventListener('click', getExplanation);
  if (retryAnswerButton) retryAnswerButton.addEventListener('click', () => getAnswer(false));
  if (retryExplanationButton) retryExplanationButton.addEventListener('click', getExplanation);
  
  container.addEventListener('click', (event) => {
      const copyBtn = event.target.closest('.copy-code-button');
      if (copyBtn) {
          const codeElement = copyBtn.closest('.code-block-wrapper')?.querySelector('code');
          if (codeElement) {
              navigator.clipboard.writeText(codeElement.innerText);
              const span = copyBtn.querySelector('span');
              span.textContent = 'Copied!';
              copyBtn.classList.add('copied');
              setTimeout(() => { span.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2000);
          }
      }
  });

  initializePopup();
});