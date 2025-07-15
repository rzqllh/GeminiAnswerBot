document.addEventListener('DOMContentLoaded', () => {
    const statusText = document.getElementById('status-text');
    const contentArea = document.getElementById('content-area');
    const actionArea = document.getElementById('action-area');
    const explanationButton = document.getElementById('explanationButton');
    const rescanButton = document.getElementById('rescanButton');
    const historyButton = document.getElementById('historyButton');
    const settingsButton = document.getElementById('settingsButton');
    let currentTabId;
    let accumulatedStreamText = "";
    let currentRequestType = null;

    function formatResponse(text, streaming = false) {
        const cursor = streaming ? `<span class="blinking-cursor"></span>` : "";
        let processedText = text.replace(/```[\s\S]*?```/g, '~~~CODE_BLOCK~~~');
        processedText = processedText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/^\s*[\*\-]\s(.*)/gm, '<li>$1</li>');
        processedText = processedText.replace(/<\/li>\s*<li>/g, '</li><li>');
        const listRegex = /(<li>.*<\/li>)/s;
        if (listRegex.test(processedText)) processedText = processedText.replace(listRegex, '<ul>$1</ul>');
        processedText = processedText.replace(/\n/g, '<br>');
        const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
        codeBlocks.forEach(block => {
            const cleanCode = block.replace(/^```\w*\n|```$/g, '');
            const codeHtml = `<pre><code>${cleanCode}</code></pre>`;
            processedText = processedText.replace('~~~CODE_BLOCK~~~', codeHtml);
        });
        return processedText.replace(/<br>\s*<ul>/g, '<ul>').replace(/<\/ul>\s*<br>/g, '</ul>') + cursor;
    }

    function renderState(state) {
        statusText.textContent = state.status.charAt(0).toUpperCase() + state.status.slice(1);
        contentArea.innerHTML = '';
        actionArea.classList.add('hidden');

        switch (state.status) {
            case 'idle':
                contentArea.innerHTML = `<div class="loading-view">Open a quiz page to start analysis.</div>`;
                break;
            case 'loading':
                contentArea.innerHTML = `<div class="loading-view">Loading...</div>`;
                break;
            case 'cleaning':
                statusText.textContent = 'Cleaning...';
                contentArea.innerHTML = `<div class="card"><h2>Analyzed Content</h2><div class="card-content" id="cleaning-stream">${formatResponse("", true)}</div></div>`;
                break;
            case 'answering':
            case 'complete':
            case 'explaining':
                if (state.cleanedContent) {
                    contentArea.innerHTML += `<div class="card"><h2>Analyzed Content</h2><div class="card-content">${formatResponse(state.cleanedContent)}</div></div>`;
                }
                if (state.status === 'answering') {
                     statusText.textContent = 'Answering...';
                     contentArea.innerHTML += `<div class="card"><h2>Quick Answer</h2><div class="card-content" id="answer-stream">${formatResponse("", true)}</div></div>`;
                } else if (state.answer) {
                    contentArea.innerHTML += `<div class="card"><h2>Quick Answer</h2><div class="card-content">${formatResponse(state.answer)}</div></div>`;
                    actionArea.classList.remove('hidden');
                    explanationButton.disabled = state.status === 'explaining';
                }
                
                if (state.status === 'explaining') {
                    statusText.textContent = 'Explaining...';
                    contentArea.innerHTML += `<div class="card"><h2>Explanation</h2><div class="card-content" id="explanation-stream">${formatResponse("", true)}</div></div>`;
                } else if (state.explanation) {
                    contentArea.innerHTML += `<div class="card"><h2>Explanation</h2><div class="card-content">${formatResponse(state.explanation)}</div></div>`;
                }
                
                if (state.status === 'complete') statusText.textContent = 'Ready';
                break;
            case 'error':
                contentArea.innerHTML = `<div class="error-view"><strong>Error:</strong> ${state.error}</div>`;
                statusText.textContent = 'Error';
                break;
            default:
                contentArea.innerHTML = `<div class="loading-view">Initializing...</div>`;
        }
    }

    chrome.runtime.onMessage.addListener((message) => {
        if (message.forTab !== currentTabId) return;

        switch (message.action) {
            case 'stateUpdate':
                renderState(message.state);
                break;
            case 'streamChunk':
                accumulatedStreamText += message.payload;
                let targetElId = `${currentRequestType}-stream`;
                let targetEl = document.getElementById(targetElId);
                if (targetEl) targetEl.innerHTML = formatResponse(accumulatedStreamText, true);
                break;
            case 'streamEnd':
                chrome.runtime.sendMessage({ action: 'streamResult', payload: { requestType: message.requestType, content: accumulatedStreamText } });
                accumulatedStreamText = "";
                currentRequestType = null;
                break;
            case 'streamError':
                renderState({ status: 'error', error: message.error });
                break;
        }
    });
    
    async function startInitialAnalysis(tab) {
        renderState({ status: 'loading' });
        try {
            const [injectionResult] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/content.js']
            });
            if (chrome.runtime.lastError || !injectionResult || !injectionResult.result) {
                renderState({ status: 'error', error: 'Could not read content from this page.' });
                return;
            }
            const sourceText = injectionResult.result;
            chrome.runtime.sendMessage({ action: 'startAnalysis', sourceText });
        } catch (err) {
            renderState({ status: 'error', error: `Cannot run on this page. Try a different website.` });
        }
    }

    async function initialize() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
            renderState({ status: 'error', error: 'Could not access active tab.'});
            return;
        }
        currentTabId = tab.id;
        
        const state = await chrome.runtime.sendMessage({ action: 'getTabState' });
        if (state) {
            if (state.status === 'idle') {
                await startInitialAnalysis(tab);
            } else {
                renderState(state);
            }
        }
    }

    rescanButton.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.runtime.sendMessage({ action: 'clearStateAndRescan' });
        await startInitialAnalysis(tab);
    });
    historyButton.addEventListener('click', () => chrome.tabs.create({ url: 'ui/history/history.html' }));
    settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
    explanationButton.addEventListener('click', () => {
        currentRequestType = 'explanation';
        chrome.runtime.sendMessage({ action: 'getExplanation' });
    });

    initialize();
});