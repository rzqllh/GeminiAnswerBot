// === Hafizh Signature Code ===
// Author: Hafizh Rizqullah — GeminiAnswerBot
// File: js/background.js
// Created: 2025-08-08 16:42:03

// CRITICAL: Scripts must be imported at the top level of the service worker.
try {
  importScripts('../js/utils/storage.js', '../js/utils/errorHandler.js', '../js/prompts.js');
} catch (e) {
  console.error('Failed to import scripts in background worker:', e);
}

async function fetchImageAsBase64(url) {
  try {
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
    return null;
  }
}

// MODIFIED: This function now ensures scripts are injected before messaging.
async function handleContextAction(info, tab) {
  if (!tab || !tab.id) {
    console.error("Context action triggered without a valid tab.");
    return;
  }

  // Ensure content scripts are injected before proceeding.
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        'js/utils/helpers.js',
        'js/utils/errorHandler.js',
        'js/vendor/dompurify.min.js',
        'js/vendor/marked.min.js',
        'js/vendor/mark.min.js',
        'js/vendor/Readability.js',
        'js/content.js'
      ]
    });
    // Also inject necessary CSS
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['assets/highlighter.css', 'assets/dialog.css', 'assets/toolbar.css', 'assets/resultDialog.css']
    });
  } catch (err) {
    console.error(`Failed to inject content script for context menu action: ${err.message}`);
    // Do not proceed if injection fails (e.g., on a protected page).
    return;
  }
  
  // For images, we still need the popup as the dialog is text-only for now.
  if (info.mediaType === 'image' && info.srcUrl) {
    const actionData = {
      action: info.menuItemId,
      source: 'contextMenu',
      srcUrl: info.srcUrl,
    };
    const base64Data = await fetchImageAsBase64(info.srcUrl);
    if (base64Data) {
      actionData.base64ImageData = base64Data;
      await StorageManager.session.set({ [`contextData_${tab.id}`]: actionData });
      try {
        await chrome.action.openPopup();
      } catch (e) {
        console.error("Failed to open popup for image action:", e);
        await StorageManager.session.remove(`contextData_${tab.id}`);
      }
    } else {
      console.error("Could not fetch and convert image. Aborting image action.");
    }
    return;
  }

  // For text selections, message the now-guaranteed content script.
  if (info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'showDialogForContextMenu',
      payload: {
        action: info.menuItemId,
        selectionText: info.selectionText
      }
    }).catch(err => console.error("Message sending failed even after injection:", err.message));
  }
}

