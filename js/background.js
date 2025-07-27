// js/background.js

// Fungsi untuk membuat ulang menu konteks secara dinamis
async function updateContextMenus() {
  // Hapus semua menu yang ada untuk menghindari duplikasi
  await chrome.contextMenus.removeAll();

  // Buat menu induk
  chrome.contextMenus.create({
    id: "gemini-answer-parent",
    title: "GeminiAnswerBot Actions",
    contexts: ["selection"]
  });

  // Daftar aksi standar
  const standardActions = [
    { id: 'summarize', title: 'Summarize Selection' },
    { id: 'explain', title: 'Explain Selection' },
    { id: 'translate', title: 'Translate Selection' }
  ];

  standardActions.forEach(action => {
    chrome.contextMenus.create({
      id: action.id,
      parentId: "gemini-answer-parent",
      title: action.title,
      contexts: ["selection"]
    });
  });

  // Ambil pengaturan profil aktif untuk bahasa rephrase
  const { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
  const defaultLanguages = 'English, Indonesian';
  let rephraseLanguages = defaultLanguages;

  if (promptProfiles && activeProfile && promptProfiles[activeProfile] && promptProfiles[activeProfile].rephraseLanguages) {
    rephraseLanguages = promptProfiles[activeProfile].rephraseLanguages;
  } else if (promptProfiles && promptProfiles['Default'] && promptProfiles['Default'].rephraseLanguages) {
    rephraseLanguages = promptProfiles['Default'].rephraseLanguages;
  }

  const languages = rephraseLanguages.split(',').map(lang => lang.trim()).filter(lang => lang);

  // Jika ada bahasa untuk rephrase, buat menu dan sub-menunya
  if (languages.length > 0) {
    chrome.contextMenus.create({
      id: "rephrase-parent",
      parentId: "gemini-answer-parent",
      title: "Rephrase Selection into...",
      contexts: ["selection"]
    });

    languages.forEach(lang => {
      chrome.contextMenus.create({
        id: `rephrase-${lang}`, // ID unik untuk setiap bahasa, misal: "rephrase-English"
        parentId: "rephrase-parent",
        title: lang,
        contexts: ["selection"]
      });
    });
  }
}

// Panggil saat ekstensi diinstal atau diupdate
chrome.runtime.onInstalled.addListener(updateContextMenus);

// Panggil saat browser dimulai
chrome.runtime.onStartup.addListener(updateContextMenus);

async function performApiCall(payload) {
    const { apiKey, model, systemPrompt, userContent, generationConfig, originalUserContent, purpose } = payload;
    const endpoint = 'streamGenerateContent';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${apiKey}&alt=sse`;
  
    const apiPayload = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      generationConfig
    };
  
    const streamCallback = (streamData) => {
      chrome.runtime.sendMessage({
        action: 'geminiStreamUpdate',
        payload: { ...streamData, originalUserContent },
        purpose: purpose
      });
    };
  
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });
  
      if (!response.ok || !response.body) {
        const errorBody = await response.json();
        throw new Error(errorBody.error?.message || `Request failed with status ${response.status}`);
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let totalTokenCount = 0;
  
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
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
            if (data.usageMetadata?.totalTokenCount) {
              totalTokenCount = data.usageMetadata.totalTokenCount;
            }
          } catch (e) {
            console.warn("Error parsing stream chunk:", e);
          }
        }
      }
      streamCallback({ success: true, done: true, fullText, totalTokenCount });
    } catch (error) {
      console.error("API call error:", error);
      streamCallback({ success: false, error: error.message });
    }
}
  
function handleTestConnection(payload, sendResponse) {
    const { apiKey } = payload;
    const testModel = 'gemini-1.5-flash-latest';
    const testContent = "Reply with only 'OK'.";
    const endpoint = 'generateContent';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:${endpoint}?key=${apiKey}`;
  
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: testContent }] }] })
    })
    .then(res => res.ok ? res.json() : res.json().then(err => { throw new Error(err.error?.message); }))
    .then(result => {
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text.trim() || "";
      if (text.toUpperCase() === 'OK') {
        sendResponse({ success: true, text: "Connection successful!" });
      } else {
        sendResponse({ success: false, error: `Unexpected response: "${text}"` });
      }
    })
    .catch(err => sendResponse({ success: false, error: err.message }));
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.id) {
      console.error("Context menu clicked without a valid tab context.");
      return;
    }
    
    // Pastikan menu yang diklik adalah bagian dari ekstensi kita
    if (info.selectionText && (info.parentMenuItemId === "gemini-answer-parent" || info.parentMenuItemId === "rephrase-parent")) {
      chrome.storage.local.set({
        // Simpan seluruh ID menu agar kita bisa mendapatkan bahasanya nanti
        [`context_action_${tab.id}`]: { action: info.menuItemId, selectionText: info.selectionText }
      }, () => {
        chrome.action.openPopup();
      });
    }
});
  
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'callGeminiStream') {
      performApiCall(request.payload);
      return true;
    }
    if (request.action === 'testApiConnection') {
      handleTestConnection(request.payload, sendResponse);
      return true;
    }
    if (request.action === 'updateContextMenus') {
      updateContextMenus();
      return true;
    }
});