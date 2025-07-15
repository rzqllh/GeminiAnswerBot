// background.js

// --- INSTALLATION & BASIC EVENTS ---
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
  chrome.contextMenus.create({
    id: "gemini-answer-selection",
    title: "Answer with GeminiAnswerBot",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "gemini-answer-selection" && info.selectionText) {
    const storageKey = `contextSelection_${tab.id}`;
    chrome.storage.local.set({ [storageKey]: info.selectionText }, () => {
      chrome.action.openPopup();
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const contextKey = `contextSelection_${tabId}`;
  const stateKey = tabId.toString();
  chrome.storage.local.remove([stateKey, contextKey]);
});

// --- CORE API CALL FUNCTION (CENTRALIZED & OPTIMIZED) ---
async function performApiCall(apiKey, model, systemPrompt, userContent, generationConfig = {}) {
  const endpoint = 'generateContent';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${apiKey}`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [{
      role: "user",
      parts: [{ text: userContent }]
    }],
    generationConfig: generationConfig
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.error?.message || `Request failed with status ${response.status}`);
    }

    const result = await response.json();
    const fullText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!fullText.trim()) {
        throw new Error("The AI returned an empty response.");
    }

    return { success: true, text: fullText };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// --- MESSAGE LISTENER FROM POPUP & OPTIONS ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callGemini') {
    const { systemPrompt, userContent, generationConfig } = request.payload;
    
    chrome.storage.sync.get(['geminiApiKey', 'selectedModel'], async (config) => {
      if (!config.geminiApiKey) {
        sendResponse({ success: false, error: 'API Key has not been set.' });
        return;
      }
      
      const model = config.selectedModel || 'gemini-1.5-flash-latest';
      const result = await performApiCall(config.geminiApiKey, model, systemPrompt, userContent, generationConfig);
      sendResponse(result);
    });
    
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'testApiConnection') {
    const { apiKey } = request.payload;
    const testModel = 'gemini-1.5-flash-latest';
    const testPrompt = "If you receive the text 'Test', respond with only the word 'OK'.";
    const testContent = "Test";

    performApiCall(apiKey, testModel, testPrompt, testContent).then(sendResponse);
    return true; // Keep message channel open for async response
  }
});