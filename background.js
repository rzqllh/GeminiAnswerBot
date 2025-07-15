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

// --- CORE API CALL FUNCTION (CENTRALIZED & STREAM-SUPPORTED) ---
async function performApiCall(apiKey, model, systemPrompt, userContent, generationConfig = {}, streamCallback) {
  const endpoint = 'streamGenerateContent';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${apiKey}&alt=sse`;

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

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
      for (const line of lines) {
        try {
          const jsonStr = line.substring(6);
          const data = JSON.parse(jsonStr);
          const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textPart) {
            fullText += textPart;
            streamCallback({ success: true, chunk: textPart });
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }

    if (!fullText.trim()) {
      throw new Error("The AI returned an empty response.");
    }
    
    streamCallback({ success: true, done: true, fullText: fullText });

  } catch (error) {
    streamCallback({ success: false, error: error.message });
  }
}

// --- MESSAGE LISTENER FROM POPUP & OPTIONS ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callGeminiStream') {
    const { systemPrompt, userContent, generationConfig } = request.payload;
    
    chrome.storage.sync.get(['geminiApiKey', 'selectedModel'], async (config) => {
      if (!config.geminiApiKey) {
        sendResponse({ success: false, error: 'API Key has not been set.' });
        return;
      }
      
      const model = config.selectedModel || 'gemini-1.5-flash-latest';
      
      const streamCallback = (streamData) => {
        // === KESALAHAN FATAL ADA DI SINI DAN SEKARANG SUDAH DIPERBAIKI ===
        // Mengirim pesan ke seluruh bagian ekstensi (termasuk popup)
        // BUKAN ke content script tab saja.
        chrome.runtime.sendMessage({
           action: 'geminiStreamUpdate',
           payload: streamData,
           purpose: request.purpose 
        });
        // =================================================================
      };

      await performApiCall(config.geminiApiKey, model, systemPrompt, userContent, generationConfig, streamCallback);
    });
    
    return true; 
  }
  
  if (request.action === 'testApiConnection') {
    const { apiKey } = request.payload;
    const testModel = 'gemini-1.5-flash-latest';
    const testContent = "Please reply with only the word 'OK' and nothing else.";
    const endpoint = 'generateContent';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:${endpoint}?key=${apiKey}`;

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: testContent }] }] })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => {
                throw new Error(err.error?.message || `HTTP Error: ${res.status}`);
            });
        }
        return res.json();
    })
    .then(result => {
       const text = result.candidates?.[0]?.content?.parts?.[0]?.text.trim() || "";
       if (text.toUpperCase() === 'OK') {
         sendResponse({ success: true, text: "Connection successful!" });
       } else {
         sendResponse({ success: false, error: `Test failed. AI responded with: "${text}"` });
       }
    })
    .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }
});