async function updateContextMenus() {
  await chrome.contextMenus.removeAll();
  
  chrome.contextMenus.create({
    id: "gemini-text-parent",
    title: "GeminiAnswerBot Actions",
    contexts: ["selection"]
  });

  const standardActions = [
    { id: 'summarize', title: 'Summarize Selection' },
    { id: 'explanation', title: 'Explain Selection' },
    { id: 'translate', title: 'Translate Selection' }
  ];
  standardActions.forEach(action => {
    chrome.contextMenus.create({
      id: action.id, parentId: "gemini-text-parent",
      title: action.title, contexts: ["selection"]
    });
  });

  const { promptProfiles, activeProfile } = await StorageManager.get(['promptProfiles', 'activeProfile']);
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
    const { apiKey, model, systemPrompt, userContent, base64ImageData, purpose, tabId } = payload;
    
    const streamCallback = (streamData) => {
      const message = {
        action: 'geminiStreamUpdate',
        payload: { ...streamData, originalUserContent: userContent },
        purpose: purpose
      };

      if (tabId) {
        chrome.tabs.sendMessage(tabId, message).catch(err => {
          if (!err.message.includes('Receiving end does not exist')) {
            console.warn(`Error sending stream to tab ${tabId}:`, err);
          }
        });
      } else {
        chrome.runtime.sendMessage(message).catch(err => {
          if (!err.message.includes('Receiving end does not exist')) {
            console.warn('Error sending stream update to runtime:', err);
          }
        });
      }
    };

    try {
      const settings = await StorageManager.get(['promptProfiles', 'activeProfile', 'temperature']);
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

      if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim() !== '') {
        apiPayload.system_instruction = { parts: [{ text: systemPrompt }] };
      }
    
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });
  
      if (!response.ok) {
        const errorBody = await response.json();
        const errorMessage = errorBody.error?.message || `Request failed with status ${response.status}`;
        throw { type: 'API_ERROR', message: errorMessage, status: errorBody.error?.status };
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
      const formattedError = ErrorHandler.format(error, 'api');
      streamCallback({ success: false, error: formattedError });
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

function extractQuestionForSearch(cleanedContent) {
    const match = cleanedContent.match(/Question:\s*([\s\S]*?)(?=\nOptions:|\n\n|$)/i);
    return match ? match[1].trim() : cleanedContent;
}

chrome.contextMenus.onClicked.addListener(handleContextAction);
  
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const tabId = sender.tab?.id;
    switch(request.action) {
        case 'callGeminiStream':
            performApiCall({ ...request.payload, tabId: null });
            break;
        case 'testApiConnection':
            handleTestConnection(request.payload, sendResponse);
            return true;
        case 'updateContextMenus':
            updateContextMenus();
            break;
        
        case 'triggerContextMenuAction':
            (async () => {
                const { action, selectionText } = request.payload;
                const { tab } = sender;
                const { geminiApiKey, selectedModel, promptProfiles, activeProfile } = await StorageManager.get(['geminiApiKey', 'selectedModel', 'promptProfiles', 'activeProfile']);
                const currentPrompts = (promptProfiles?.[activeProfile]) || DEFAULT_PROMPTS;
                
                let systemPrompt = currentPrompts[action] || DEFAULT_PROMPTS[action];
                let userContent = selectionText;

                if (action.startsWith('rephrase-')) {
                    const language = action.split('-')[1];
                    systemPrompt = currentPrompts.rephrase || DEFAULT_PROMPTS.rephrase;
                    userContent = `Target Language: ${language}\n\nText to rephrase:\n${selectionText}`;
                }
        
                performApiCall({
                    apiKey: geminiApiKey,
                    model: selectedModel,
                    systemPrompt,
                    userContent,
                    purpose: action,
                    tabId: tab.id,
                });
            })();
            break;

        case 'popupReady':
            if (tabId) {
                (async () => {
                    const key = `contextData_${tabId}`;
                    const data = await StorageManager.session.get(key);
                    if (data[key]) {
                        sendResponse(data[key]);
                        await StorageManager.session.remove(key);
                    } else {
                        sendResponse(null);
                    }
                })();
            } else {
                sendResponse(null);
            }
            return true;
        
        case 'verifyAnswerWithSearch':
            (async () => {
                const { cleanedContent, initialAnswer } = request.payload;
                const question = extractQuestionForSearch(cleanedContent);
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(question)}`;
                try {
                    const tab = await chrome.tabs.create({ url: searchUrl, active: false });
                    const verificationContext = { cleanedContent, initialAnswer };
                    await StorageManager.session.set({ [`verification_${tab.id}`]: verificationContext });

                    const listener = (updatedTabId, changeInfo) => {
                        if (updatedTabId === tab.id && changeInfo.status === 'complete') {
                            chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['js/googleScraper.js'] })
                                .catch(err => console.error("Failed to inject scraper script:", err));
                            chrome.tabs.onUpdated.removeListener(listener);
                        }
                    };
                    chrome.tabs.onUpdated.addListener(listener);
                } catch (error) {
                    const formattedError = ErrorHandler.format(error, 'verification');
                    chrome.runtime.sendMessage({ action: 'geminiStreamUpdate', payload: { success: false, error: formattedError }, purpose: 'answer' });
                }
            })();
            break;

        case 'scrapedData':
            (async () => {
                const key = `verification_${sender.tab.id}`;
                const data = await StorageManager.session.get(key);
                const context = data[key];

                if (!context) {
                    console.error("No verification context found for tab:", sender.tab.id);
                    chrome.tabs.remove(sender.tab.id);
                    return;
                }
                const searchSnippets = request.payload.map(r => `Snippet: ${r.title}\n${r.snippet}`).join('\n\n');
                const verificationContent = `[BEGIN DATA]\n--- Original Quiz ---\n${context.cleanedContent}\n--- Initial Answer ---\nAnswer: ${context.initialAnswer}\n--- Web Search Results ---\n${searchSnippets || 'No relevant information found.'}\n[END DATA]`;
                
                const { geminiApiKey, selectedModel } = await StorageManager.get(['geminiApiKey', 'selectedModel']);
                performApiCall({
                    apiKey: geminiApiKey,
                    model: selectedModel,
                    systemPrompt: DEFAULT_PROMPTS.verification,
                    userContent: verificationContent,
                    purpose: 'verification',
                    tabId: null
                });

                await StorageManager.session.remove(key);
                chrome.tabs.remove(sender.tab.id);
            })();
            break;
        
        case 'scrapingFailed':
            (async () => {
                console.error("Scraping failed:", request.error);
                const key = `verification_${sender.tab.id}`;
                await StorageManager.session.remove(key);
                chrome.tabs.remove(sender.tab.id);
                const formattedError = ErrorHandler.format({ message: "Could not scrape Google Search results." }, 'verification');
                chrome.runtime.sendMessage({ action: 'geminiStreamUpdate', payload: { success: false, error: formattedError }, purpose: 'answer' });
            })();
            break;
    }
    return true;
});