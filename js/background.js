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
    id: "gemini-answer-rephrase",
    parentId: "gemini-answer-selection-parent",
    title: "Rephrase this",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.selectionText && info.menuItemId.startsWith("gemini-answer-")) {
    const actionType = info.menuItemId.replace("gemini-answer-", ""); // e.g., "summarize", "rephrase"
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

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 60000); // Timeout setelah 60 detik

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(id);

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Background Script: API error response:", errorBody);
      let errorMessage = errorBody.error?.message || `Request failed with status ${response.status}`;
      if (errorMessage.includes("API key not valid")) {
          errorMessage = "Kunci API tidak valid. Periksa pengaturan Anda.";
      } else if (errorMessage.includes("The model is overloaded")) {
          errorMessage = "Model AI saat ini sedang sibuk (overloaded). Silakan coba lagi sebentar.";
      } else if (errorMessage.includes("quota")) {
          errorMessage = "Batas penggunaan API tercapai. Silakan periksa kuota Anda di Google Cloud Console.";
      } else if (response.status === 400 && errorMessage.includes("Unsupported content")) {
          errorMessage = "Konten tidak didukung oleh model AI. Coba berikan teks yang berbeda atau lebih singkat.";
      }
      throw new Error(errorMessage);
    }
    
    // **IMPROVEMENT**: Check if the response body is available for reading
    if (!response.body) {
        throw new Error("Respons dari API tidak valid (body kosong).");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let streamBegun = false;

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        // **IMPROVEMENT**: If the stream ends without sending any actual content
        if (!streamBegun) {
            throw new Error("AI tidak memberikan respons yang valid atau koneksi terputus.");
        }
        break;
      }
      
      streamBegun = true;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
      
      for (const line of lines) {
        try {
          const jsonStr = line.substring(6);
          const data = JSON.parse(jsonStr);
          // Check for specific API errors within the stream
          if (data.candidates === undefined && data.promptFeedback) {
            const blockReason = data.promptFeedback?.blockReason;
            if (blockReason) {
              throw new Error(`Permintaan diblokir oleh AI karena alasan keamanan: ${blockReason}.`);
            }
          }
          const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textPart) {
            fullText += textPart;
            streamCallback({ success: true, chunk: textPart });
          }
        } catch (e) {
          // If a specific error was thrown, propagate it
          if (e.message.includes("Permintaan diblokir")) {
            throw e;
          }
          console.warn("Background Script: Error parsing stream chunk:", e);
        }
      }
    }

    if (!fullText.trim()) {
      throw new Error("AI memberikan respons kosong. Coba ajukan pertanyaan yang berbeda.");
    }
    
    streamCallback({ success: true, done: true, fullText: fullText });

  } catch (error) {
    clearTimeout(id);
    console.error("Background Script: Error during API call:", error);
    const errorMessage = error.name === 'AbortError' 
      ? 'Permintaan API dibatalkan karena timeout (lebih dari 60 detik). Mungkin masalah jaringan atau AI terlalu sibuk.'
      : error.message;
    streamCallback({ success: false, error: errorMessage });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callGeminiStream') {
    const { systemPrompt, userContent, generationConfig, originalUserContent } = request.payload; 
    
    chrome.storage.sync.get(['geminiApiKey', 'selectedModel'], async (config) => {
      if (!config.geminiApiKey) {
        // This case is handled in popup.js, but as a fallback:
        chrome.runtime.sendMessage({
           action: 'geminiStreamUpdate',
           payload: { success: false, error: 'API Key has not been set.' }, 
           purpose: request.purpose 
        });
        return;
      }
      
      const model = config.selectedModel || 'gemini-1.5-flash-latest';
      
      const streamCallback = (streamData) => {
        chrome.runtime.sendMessage({
           action: 'geminiStreamUpdate',
           payload: { ...streamData, originalUserContent: originalUserContent }, 
           purpose: request.purpose 
        });
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
                let errorMessage = err.error?.message || `HTTP Error: ${res.status}`;
                if (errorMessage.includes("API key not valid")) {
                    errorMessage = "Kunci API tidak valid. Periksa kembali kunci Anda.";
                } else if (errorMessage.includes("quota")) {
                    errorMessage = "Batas penggunaan API tercapai. Periksa kuota Anda.";
                }
                throw new Error(errorMessage);
            });
        }
        return res.json();
    })
    .then(result => {
       const text = result.candidates?.[0]?.content?.parts?.[0]?.text.trim() || "";
       if (text.toUpperCase() === 'OK') {
         sendResponse({ success: true, text: "Koneksi berhasil! AI merespons dengan baik." });
       } else {
         sendResponse({ success: false, error: `Tes gagal. AI merespons dengan tidak terduga: "${text}"` });
       }
    })
    .catch(err => sendResponse({ success: false, error: err.message }));

    return true; 
  }
});