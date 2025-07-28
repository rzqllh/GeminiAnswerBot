// js/background.js

async function handleContextAction(tab, action, selectionText) {
  if (!tab || !tab.id) {
    console.error("Context action triggered without a valid tab.");
    return;
  }
  await chrome.storage.local.set({
    [`context_action_${tab.id}`]: { action, selectionText }
  });
  chrome.action.openPopup();
}

async function updateContextMenus() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: "gemini-answer-parent",
    title: "GeminiAnswerBot Actions",
    contexts: ["selection"]
  });

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

  const { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
  const defaultLanguages = 'English, Indonesian';
  let rephraseLanguages = defaultLanguages;
  if (promptProfiles && activeProfile && promptProfiles[activeProfile] && promptProfiles[activeProfile].rephraseLanguages) {
    rephraseLanguages = promptProfiles[activeProfile].rephraseLanguages;
  } else if (promptProfiles && promptProfiles['Default'] && promptProfiles['Default'].rephraseLanguages) {
    rephraseLanguages = promptProfiles['Default'].rephraseLanguages;
  }
  const languages = rephraseLanguages.split(',').map(lang => lang.trim()).filter(lang => lang);

  if (languages.length > 0) {
    chrome.contextMenus.create({
      id: "rephrase-parent",
      parentId: "gemini-answer-parent",
      title: "Rephrase Selection into...",
      contexts: ["selection"]
    });
    languages.forEach(lang => {
      chrome.contextMenus.create({
        id: `rephrase-${lang}`,
        parentId: "rephrase-parent",
        title: lang,
        contexts: ["selection"]
      });
    });
  }
}

chrome.runtime.onInstalled.addListener(updateContextMenus);
chrome.runtime.onStartup.addListener(updateContextMenus);

async function performApiCall(payload) {
    const { apiKey, model, systemPrompt, userContent, generationConfig: baseGenerationConfig, originalUserContent, purpose } = payload;
    
    const settings = await chrome.storage.sync.get(['promptProfiles', 'activeProfile', 'temperature']);
    const activeProfileName = settings.activeProfile || 'Default';
    const activeProfile = settings.promptProfiles ? (settings.promptProfiles[activeProfileName] || {}) : {};
    const globalTemp = settings.temperature !== undefined ? settings.temperature : 0.4;
    
    const purposeBase = purpose.startsWith('rephrase-') ? 'rephrase' : purpose;
    const tempKey = `${purposeBase}_temp`;

    const finalTemperature = activeProfile[tempKey] !== undefined ? activeProfile[tempKey] : globalTemp;

    const generationConfig = {
        ...baseGenerationConfig,
        temperature: finalTemperature
    };

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
  
      if (!response.ok) {
        const errorBody = await response.json();
        const errorMessage = errorBody.error?.message || `Request failed with status ${response.status}`;
        let errorType = 'API_ERROR';
        
        // --- BARU: Analisis jenis error dari API ---
        if (errorMessage.includes("API key not valid")) {
          errorType = 'INVALID_API_KEY';
        } else if (errorBody.error?.status === 'RESOURCE_EXHAUSTED' || errorMessage.includes("quota")) {
          errorType = 'QUOTA_EXCEEDED';
        }

        throw { type: errorType, message: errorMessage };
      }

      if (!response.body) {
        throw { type: 'NETWORK_ERROR', message: 'Response body is empty.' };
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
            // This is a chunk parsing error, not a fatal API error
            console.warn("Error parsing stream chunk:", e);
          }
        }
      }
      streamCallback({ success: true, done: true, fullText, totalTokenCount });

    } catch (error) {
      console.error("API call error:", error);
      // --- BARU: Mengirim objek error yang lebih terstruktur ---
      const errorPayload = {
        type: error.type || 'NETWORK_ERROR',
        message: error.message || 'Check your internet connection or the browser console for more details.'
      };
      streamCallback({ success: false, error: errorPayload });
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
    .then(res => res.ok ? res.json() : res.json().then(err => { throw new Error(err.error?.message || "An unknown error occurred."); }))
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
    if (info.selectionText && (info.parentMenuItemId === "gemini-answer-parent" || info.parentMenuItemId === "rephrase-parent")) {
      handleContextAction(tab, info.menuItemId, info.selectionText);
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
    if (request.action === 'triggerContextMenuAction') {
      handleContextAction(sender.tab, request.payload.action, request.payload.selectionText);
      return true;
    }
});