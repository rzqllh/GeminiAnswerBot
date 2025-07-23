// js/options.js

// --- LIBRARY TOASTIFY.JS DIGABUNG DI SINI UNTUK MENGHINDARI ERROR ---
(function(root,factory){if(typeof module==="object"&&module.exports){module.exports=factory()}else{root.Toastify=factory()}}(this,function(global){var Toastify=function(options){return new Toastify.lib.init(options)},methods={},lib={};function ToastifyObject(options){this.options={};this.options.text=options.text||"Hi there!";this.options.node=options.node;this.options.duration=typeof options.duration==="undefined"?3000:options.duration;this.options.selector=options.selector;this.options.callback=options.callback||function(){};this.options.destination=options.destination;this.options.newWindow=options.newWindow||false;this.options.close=options.close||false;this.options.gravity=options.gravity==="bottom"?"toastify-bottom":"toastify-top";this.options.positionLeft=options.positionLeft||false;this.options.position=options.position||"right";this.options.backgroundColor=options.backgroundColor;this.options.avatar=options.avatar||"";this.options.className=options.className||"";this.options.stopOnFocus=typeof options.stopOnFocus==="undefined"?true:options.stopOnFocus;this.options.onClick=options.onClick;this.options.offset=options.offset||{x:0,y:0};this.options.escapeMarkup=typeof options.escapeMarkup==="undefined"?true:options.escapeMarkup;this.options.style=options.style||{};this.options.oldestFirst=typeof options.oldestFirst==="undefined"?true:options.oldestFirst;return this}
ToastifyObject.prototype.buildToast=function(){if(!this.options){return}
var R=document.body;if(this.options.selector){R=document.getElementById(this.options.selector)}
if(!R){return}
var _toastElement=document.createElement("div");_toastElement.className="toastify on "+this.options.className;if(!!this.options.positionLeft===true){_toastElement.className+=" toastify-left"}else{_toastElement.className+=" toastify-right"}
_toastElement.className+=" "+this.options.gravity;if(this.options.backgroundColor){console.warn('DEPRECATION NOTICE: "backgroundColor" is being deprecated. Please use the "style.background" property.')}
var toastText;if(this.options.node&&this.options.node.nodeType===Node.ELEMENT_NODE){toastText=this.options.node.outerHTML}else{if(this.options.escapeMarkup){toastText=new DOMParser().parseFromString(this.options.text,"text/html").body.textContent}else{toastText=this.options.text}}
_toastElement.dataset.originalText=toastText;if(this.options.avatar!==""){var _avatarElement=document.createElement("img");_avatarElement.src=this.options.avatar;_avatarElement.className="toastify-avatar";if(this.options.positionLeft===true){_toastElement.appendChild(_avatarElement)}else{_toastElement.insertAdjacentHTML("afterbegin",_avatarElement.outerHTML)}}
var _textElement=document.createElement("span");if(this.options.node){_textElement.appendChild(this.options.node)}else{if(this.options.escapeMarkup){_textElement.innerText=this.options.text}else{_textElement.innerHTML=this.options.text}}
_toastElement.appendChild(_textElement);if(this.options.close===true){var _closeElement=document.createElement("button");_closeElement.type="button";_closeElement.setAttribute("aria-label","Close");_closeElement.className="toastify-close";_closeElement.innerHTML="&#10006;";_closeElement.addEventListener("click",function(event){event.stopPropagation();this.removeElement(_toastElement);window.clearTimeout(_toastElement.timeOutValue)}.bind(this));_toastElement.appendChild(_closeElement)}
if(typeof this.options.destination!=="undefined"){_toastElement.addEventListener("click",function(event){event.stopPropagation();if(this.options.newWindow===true){window.open(this.options.destination,"_blank")}else{window.location=this.options.destination}}.bind(this))}
if(typeof this.options.onClick==="function"&&typeof this.options.destination==="undefined"){_toastElement.addEventListener("click",function(event){event.stopPropagation();this.options.onClick()}.bind(this))}
for(var property in this.options.style){_toastElement.style[property]=this.options.style[property]}
if(this.options.oldestFirst){R.insertBefore(_toastElement,R.firstChild)}else{R.appendChild(_toastElement)}
return _toastElement};ToastifyObject.prototype.showToast=function(){this.toastElement=this.buildToast();if(!this.toastElement){return}
var _this=this;var _offsetHeight=this.toastElement.offsetHeight;var _clientWidth=this.toastElement.clientWidth;var _x=this.options.offset.x;var _y=this.options.offset.y;var _offset={x:this.options.positionLeft?_x:_clientWidth+_x*-1,y:_y,};_offset.x=this.options.positionLeft?_offset.x+20:_offset.x-20;_offset.y=_offset.y+20;var _gravity={x:0,y:_offsetHeight,};switch(this.options.gravity){case"toastify-top":break;case"toastify-bottom":_gravity.y=_gravity.y*-1;break}
this.toastElement.style.transform="translate("+_offset.x+"px, "+_gravity.y+"px)";setTimeout(function(){_this.toastElement.style.transform="translate("+_offset.x+"px, "+_y+"px)"},50);if(this.options.duration>0){this.toastElement.timeOutValue=window.setTimeout(function(){this.removeElement(this.toastElement)}.bind(this),this.options.duration)}
if(this.options.stopOnFocus===true){this.toastElement.addEventListener("mouseover",function(event){window.clearTimeout(this.toastElement.timeOutValue)}.bind(this));this.toastElement.addEventListener("mouseleave",function(){if(this.options.duration>0){this.toastElement.timeOutValue=window.setTimeout(function(){this.removeElement(this.toastElement)}.bind(this),this.options.duration)}}.bind(this))}
return this};ToastifyObject.prototype.removeElement=function(toastElement){toastElement.style.transform="translate(500px, "+(toastElement.offsetTop+toastElement.offsetHeight)+"px)";toastElement.style.opacity=0;setTimeout(function(){if(toastElement.parentNode){toastElement.parentNode.removeChild(toastElement)}
this.options.callback.call(toastElement)}.bind(this),400)};lib.init=function(options){var t=new ToastifyObject(options||{});return t.showToast()};for(var method in methods){lib.init[method]=methods[method]}
return lib.init}));

