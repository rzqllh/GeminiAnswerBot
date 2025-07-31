// js/background.js

async function fetchImageAsBase64(url) {
  try {
    // Use no-cors mode for potentially cross-origin images, though this has limitations.
    // For many public images, this will work.
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error fetching image as Base64 from ${url}:`, error);
    // Fallback for CORS issues if possible, but often not feasible from background script.
    return null;
  }
}

async function handleContextAction(info, tab) {
  if (!tab || !tab.id) {
    console.error("Context action triggered without a valid tab.");
    return;
  }
  
  const actionData = {
    action: info.menuItemId
  };

  if (info.selectionText) {
    actionData.selectionText = info.selectionText;
  }
  
  if (info.mediaType === 'image' && info.srcUrl) {
    actionData.srcUrl = info.srcUrl;
    const base64Data = await fetchImageAsBase64(info.srcUrl);
    if (base64Data) {
      actionData.base64ImageData = base64Data;
    } else {
      console.error("Could not fetch and convert image. Aborting action.");
      // Optionally, we could notify the user here, but for now, we just abort.
      return;
    }
  }
  
  await chrome.storage.local.set({
    [`context_action_${tab.id}`]: actionData
  });

  // In Manifest V3, we cannot reliably check if a popup is open.
  // The modern approach is to simply call openPopup. If it's already open,
  // it will likely just focus. The popup's init logic will handle the rest.
  chrome.action.openPopup();
}

async function updateContextMenus() {
  await chrome.contextMenus.removeAll();
  
  // --- Text Selection Menus ---
  chrome.contextMenus.create({
    id: "gemini-text-parent",
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
      id: action.id, parentId: "gemini-text-parent",
      title: action.title, contexts: ["selection"]
    });
  });

  const { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
  const defaultLanguages = 'English, Indonesian';
  const currentProfile = promptProfiles?.[activeProfile] || promptProfiles?.['Default'] || {};
  const rephraseLanguages = currentProfile.rephraseLanguages || defaultLanguages;
  
  const languages = rephraseLanguages.split(',').map(lang => lang.trim()).filter(lang => lang);
  if (languages.length > 0) {
    chrome.contextMenus.create({
      id: "rephrase-parent", parentId: "gemini-text-parent",
      title: "Rephrase Selection into...", contexts: ["selection"]
    });
    languages.forEach(lang => {
      chrome.contextMenus.create({
        id: `rephrase-${lang}`, parentId: "rephrase-parent",
        title: lang, contexts: ["selection"]
      });
    });
  }

  // --- Image Selection Menus ---
  chrome.contextMenus.create({
    id: "gemini-image-parent",
    title: "Gemini Image Actions",
    contexts: ["image"]
  });
  
  const imageActions = [
      { id: 'image-quiz', title: 'Answer Quiz from Image' },
      { id: 'image-analyze', title: 'Describe this Image' },
      { id: 'image-translate', title: 'Translate Text in Image' }
  ];
  imageActions.forEach(action => {
      chrome.contextMenus.create({
          id: action.id, parentId: "gemini-image-parent",
          title: action.title, contexts: ["image"]
      });
  });
}

chrome.runtime.onInstalled.addListener(updateContextMenus);
chrome.runtime.onStartup.addListener(updateContextMenus);

async function performApiCall(payload) {
    const { apiKey, model, systemPrompt, userContent, base64ImageData, purpose } = payload;
    
    const settings = await chrome.storage.sync.get(['promptProfiles', 'activeProfile', 'temperature']);
    const activeProfileName = settings.activeProfile || 'Default';
    const activeProfile = settings.promptProfiles?.[activeProfileName] || {};
    const globalTemp = settings.temperature ?? 0.4;
    const purposeBase = purpose.split('-')[0];
    const tempKey = `${purposeBase}_temp`;
    const finalTemperature = activeProfile[tempKey] ?? globalTemp;

    const generationConfig = { temperature: finalTemperature };
    const endpoint = 'streamGenerateContent';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${apiKey}&alt=sse`;
  
    const contentParts = [{ text: userContent }];
    if (base64ImageData && base64ImageData.startsWith('data:image')) {
        const [meta, data] = base64ImageData.split(',');
        const mimeType = meta.match(/:(.*?);/)[1];
        contentParts.push({
            inline_data: { mime_type: mimeType, data }
        });
    }

    const apiPayload = {
      contents: [{ role: "user", parts: contentParts }],
      generationConfig
    };

    // Conditionally add system_instruction only if systemPrompt is valid
    if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim() !== '') {
      apiPayload.system_instruction = { parts: [{ text: systemPrompt }] };
    }
  
    const streamCallback = (streamData) => {
      chrome.runtime.sendMessage({
        action: 'geminiStreamUpdate',
        payload: { ...streamData, originalUserContent: userContent },
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
        if (errorMessage.includes("API key not valid")) errorType = 'INVALID_API_KEY';
        else if (errorBody.error?.status === 'RESOURCE_EXHAUSTED' || errorMessage.includes("quota")) errorType = 'QUOTA_EXCEEDED';
        throw { type: errorType, message: errorMessage };
      }

      if (!response.body) throw { type: 'NETWORK_ERROR', message: 'Response body is empty.' };
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "", totalTokenCount = 0;
  
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
          } catch (e) { console.warn("Error parsing stream chunk:", e); }
        }
      }
      streamCallback({ success: true, done: true, fullText, totalTokenCount });

    } catch (error) {
      console.error("API call error:", error);
      streamCallback({ success: false, error: {
        type: error.type || 'NETWORK_ERROR',
        message: error.message || 'Check your internet connection or the browser console for more details.'
      }});
    }
}
  
function handleTestConnection(payload, sendResponse) {
    const { apiKey } = payload;
    const testModel = 'gemini-1.5-flash-latest';
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with only 'OK'." }] }] })
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

chrome.contextMenus.onClicked.addListener(handleContextAction);
  
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.action) {
        case 'callGeminiStream':
            performApiCall(request.payload);
            break;
        case 'testApiConnection':
            handleTestConnection(request.payload, sendResponse);
            return true;
        case 'updateContextMenus':
            updateContextMenus();
            break;
        case 'triggerContextMenuAction':
            handleContextAction({ menuItemId: request.payload.action, selectionText: request.payload.selectionText }, sender.tab);
            break;
    }
});