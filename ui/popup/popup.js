document.addEventListener('DOMContentLoaded', () => {
    const statusText = document.getElementById('status-text');
    const contentArea = document.getElementById('content-area');
    const actionArea = document.getElementById('action-area');
    const explanationButton = document.getElementById('explanationButton');
    const menuButton = document.getElementById('menuButton');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const rescanButton = document.getElementById('rescanButton');
    const historyButton = document.getElementById('historyButton');
    const settingsButton = document.getElementById('settingsButton');
    let currentTabId;

    function formatResponse(text) {
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
        return processedText.replace(/<br>\s*<ul>/g, '<ul>').replace(/<\/ul>\s*<br>/g, '</ul>');
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
            case 'cleaning':
                contentArea.innerHTML = `<div class="loading-view">Analyzing Page...</div>`;
                break;
            case 'answering':
            case 'complete':
            case 'explaining':
                if (state.cleanedContent) {
                    contentArea.innerHTML += `<div class="card"><h2>Analyzed Content</h2><div class="card-content">${formatResponse(state.cleanedContent)}</div></div>`;
                }
                if (state.answer) {
                    contentArea.innerHTML += `<div class="card"><h2>Quick Answer</h2><div class="card-content">${formatResponse(state.answer)}</div></div>`;
                    actionArea.classList.remove('hidden');
                    explanationButton.disabled = state.status === 'explaining';
                }
                 if (state.status === 'explaining') {
                    contentArea.innerHTML += `<div class="card"><h2>Explanation</h2><div class="card-content" id="explanation-stream"></div></div>`;
                    document.getElementById('explanation-stream').innerHTML = formatResponse(state.explanation || "", true);
                } else if (state.explanation) {
                    contentArea.innerHTML += `<div class="card"><h2>Explanation</h2><div class="card-content">${formatResponse(state.explanation)}</div></div>`;
                }
                
                statusText.textContent = state.status === 'complete' ? 'Ready' : 'Working...';
                break;
            case 'error':
                contentArea.innerHTML = `<div class="error-view"><strong>Error:</strong> ${state.error}</div>`;
                statusText.textContent = 'Error';
                break;
            default:
                contentArea.innerHTML = `<div class="loading-view">Initializing...</div>`;
        }
    }
    
    // --- Stream Rendering Logic ---
    let accumulatedStreamText = "";
    let streamTarget = null;
    let currentRequestType = null;

    chrome.runtime.onMessage.addListener((message) => {
        if (message.forTab === currentTabId) {
            switch (message.action) {
                case 'stateUpdate':
                    renderState(message.state);
                    break;
                case 'streamChunk':
                    accumulatedStreamText += message.payload;
                    if (currentRequestType === 'explanation') {
                        const explanationEl = document.getElementById('explanation-stream');
                        if (explanationEl) {
                           explanationEl.innerHTML = formatResponse(accumulatedStreamText, true);
                        }
                    }
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
        }
    });

    // --- Event Listeners ---
    menuButton.addEventListener('click', () => dropdownMenu.classList.toggle('hidden'));
    document.addEventListener('click', (event) => {
        if (!menuButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });
    
    rescanButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'clearStateAndRescan' });
        contentArea.innerHTML = `<div class="loading-view">Rescanning...</div>`;
        statusText.textContent = "Loading";
        dropdownMenu.classList.add('hidden');
    });
    
    historyButton.addEventListener('click', () => chrome.tabs.create({ url: 'ui/history/history.html' }));
    settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());

    explanationButton.addEventListener('click', () => {
        currentRequestType = 'explanation';
        chrome.runtime.sendMessage({ action: 'getExplanation' });
    });

    // --- Initialization ---
    async function initialize() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
            renderState({ status: 'error', error: 'Could not access active tab.'});
            return;
        }
        currentTabId = tab.id;
        
        const state = await chrome.runtime.sendMessage({ action: 'getTabState' });
        if (state) {
            renderState(state);
            if(state.status === 'idle') {
                 chrome.scripting.executeScript({
                    target: { tabId: currentTabId },
                    files: ['src/content.js']
                }).then(injectionResults => {
                    const sourceText = injectionResults[0].result;
                    if (sourceText) {
                        chrome.runtime.sendMessage({ action: 'startAnalysis', sourceText });
                    } else {
                        renderState({ status: 'error', error: 'Could not read content from this page.'})
                    }
                }).catch(err => {
                    renderState({ status: 'error', error: 'Cannot run on this page. Try a different website.'})
                });
            }
        }
    }
    initialize();
});