// ============================================================================
// LOGIKA EKSTENSI ANDA DIMULAI DI SINI
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    let activeToast = null;
    const notificationContainer = document.getElementById('notification-container');

    function showToast(title, message, type = 'info') {
        if (activeToast) {
            activeToast.remove();
        }
        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        const icon = {
          success: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
          error: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
          info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };
        toast.innerHTML = `
          <div class="toast-icon toast-icon-${type}">${icon[type] || icon.info}</div>
          <div class="toast-text-content">
            <strong>${title}</strong>
            <div class="toast-message">${message}</div>
          </div>
        `;
        notificationContainer.appendChild(toast);
        activeToast = toast;
        setTimeout(() => { toast.classList.add('show'); }, 10);
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => {
            if(toast.parentElement) { toast.remove(); }
            if (activeToast === toast) { activeToast = null; }
          }, 500);
        }, 4000);
    }

    const historyListContainer = document.getElementById('history-list-container');
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function formatQuestionContent(content) {
        if (!content) return '';
        const lines = content.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return '';
        const question = escapeHtml(lines.shift().replace(/^Question:\s*/i, ''));
        const optionsHtml = lines.map(option => {
            const cleanedOption = option.trim().replace(/^[\*\-]\s*Options:\s*|^\s*[\*\-]\s*/, '');
            return `<li>${escapeHtml(cleanedOption)}</li>`;
        }).join('');
        return `<p class="history-question">${question}</p><ul class="history-options">${optionsHtml}</ul>`;
    }

    async function loadHistory() {
        historyListContainer.innerHTML = `<div class="loading-message">Loading history...</div>`;
        const { history = [] } = await chrome.storage.local.get('history');
        if (history.length === 0) {
            historyListContainer.innerHTML = `<div class="empty-state">No history found.</div>`;
            return;
        }
        historyListContainer.innerHTML = '';
        history.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'history-item';
            const formattedDate = new Date(item.timestamp).toLocaleString();
            const actionLabel = item.actionType.charAt(0).toUpperCase() + item.actionType.slice(1);
            const contentSource = item.actionType === 'quiz' ? 'Question Content' : 'Selected Text';
            const contentDisplay = item.cleanedContent ? `<h3>${contentSource}</h3><div class="answer-block">${formatQuestionContent(item.cleanedContent)}</div>` : '';
            itemElement.innerHTML = `
                <div class="history-item-header">
                    <div class="history-item-title"><a href="${item.url}" target="_blank" title="${item.title}">${item.title}</a></div>
                    <div class="history-item-meta">${actionLabel} &bull; ${formattedDate}</div>
                </div>
                <div class="history-item-content">
                    ${contentDisplay}
                    <h3>AI Response</h3>
                    <div class="answer-block">${item.answerHTML}</div>
                </div>
            `;
            historyListContainer.appendChild(itemElement);
        });
    }

    const navLinks = document.querySelectorAll('.settings-sidebar a');
    const contentPanes = document.querySelectorAll('.content-pane');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');
            contentPanes.forEach(pane => pane.classList.toggle('active', pane.id === targetId));
            if (targetId === 'history') { loadHistory(); }
        });
    });

    const saveGeneralButton = document.getElementById('saveGeneralButton');
    const savePromptsButton = document.getElementById('savePromptsButton');
    const testButton = document.getElementById('testButton');
    const apiKeyInput = document.getElementById('apiKey');
    const revealApiKey = document.getElementById('revealApiKey');
    const modelSelect = document.getElementById('modelSelect');
    const responseToneSelect = document.getElementById('responseToneSelect'); 
    const autoHighlightToggle = document.getElementById('autoHighlightToggle');
    const temperatureSlider = document.getElementById('temperatureSlider');
    const temperatureValueSpan = document.getElementById('temperatureValue');
    const clearHistoryButton = document.getElementById('clearHistoryButton');
    const exportHistoryButton = document.getElementById('exportHistoryButton');
    const cleaningPromptTextarea = document.getElementById('cleaningPrompt');
    const answerPromptTextarea = document.getElementById('answerPrompt');
    const explanationPromptTextarea = document.getElementById('explanationPrompt');
    const summarizePromptTextarea = document.getElementById('summarizePrompt');
    const translatePromptTextarea = document.getElementById('translatePrompt');
    const rephrasePromptTextarea = document.getElementById('rephrasePrompt');
    const rephraseLanguagesInput = document.getElementById('rephraseLanguages');

    chrome.storage.sync.get([
        'geminiApiKey', 'selectedModel', 'responseTone', 'autoHighlight', 
        'customPrompts', 'temperature', 'rephraseLanguages'
    ], (result) => {
        apiKeyInput.value = result.geminiApiKey || '';
        modelSelect.value = result.selectedModel || 'gemini-1.5-flash-latest';
        responseToneSelect.value = result.responseTone || 'normal'; 
        autoHighlightToggle.checked = result.autoHighlight || false;
        rephraseLanguagesInput.value = result.rephraseLanguages || 'English, Indonesian';
        const temperature = result.temperature !== undefined ? result.temperature : 0.4;
        temperatureSlider.value = temperature;
        temperatureValueSpan.textContent = parseFloat(temperature).toFixed(1);
        
        const prompts = result.customPrompts || {};

        // FIXED: Added back the placeholder logic
        cleaningPromptTextarea.placeholder = DEFAULT_PROMPTS.cleaning;
        answerPromptTextarea.placeholder = DEFAULT_PROMPTS.answer;
        explanationPromptTextarea.placeholder = DEFAULT_PROMPTS.explanation;
        summarizePromptTextarea.placeholder = DEFAULT_PROMPTS.summarize; 
        translatePromptTextarea.placeholder = DEFAULT_PROMPTS.translate;
        rephrasePromptTextarea.placeholder = DEFAULT_PROMPTS.rephrase;

        cleaningPromptTextarea.value = prompts.cleaning || '';
        answerPromptTextarea.value = prompts.answer || '';
        explanationPromptTextarea.value = prompts.explanation || '';
        summarizePromptTextarea.value = prompts.summarize || ''; 
        translatePromptTextarea.value = prompts.translate || '';
        rephrasePromptTextarea.value = prompts.rephrase || '';
    });

    temperatureSlider.addEventListener('input', function() {
        temperatureValueSpan.textContent = parseFloat(this.value).toFixed(1);
    });
    
    revealApiKey.addEventListener('click', function() {
        const isPassword = apiKeyInput.type === 'password';
        apiKeyInput.type = isPassword ? 'text' : 'password';
        revealApiKey.querySelector('.icon-eye').classList.toggle('hidden', isPassword);
        revealApiKey.querySelector('.icon-eye-slash').classList.toggle('hidden', !isPassword);
    });

    saveGeneralButton.addEventListener('click', function() {
        const settingsToSave = {
            'geminiApiKey': apiKeyInput.value.trim(), 'selectedModel': modelSelect.value,
            'responseTone': responseToneSelect.value, 'autoHighlight': autoHighlightToggle.checked,
            'temperature': parseFloat(temperatureSlider.value)
        };
        chrome.storage.sync.set(settingsToSave, () => {
            showToast('Success', 'General settings have been saved!', 'success');
        });
    });

    savePromptsButton.addEventListener('click', function() {
        const customPrompts = {
            cleaning: cleaningPromptTextarea.value.trim(), answer: answerPromptTextarea.value.trim(),
            explanation: explanationPromptTextarea.value.trim(), summarize: summarizePromptTextarea.value.trim(), 
            translate: translatePromptTextarea.value.trim(), rephrase: rephrasePromptTextarea.value.trim()
        };
        const rephraseLanguages = rephraseLanguagesInput.value.trim();
        chrome.storage.sync.set({ 'customPrompts': customPrompts, 'rephraseLanguages': rephraseLanguages }, () => {
            showToast('Success', 'Custom prompts have been saved!', 'success');
        });
    });

    testButton.addEventListener('click', function() {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showToast('API Key Missing', 'Please enter an API key to test.', 'error');
            return;
        }
        showToast('Testing', 'Testing connection, please wait...', 'info');
        testButton.disabled = true;
        chrome.runtime.sendMessage({ action: 'testApiConnection', payload: { apiKey } }, (response) => {
            testButton.disabled = false;
            if (chrome.runtime.lastError) {
                showToast('Connection Error', `Error: ${chrome.runtime.lastError.message}`, 'error');
                return;
            }
            if (response && response.success) {
                showToast('Connection Successful', response.text, 'success');
            } else {
                showToast('Connection Failed', response.error || 'An unknown error occurred.', 'error');
            }
        });
    });

    clearHistoryButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete all history? This action cannot be undone.')) {
            chrome.storage.local.remove('history', () => {
                showToast('Success', 'All history has been cleared.', 'success');
                loadHistory();
            });
        }
    });

    exportHistoryButton.addEventListener('click', async function() {
        const { history = [] } = await chrome.storage.local.get('history');
        if (history.length === 0) {
            showToast('No History', 'There is no history to export.', 'info');
            return;
        }
        const dataStr = JSON.stringify(history, null, 2);
        const dataBlob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(dataBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `gemini-answer-bot-history-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        showToast('Success', 'History has been exported!', 'success');
    });
});