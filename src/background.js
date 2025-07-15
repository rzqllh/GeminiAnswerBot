// --- Default Prompts Definition ---
const DEFAULT_PROMPTS = {
  cleaning: `You are a text cleaner. Your only job is to analyze the following messy text from a webpage and extract the main quiz content. RULES: 1. Remove all irrelevant text. 2. Preserve the original formatting of the question, options, and especially code blocks. 3. Format all content using standard Markdown. 4. Directly return only the cleaned Markdown text.`,
  answer: `Act as an expert quiz solver. Based on the following cleaned text, provide the single, most correct answer, a confidence score (High, Medium, or Low), and a brief, one-sentence reason for your confidence level. Respond in the exact format below, without any extra words:\nFORMAT:\nAnswer: [Your Answer Here]\nConfidence: [High/Medium/Low]\nReason: [Your one-sentence reason here]`,
  explanation: `Act as an expert tutor. For the following quiz content, provide a clear, step-by-step explanation for why the provided answer is correct and why the other options are incorrect. Use Markdown for formatting.`
};

const tabStates = new Map();

// --- Event Listeners & Setup ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "gemini-answer-selection",
    title: "Answer with GeminiAnswerBot",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "gemini-answer-selection" && info.selectionText) {
    // Set initial state and request analysis
    tabStates.set(tab.id, { status: 'loading', fromSelection: true, sourceText: info.selectionText });
    handleAnalysis(tab.id, info.selectionText);
    chrome.action.openPopup();
  }
});

chrome.tabs.onRemoved.addListener((tabId) => tabStates.delete(tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') tabStates.delete(tabId);
});

// --- Core API Streaming Function ---
async function streamApiCall(apiKey, model, systemPrompt, userContent, generationConfig, tabId, requestType) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: userContent }] }],
                generationConfig
            })
        });
        if (!response.ok) throw new Error((await response.json()).error.message);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                chrome.runtime.sendMessage({ action: 'streamEnd', forTab: tabId, requestType, content: accumulatedText });
                break;
            }
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const jsonString = line.substring(6);
                        if (jsonString.trim()) {
                            const parsed = JSON.parse(jsonString);
                            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            if (text) {
                                accumulatedText += text;
                                chrome.runtime.sendMessage({ action: 'streamChunk', payload: text, forTab: tabId });
                            }
                        }
                    } catch (e) {}
                }
            }
        }
    } catch (error) {
        chrome.runtime.sendMessage({ action: 'streamError', error: error.message, forTab: tabId });
    }
}

async function handleAnalysis(tabId, sourceText) {
    let currentState = { status: 'cleaning', sourceText };
    tabStates.set(tabId, currentState);
    chrome.runtime.sendMessage({ action: 'stateUpdate', forTab: tabId, state: currentState });

    try {
        const config = await chrome.storage.sync.get(['geminiApiKey', 'selectedModel', 'temperature', 'customPrompts']);
        if (!config.geminiApiKey) throw new Error("API Key not set.");

        const generationConfig = { temperature: config.temperature ?? 0.4 };
        const cleaningPrompt = config.customPrompts?.cleaning || DEFAULT_PROMPTS.cleaning;
        await streamApiCall(config.geminiApiKey, config.selectedModel, cleaningPrompt, sourceText, generationConfig, tabId, 'cleaning');
    } catch (e) {
        const errorState = { status: 'error', error: e.message };
        tabStates.set(tabId, errorState);
        chrome.runtime.sendMessage({ action: 'stateUpdate', forTab: tabId, state: errorState });
    }
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    if (request.action === 'getTabState') {
        sendResponse(tabStates.get(tabId) || { status: 'idle' });
        return;
    }
    
    if (!tabId) return false;

    (async () => {
        switch (request.action) {
            case 'startAnalysis':
                await handleAnalysis(tabId, request.sourceText);
                break;
            
            case 'getExplanation': {
                const state = tabStates.get(tabId);
                if (!state || !state.cleanedContent) break;
                state.status = 'explaining';
                tabStates.set(tabId, state);
                chrome.runtime.sendMessage({ action: 'stateUpdate', forTab: tabId, state: state });
                
                const config = await chrome.storage.sync.get(['geminiApiKey', 'selectedModel', 'temperature', 'customPrompts', 'explanationTone']);
                const generationConfig = { temperature: config.temperature ?? 0.4 };
                let explanationPrompt = config.customPrompts?.explanation || DEFAULT_PROMPTS.explanation;
                if (config.explanationTone && config.explanationTone !== 'normal') {
                  const toneInstructions = { sederhana: "\n\nExplain it simply.", teknis: "\n\nProvide a technical explanation.", analogi: "\n\nUse analogies." };
                  explanationPrompt += toneInstructions[config.explanationTone] || '';
                }
                await streamApiCall(config.geminiApiKey, config.selectedModel, explanationPrompt, state.cleanedContent, generationConfig, tabId, 'explanation');
                break;
            }

            case 'streamResult': {
                const { requestType, content } = request.payload;
                const state = tabStates.get(tabId) || {};

                if (requestType === 'cleaning') {
                    state.cleanedContent = content;
                    state.status = 'answering';
                    const config = await chrome.storage.sync.get(['geminiApiKey', 'selectedModel', 'temperature', 'customPrompts']);
                    const generationConfig = { temperature: config.temperature ?? 0.4 };
                    const answerPrompt = config.customPrompts?.answer || DEFAULT_PROMPTS.answer;
                    await streamApiCall(config.geminiApiKey, config.selectedModel, answerPrompt, content, generationConfig, tabId, 'answer');
                } else if (requestType === 'answer') {
                    state.answer = content;
                    state.status = 'complete';
                    await chrome.storage.local.get({history: []}, (result) => {
                        const history = result.history;
                        const newEntry = { id: Date.now(), title: state.title, url: state.url, timestamp: new Date().toISOString(), ...state };
                        history.unshift(newEntry);
                        if(history.length > 100) history.pop();
                        chrome.storage.local.set({history});
                    });
                } else if (requestType === 'explanation') {
                    state.explanation = content;
                    state.status = 'complete'; // Return to complete state after explaining
                }
                tabStates.set(tabId, state);
                chrome.runtime.sendMessage({ action: 'stateUpdate', forTab: tabId, state: state });
                break;
            }

            case 'clearStateAndRescan':
                tabStates.delete(tabId);
                break;
        }
    })();
    return true;
});