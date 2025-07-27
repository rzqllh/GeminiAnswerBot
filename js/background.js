// js/background.js

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

chrome.runtime.onInstalled.addListener(() => {
    console.log("GeminiAnswerBot installed.");
    chrome.contextMenus.create({
      id: "gemini-answer-parent",
      title: "GeminiAnswerBot Actions",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "summarize",
      parentId: "gemini-answer-parent",
      title: "Summarize Selection",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "explain",
      parentId: "gemini-answer-parent",
      title: "Explain Selection",
      contexts: ["selection"]
    });
});
  
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.id) {
      console.error("Context menu clicked without a valid tab context.");
      return;
    }
    if (info.selectionText && info.menuItemId !== "gemini-answer-parent") {
      const action = info.menuItemId;
      chrome.storage.local.set({
        [`context_action_${tab.id}`]: { action, selectionText: info.selectionText }
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
});