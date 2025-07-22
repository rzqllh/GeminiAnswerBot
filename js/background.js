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
  console.log("Background Script: performApiCall started."); // Debugging
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
  const id = setTimeout(() => controller.abort(), 60000); // Timeout setelah 60 detik (1 menit)

  try {
    console.log("Background Script: Fetching API URL:", apiUrl); // Debugging
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal // Kaitkan signal controller dengan fetch
    });

    clearTimeout(id); // Bersihkan timeout jika fetch berhasil

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Background Script: API error response:", errorBody); // Debugging
      // Handle specific API errors for better user feedback
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
            // console.log("Background Script: Received chunk."); // Debugging: terlalu banyak log jika diaktifkan
          }
        } catch (e) {
          // Ignore parsing errors for malformed stream chunks or partial data
          console.warn("Background Script: Error parsing stream chunk:", e); // Debugging
        }
      }
    }

    if (!fullText.trim()) {
      throw new Error("The AI returned an empty response. (Mungkin tidak ada jawaban yang relevan)");
    }
    
    console.log("Background Script: Stream completed successfully."); // Debugging
    streamCallback({ success: true, done: true, fullText: fullText });

  } catch (error) {
    clearTimeout(id); // Bersihkan timeout jika terjadi error
    console.error("Background Script: Error during API call:", error); // Debugging
    if (error.name === 'AbortError') {
      streamCallback({ success: false, error: 'Permintaan API dibatalkan karena timeout (lebih dari 60 detik). Mungkin masalah jaringan atau AI terlalu sibuk.' });
    } else {
      streamCallback({ success: false, error: error.message });
    }
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callGeminiStream') {
    console.log("Background Script: Received 'callGeminiStream' request."); // Debugging
    const { systemPrompt, userContent, generationConfig, originalUserContent } = request.payload; 
    
    chrome.storage.sync.get(['geminiApiKey', 'selectedModel'], async (config) => {
      if (!config.geminiApiKey) {
        console.error("Background Script: API Key not set."); // Debugging
        sendResponse({ success: false, error: 'API Key has not been set.' });
        return;
      }
      
      const model = config.selectedModel || 'gemini-1.5-flash-latest';
      
      const streamCallback = (streamData) => {
        // console.log("Background Script: Sending stream update to popup."); // Debugging: terlalu banyak log jika diaktifkan
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
    console.log("Background Script: Received 'testApiConnection' request."); // Debugging
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
                // Handle specific test API errors
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