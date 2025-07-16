// js/background.js

// --- INSTALLATION & BASIC EVENTS ---
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
  
  // Create parent context menu item
  chrome.contextMenus.create({
    id: "gemini-answer-selection-parent",
    title: "Ask GeminiAnswerBot",
    contexts: ["selection"]
  });

  // Create sub-menu items
  chrome.contextMenus.create({
    id: "gemini-answer-summarize",
    parentId: "gemini-answer-selection-parent",
    title: "Summarize this",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "gemini-answer-explain",
    parentId: "gemini-answer-selection-parent",
    title: "Explain this",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "gemini-answer-translate",
    parentId: "gemini-answer-selection-parent",
    title: "Translate this",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "gemini-answer-define",
    parentId: "gemini-answer-selection-parent",
    title: "Define this",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.selectionText && info.menuItemId.startsWith("gemini-answer-")) {
    const actionType = info.menuItemId.replace("gemini-answer-", ""); // e.g., "summarize", "explain"
    const storageKeySelection = `contextSelection_${tab.id}`;
    const storageKeyAction = `contextAction_${tab.id}`; // Simpan jenis aksi

    chrome.storage.local.set({ 
      [storageKeySelection]: info.selectionText,
      [storageKeyAction]: actionType // Simpan aksi di sini
    }, () => {
      chrome.action.openPopup();
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const contextKey = `contextSelection_${tabId}`;
  const actionKey = `contextAction_${tabId}`; // Hapus juga kunci aksi
  const stateKey = tabId.toString();
  chrome.storage.local.remove([stateKey, contextKey, actionKey]); // Hapus semua kunci terkait tab
});

async function performApiCall(apiKey, model, systemPrompt, userContent, generationConfig = {}, streamCallback) {
  const endpoint = 'streamGenerateContent';
  // Menggunakan gemini-1.5-flash-latest sebagai default jika tidak ada model yang dipilih
  const resolvedModel = model || 'gemini-1.5-flash-latest';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:${endpoint}?key=${apiKey}&alt=sse`;

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
          // Ignore parsing errors for malformed stream chunks
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callGeminiStream') {
    const { systemPrompt, userContent, generationConfig, originalUserContent } = request.payload; // originalUserContent ditambahkan
    
    chrome.storage.sync.get(['geminiApiKey', 'selectedModel'], async (config) => {
      if (!config.geminiApiKey) {
        sendResponse({ success: false, error: 'API Key has not been set.' });
        return;
      }
      
      // Gunakan model yang dipilih dari pengaturan atau default
      const model = config.selectedModel || 'gemini-1.5-flash-latest';
      
      const streamCallback = (streamData) => {
        chrome.runtime.sendMessage({
           action: 'geminiStreamUpdate',
           payload: { ...streamData, originalUserContent: originalUserContent }, // originalUserContent diteruskan kembali
           purpose: request.purpose 
        });
      };

      await performApiCall(config.geminiApiKey, model, systemPrompt, userContent, generationConfig, streamCallback);
    });
    
    // Return true to indicate that sendResponse will be called asynchronously
    return true; 
  }
  
  if (request.action === 'testApiConnection') {
    const { apiKey } = request.payload;
    const testModel = 'gemini-1.5-flash-latest'; // Selalu gunakan model ringan untuk test koneksi
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

    return true; // Indicates that sendResponse will be called asynchronously
  }
});