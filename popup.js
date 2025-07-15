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
  const rescanButton = document.getElementById('rescanButton'); // Tombol baru
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

  // --- Core Logic & API Calls ---
  async function callGemini(prompt, contentText) {
    const generationConfig = {
        temperature: appConfig.temperature !== undefined ? appConfig.temperature : 0.4,
    };
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'callGemini', payload: { systemPrompt: prompt, userContent: contentText, generationConfig } },
        (response) => {
          if (chrome.runtime.lastError) return reject(new Error(`Connection failed: ${chrome.runtime.lastError.message}`));
          if (response && response.success) resolve(response.text);
          else reject(new Error(response.error || 'An unknown error occurred.'));
        }
      );
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
        const cleanedContent = await callGemini(cleaningPrompt, textToSendToAI);
        
        contentDisplay.innerHTML = formatAIResponse(cleanedContent);
        show(contentDisplayWrapper);
        hide(messageArea);
        
        await saveState({ cleanedContent });
        
        await getAnswer(true);

    } catch (error) {
        hide(messageArea);
        displayError(contentDisplay, `<div class="error-message"><strong>Failed to clean content:</strong> ${escapeHtml(error.message)}</div>`);
    }
  }
  
  async function getAnswer(isInitialRun = false) {
    if (isInitialRun) {
        show(answerContainer);
        answerDisplay.innerHTML = `<div class="loading-message">Step 2/2: Getting answer...</div>`;
    } else {
        retryAnswerButton.disabled = true;
        answerDisplay.innerHTML = `<div class="loading-message">AI is re-thinking the answer...</div>`;
        hide(aiActionsWrapper);
    }

    try {
        const state = await chrome.storage.local.get(currentTab.id.toString());
        const cleanedContent = state[currentTab.id.toString()]?.cleanedContent;
        if (!cleanedContent) throw new Error("Cleaned content not available.");

        const answerPrompt = appConfig.customPrompts?.answer || ANSWER_PROMPT;
        const resultText = await callGemini(answerPrompt, cleanedContent);
        
        const answerMatch = resultText.match(/Answer:([\s\S]*?)Confidence:/);
        const confidenceMatch = resultText.match(/Confidence:\s*(High|Medium|Low)/i);
        const reasonMatch = resultText.match(/Reason:([\s\S]*)/);
        const answer = answerMatch ? answerMatch[1].trim() : resultText;
        const confidence = confidenceMatch ? confidenceMatch[1].toLowerCase() : null;
        const reason = reasonMatch ? reasonMatch[1].trim() : null;
        let confidenceHTML = '';
        if (confidence && reason) {
            confidenceHTML = `<div class="confidence-wrapper"><strong>Confidence Level:</strong> <span class="confidence-badge confidence-${confidence}">${confidence.charAt(0).toUpperCase() + confidence.slice(1)}</span><div class="confidence-reason">${escapeHtml(reason)}</div></div>`;
        }
        const answerHTML = formatAIResponse(answer) + confidenceHTML;
        answerDisplay.innerHTML = answerHTML;
        show(aiActionsWrapper);
        hide(explanationContainer);

        chrome.tabs.sendMessage(currentTab.id, { action: 'highlight-answer', text: answer });
        
        const newState = await saveState({ answerHTML, explanationHTML: '' });
        await saveToHistory(newState);

    } catch(error) {
        displayError(answerDisplay, `<div class="error-message"><strong>Failed to get answer:</strong> ${escapeHtml(error.message)}</div>`);
    } finally {
        retryAnswerButton.disabled = false;
    }
  }


  async function getExplanation() {
      const state = await chrome.storage.local.get(currentTab.id.toString());
      const currentState = state[currentTab.id.toString()];
      if (!currentState || !currentState.cleanedContent) return;

      explanationButton.disabled = true;
      retryExplanationButton.disabled = true;
      show(explanationContainer);
      explanationDisplay.innerHTML = `<div class="loading-message">The AI is thinking...</div>`;

      try {
          let prompt = appConfig.customPrompts?.explanation || EXPLANATION_PROMPT;
          if (appConfig.explanationTone && appConfig.explanationTone !== 'normal') {
              const toneInstructions = { sederhana: "\n\nExplain it simply.", teknis: "\n\nProvide a technical explanation.", analogi: "\n\nUse analogies." };
              prompt += toneInstructions[appConfig.explanationTone] || '';
          }

          const resultText = await callGemini(prompt, currentState.cleanedContent);
          const explanationHTML = formatAIResponse(resultText);
          explanationDisplay.innerHTML = explanationHTML;
          
          const newState = await saveState({ explanationHTML });
          await saveToHistory(newState);

      } catch (error) {
          displayError(explanationDisplay, `<div class="error-message">${escapeHtml(error.message)}</div>`);
      } finally {
          explanationButton.disabled = false;
          retryExplanationButton.disabled = false;
      }
  }

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