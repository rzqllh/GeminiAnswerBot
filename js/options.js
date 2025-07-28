// js/options.js

document.addEventListener('DOMContentLoaded', function() {
    let activeToast = null;
    const notificationContainer = document.getElementById('notification-container');
    let globalTemperature = 0.4; // Default global temperature, will be updated from storage

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
        return String(unsafe)
             .replace(/&/g, "&")
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/"/g, "'")
             .replace(/'/g, '"');
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
        if (!historyListContainer) return;
        historyListContainer.innerHTML = `<div class="loading-message">Loading history...</div>`;
        const { history = [] } = await chrome.storage.local.get('history');
        if (history.length === 0) {
            historyListContainer.innerHTML = `<div class="empty-state">No history found.</div>`;
            return;
        }
        historyListContainer.innerHTML = '';
        history.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'card';
            const formattedDate = new Date(item.timestamp).toLocaleString();
            const actionLabel = item.actionType.charAt(0).toUpperCase() + item.actionType.slice(1);
            
            const contentDisplay = item.cleanedContent ? `
                <div class="history-item-content">
                    <h3>Question Content</h3>
                    <div class="answer-block">${formatQuestionContent(item.cleanedContent)}</div>
                </div>
            ` : '';
            const aiResponseHtml = item.answerHTML ? marked.parse(item.answerHTML) : 'No response captured.';
            itemElement.innerHTML = `
                <div class="history-item-header">
                    <div class="history-item-title"><a href="${item.url}" target="_blank" title="${item.title}">${item.title}</a></div>
                    <div class="history-item-meta">${actionLabel} • ${formattedDate}</div>
                </div>
                ${contentDisplay}
                <div class="history-item-content">
                    <h3>AI Response</h3>
                    <div class="answer-block">${aiResponseHtml}</div>
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
            if (targetId === 'history') {
                loadHistory();
            }
        });
    });

    const saveGeneralButton = document.getElementById('saveGeneralButton');
    const testButton = document.getElementById('testButton');
    const apiKeyInput = document.getElementById('apiKey');
    const revealApiKey = document.getElementById('revealApiKey');
    const modelSelect = document.getElementById('modelSelect');
    const autoHighlightToggle = document.getElementById('autoHighlightToggle');
    const preSubmissionCheckToggle = document.getElementById('preSubmissionCheckToggle');
    const temperatureSlider = document.getElementById('temperatureSlider');
    const temperatureValue = document.getElementById('temperatureValue');
    const clearHistoryButton = document.getElementById('clearHistoryButton');
    const exportHistoryButton = document.getElementById('exportHistoryButton');

    chrome.storage.sync.get(['geminiApiKey', 'selectedModel', 'autoHighlight', 'temperature', 'preSubmissionCheck'], (result) => {
        if (apiKeyInput) apiKeyInput.value = result.geminiApiKey || '';
        if (modelSelect) modelSelect.value = result.selectedModel || 'gemini-1.5-flash-latest';
        if (autoHighlightToggle) autoHighlightToggle.checked = result.autoHighlight ?? false;
        if (preSubmissionCheckToggle) preSubmissionCheckToggle.checked = result.preSubmissionCheck ?? true;
        
        const temp = result.temperature !== undefined ? result.temperature : 0.4;
        if (temperatureSlider) temperatureSlider.value = temp;
        if (temperatureValue) temperatureValue.textContent = parseFloat(temp).toFixed(1);
        globalTemperature = temp; // Set initial global temperature
    });
    
    if (temperatureSlider) {
        temperatureSlider.addEventListener('input', () => {
            if (temperatureValue) {
                temperatureValue.textContent = parseFloat(temperatureSlider.value).toFixed(1);
            }
        });
    }

    if (revealApiKey) {
        revealApiKey.addEventListener('click', function() {
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            revealApiKey.querySelector('.icon-eye').classList.toggle('hidden', isPassword);
            revealApiKey.querySelector('.icon-eye-slash').classList.toggle('hidden', !isPassword);
        });
    }
    if (saveGeneralButton) {
        saveGeneralButton.addEventListener('click', function() {
            const newGlobalTemp = parseFloat(temperatureSlider.value);
            const settingsToSave = {
                'geminiApiKey': apiKeyInput.value.trim(),
                'selectedModel': modelSelect.value,
                'autoHighlight': autoHighlightToggle.checked,
                'preSubmissionCheck': preSubmissionCheckToggle.checked,
                'temperature': newGlobalTemp
            };
            chrome.storage.sync.set(settingsToSave, () => {
                globalTemperature = newGlobalTemp; // Update global var on save
                loadPromptsForActiveProfile(); // Reload prompts to update placeholders
                showToast('Success', 'General settings have been saved!', 'success');
            });
        });
    }
    if (testButton) {
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
                if (chrome.runtime.lastError) { showToast('Connection Error', `Error: ${chrome.runtime.lastError.message}`, 'error'); return; }
                if (response && response.success) {
                    showToast('Connection Successful', response.text, 'success');
                } else {
                    showToast('Connection Failed', response.error || 'An unknown error occurred.', 'error');
                }
            });
        });
    }

    const profileSelect = document.getElementById('profileSelect');
    const newProfileBtn = document.getElementById('newProfileBtn');
    const renameProfileBtn = document.getElementById('renameProfileBtn');
    const deleteProfileBtn = document.getElementById('deleteProfileBtn');
    const savePromptsButton = document.getElementById('savePromptsButton');
    
    const promptTextareas = {
        cleaning: document.getElementById('cleaningPrompt'),
        answer: document.getElementById('answerPrompt'),
        explanation: document.getElementById('explanationPrompt'),
        summarize: document.getElementById('summarizePrompt'),
        translate: document.getElementById('translatePrompt'),
        rephrase: document.getElementById('rephrasePrompt')
    };

    const promptTempSliders = {
        answer: document.getElementById('answer_temp_slider'),
        explanation: document.getElementById('explanation_temp_slider'),
        summarize: document.getElementById('summarize_temp_slider'),
        translate: document.getElementById('translate_temp_slider'),
        rephrase: document.getElementById('rephrase_temp_slider')
    };

    const rephraseLanguagesInput = document.getElementById('rephraseLanguages');

    function initializeTempSliders() {
        Object.values(promptTempSliders).forEach(slider => {
            if (slider) {
                const valueDisplay = document.getElementById(slider.dataset.target);
                slider.addEventListener('input', () => {
                    valueDisplay.textContent = parseFloat(slider.value).toFixed(1);
                });
            }
        });
    }

    function updateButtonStates() {
        const selectedProfile = profileSelect.value;
        const isDefault = selectedProfile === 'Default';
        const isLastProfile = profileSelect.options.length <= 1;
        if (renameProfileBtn) renameProfileBtn.disabled = isDefault;
        if (deleteProfileBtn) deleteProfileBtn.disabled = isDefault || isLastProfile;
    }

    async function populateProfileSelector() {
        const { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
        if (!profileSelect) return;
        profileSelect.innerHTML = '';
        for (const profileName in promptProfiles) {
            const option = document.createElement('option');
            option.value = profileName;
            option.textContent = profileName;
            profileSelect.appendChild(option);
        }
        profileSelect.value = activeProfile;
        updateButtonStates();
    }

    async function loadPromptsForActiveProfile() {
        const { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
        const activeProfileData = promptProfiles[activeProfile] || {};
        
        for (const key in promptTextareas) {
            if (promptTextareas[key]) {
                promptTextareas[key].value = activeProfileData[key] || DEFAULT_PROMPTS[key] || '';
                promptTextareas[key].placeholder = DEFAULT_PROMPTS[key] || '';
            }
        }

        for (const key in promptTempSliders) {
            const slider = promptTempSliders[key];
            if (slider) {
                const valueDisplay = document.getElementById(slider.dataset.target);
                const tempValue = activeProfileData[`${key}_temp`] !== undefined ? activeProfileData[`${key}_temp`] : globalTemperature;
                slider.value = tempValue;
                valueDisplay.textContent = parseFloat(tempValue).toFixed(1);
                slider.title = `Using ${activeProfileData[`${key}_temp`] !== undefined ? 'profile-specific' : 'global'} temperature.`;
            }
        }

        if(rephraseLanguagesInput) rephraseLanguagesInput.value = activeProfileData.rephraseLanguages || 'English, Indonesian';
    }

    async function initializePromptManager() {
        let { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
        if (!promptProfiles || Object.keys(promptProfiles).length === 0) {
            promptProfiles = {
                'Default': { ...DEFAULT_PROMPTS, rephraseLanguages: 'English, Indonesian' }
            };
            activeProfile = 'Default';
            await chrome.storage.sync.set({ promptProfiles, activeProfile });
        }
        await populateProfileSelector();
        await loadPromptsForActiveProfile();
        initializeTempSliders();
    }
    if (profileSelect) {
        profileSelect.addEventListener('change', async () => {
            const newActiveProfile = profileSelect.value;
            await chrome.storage.sync.set({ activeProfile: newActiveProfile });
            await loadPromptsForActiveProfile();
            updateButtonStates();
            showToast('Profile Changed', `Active profile is now "${newActiveProfile}".`, 'info');
        });
    }

    if (savePromptsButton) {
        savePromptsButton.addEventListener('click', async () => {
            let { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
            
            const currentProfileData = promptProfiles[activeProfile] || {};
            for (const key in promptTextareas) {
                const currentValue = promptTextareas[key].value.trim();
                const defaultValue = DEFAULT_PROMPTS[key] || '';
                if (currentValue !== defaultValue && currentValue) {
                    currentProfileData[key] = currentValue;
                } else {
                    delete currentProfileData[key];
                }
            }

            for (const key in promptTempSliders) {
                const slider = promptTempSliders[key];
                if (slider) {
                    const tempValue = parseFloat(slider.value);
                    if (Math.abs(tempValue - globalTemperature) > 0.01) { // Use tolerance for float comparison
                        currentProfileData[`${key}_temp`] = tempValue;
                    } else {
                        delete currentProfileData[`${key}_temp`];
                    }
                }
            }

            const currentLangValue = rephraseLanguagesInput.value.trim();
            if (currentLangValue !== 'English, Indonesian') {
                 currentProfileData.rephraseLanguages = currentLangValue;
            } else {
                 delete currentProfileData.rephraseLanguages;
            }

            promptProfiles[activeProfile] = currentProfileData;
            await chrome.storage.sync.set({ promptProfiles });
            
            chrome.runtime.sendMessage({ action: 'updateContextMenus' });
            showToast('Success', `Prompts for "${activeProfile}" have been saved!`, 'success');
        });
    }

    if (newProfileBtn) {
        newProfileBtn.addEventListener('click', async () => {
            const newName = prompt("Enter a name for the new profile:", "My New Profile");
            if (!newName || newName.trim() === '') return;
            let { promptProfiles, activeProfile } = await chrome.storage.sync.get('promptProfiles');
            if (promptProfiles[newName]) {
                showToast('Error', 'A profile with that name already exists.', 'error');
                return;
            }
            promptProfiles[newName] = { ...promptProfiles[activeProfile] };
            await chrome.storage.sync.set({ promptProfiles, activeProfile: newName });
            await initializePromptManager();
            chrome.runtime.sendMessage({ action: 'updateContextMenus' });
            showToast('Success', `Profile "${newName}" created.`, 'success');
        });
    }

    if (renameProfileBtn) {
        renameProfileBtn.addEventListener('click', async () => {
            let { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
            const newName = prompt(`Enter a new name for the "${activeProfile}" profile:`, activeProfile);
            if (!newName || newName.trim() === '' || newName === activeProfile) return;
            if (promptProfiles[newName]) {
                showToast('Error', 'A profile with that name already exists.', 'error');
                return;
            }
            promptProfiles[newName] = promptProfiles[activeProfile];
            delete promptProfiles[activeProfile];
            await chrome.storage.sync.set({ promptProfiles, activeProfile: newName });
            await initializePromptManager();
            chrome.runtime.sendMessage({ action: 'updateContextMenus' });
            showToast('Success', `Profile renamed to "${newName}".`, 'success');
        });
    }
    if (deleteProfileBtn) {
        deleteProfileBtn.addEventListener('click', async () => {
            let { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
            if (confirm(`Are you sure you want to delete the "${activeProfile}" profile? This cannot be undone.`)) {
                delete promptProfiles[activeProfile];
                const newActiveProfile = 'Default';
                await chrome.storage.sync.set({ promptProfiles, activeProfile: newActiveProfile });
                await initializePromptManager();
                chrome.runtime.sendMessage({ action: 'updateContextMenus' });
                showToast('Success', `Profile "${activeProfile}" has been deleted.`, 'success');
            }
        });
    }

    initializePromptManager();
    
    if (clearHistoryButton) {
        clearHistoryButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete all history? This action cannot be undone.')) {
                chrome.storage.local.remove('history', () => {
                    showToast('Success', 'All history has been cleared.', 'success');
                    loadHistory();
                });
            }
        });
    }

    if (exportHistoryButton) {
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
    }
});