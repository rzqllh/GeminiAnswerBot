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
  // Use the streaming endpoint
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

    // Read the stream
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      // Process SSE data format
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
      for (const line of lines) {
        try {
          const jsonStr = line.substring(6); // Remove "data: "
          const data = JSON.parse(jsonStr);
          const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textPart) {
            fullText += textPart;
            // Send chunk back to the caller
            streamCallback({ success: true, chunk: textPart });
          }
        } catch (e) {
          // Ignore parsing errors for incomplete JSON chunks
        }
      }
    }

    if (!fullText.trim()) {
      throw new Error("The AI returned an empty response.");
    }
    
    // Signal that the stream is complete
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
        // This is a single response, so sendResponse is fine
        sendResponse({ success: false, error: 'API Key has not been set.' });
        return;
      }
      
      const model = config.selectedModel || 'gemini-1.5-flash-latest';
      
      // The callback function that sends messages back to the popup
      const streamCallback = (streamData) => {
        if (sender.tab?.id) {
           chrome.tabs.sendMessage(sender.tab.id, {
               action: 'geminiStreamUpdate',
               payload: streamData,
               // Associate the response with the original request's purpose
               purpose: request.purpose 
           });
        }
      };

      await performApiCall(config.geminiApiKey, model, systemPrompt, userContent, generationConfig, streamCallback);
    });
    
    // Return true to indicate we will respond asynchronously (though we won't use sendResponse)
    return true; 
  }
  
  // Test connection remains a simple non-streaming call
  if (request.action === 'testApiConnection') {
    const { apiKey } = request.payload;
    const testModel = 'gemini-1.5-flash-latest';
    const testPrompt = "If you receive the text 'Test', respond with only the word 'OK'.";
    const testContent = "Test";
    const endpoint = 'generateContent';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:${endpoint}?key=${apiKey}`;

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: testContent }] }] })
    })
    .then(res => res.json())
    .then(result => {
       const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
       if (text.includes("OK")) {
         sendResponse({ success: true, text });
       } else {
         sendResponse({ success: false, error: result.error?.message || "Test failed" });
       }
    })
    .catch(err => sendResponse({ success: false, error: err.message }));

    return true; // Keep message channel open for async response
  }
});