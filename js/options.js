// js/options.js

document.addEventListener('DOMContentLoaded', function() {
    let activeToast = null;
    let globalTemperature = 0.4;

    const ELS = {
        notificationContainer: document.getElementById('notification-container'),
        historyListContainer: document.getElementById('history-list-container'),
        navLinks: document.querySelectorAll('.settings-sidebar a'),
        contentPanes: document.querySelectorAll('.content-pane'),
        saveGeneralButton: document.getElementById('saveGeneralButton'),
        testButton: document.getElementById('testButton'),
        apiKeyInput: document.getElementById('apiKey'),
        revealApiKey: document.getElementById('revealApiKey'),
        modelSelect: document.getElementById('modelSelect'),
        responseToneSelect: document.getElementById('responseToneSelect'),
        autoHighlightToggle: document.getElementById('autoHighlightToggle'),
        preSubmissionCheckToggle: document.getElementById('preSubmissionCheckToggle'),
        temperatureSlider: document.getElementById('temperatureSlider'),
        temperatureValue: document.getElementById('temperatureValue'),
        clearHistoryButton: document.getElementById('clearHistoryButton'),
        exportHistoryButton: document.getElementById('exportHistoryButton'),
        resetSettingsButton: document.getElementById('resetSettingsButton'),
        profileSelect: document.getElementById('profileSelect'),
        newProfileBtn: document.getElementById('newProfileBtn'),
        renameProfileBtn: document.getElementById('renameProfileBtn'),
        deleteProfileBtn: document.getElementById('deleteProfileBtn'),
        savePromptsButton: document.getElementById('savePromptsButton'),
        confirmOverlay: document.getElementById('custom-confirm-overlay'),
        confirmTitle: document.getElementById('custom-confirm-title'),
        confirmMessage: document.getElementById('custom-confirm-message'),
        confirmOk: document.getElementById('custom-confirm-ok'),
        confirmCancel: document.getElementById('custom-confirm-cancel'),
        promptResetButtons: document.querySelectorAll('.prompt-reset-btn')
    };
    
    const PROMPT_TEXTAREAS = {
        cleaning: document.getElementById('cleaningPrompt'),
        answer: document.getElementById('answerPrompt'),
        explanation: document.getElementById('explanationPrompt'),
        summarize: document.getElementById('summarizePrompt'),
        translate: document.getElementById('translatePrompt'),
        rephrase: document.getElementById('rephrasePrompt')
    };

    const PROMPT_TEMP_SLIDERS = {
        answer: document.getElementById('answer_temp_slider'),
        explanation: document.getElementById('explanation_temp_slider'),
        summarize: document.getElementById('summarize_temp_slider'),
        translate: document.getElementById('translate_temp_slider'),
        rephrase: document.getElementById('rephrase_temp_slider')
    };

    const REPHRASE_LANGUAGES_INPUT = document.getElementById('rephraseLanguages');
    
    function showToast(title, message, type = 'info') {
        if (activeToast) activeToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        const iconMap = {
          success: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
          error: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
          info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };

        toast.innerHTML = `
          <div class="toast-icon toast-icon-${type}">${iconMap[type] || iconMap.info}</div>
          <div class="toast-text-content">
            <strong>${_escapeHtml(title)}</strong>
            <div class="toast-message">${_escapeHtml(message)}</div>
          </div>
        `;

        ELS.notificationContainer.appendChild(toast);
        activeToast = toast;

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
          toast.classList.remove('show');
          toast.addEventListener('transitionend', () => {
            if(toast.parentElement) toast.remove();
            if (activeToast === toast) activeToast = null;
          }, { once: true });
        }, 4000);
    }
    
    function showConfirm({ title, message, okLabel = 'OK', okClass = 'button-primary' }) {
        return new Promise(resolve => {
            ELS.confirmTitle.textContent = title;
            ELS.confirmMessage.textContent = message;
            ELS.confirmOk.textContent = okLabel;
            ELS.confirmOk.className = `button ${okClass}`;
            ELS.confirmOverlay.classList.remove('hidden');
            setTimeout(() => ELS.confirmOverlay.classList.add('show'), 10);

            const close = (value) => {
                ELS.confirmOverlay.classList.remove('show');
                ELS.confirmOverlay.addEventListener('transitionend', () => {
                    ELS.confirmOverlay.classList.add('hidden');
                    ELS.confirmOk.onclick = null;
                    ELS.confirmCancel.onclick = null;
                    resolve(value);
                }, { once: true });
            };

            ELS.confirmOk.onclick = () => close(true);
            ELS.confirmCancel.onclick = () => close(false);
        });
    }

    // --- Navigation ---
    function showInitialTab() {
        const hash = window.location.hash.slice(1);
        const targetLink = document.querySelector(`.settings-sidebar a[href="#${hash}"]`);
        if (hash && targetLink) {
            switchTab(hash);
        } else {
            switchTab('general');
        }
    }
    
    function switchTab(targetId) {
        ELS.navLinks.forEach(navLink => {
            const isActive = navLink.getAttribute('href') === `#${targetId}`;
            navLink.classList.toggle('active', isActive);
        });
        ELS.contentPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === targetId);
        });
        window.location.hash = targetId;
        if (targetId === 'history') loadHistory();
    }
    
    // --- General Settings ---
    async function loadGeneralSettings() {
      const settings = await chrome.storage.sync.get(['geminiApiKey', 'selectedModel', 'autoHighlight', 'preSubmissionCheck', 'responseTone', 'temperature']);
      ELS.apiKeyInput.value = settings.geminiApiKey || '';
      ELS.modelSelect.value = settings.selectedModel || 'gemini-1.5-pro-latest';
      ELS.responseToneSelect.value = settings.responseTone || 'normal';
      ELS.autoHighlightToggle.checked = settings.autoHighlight ?? true;
      ELS.preSubmissionCheckToggle.checked = settings.preSubmissionCheck ?? true;

      const temp = settings.temperature !== undefined ? settings.temperature : 0.4;
      ELS.temperatureSlider.value = temp;
      ELS.temperatureValue.textContent = parseFloat(temp).toFixed(1);
      globalTemperature = temp;
    }

    function saveGeneralSettings() {
      const newGlobalTemp = parseFloat(ELS.temperatureSlider.value);
      const settingsToSave = {
          'geminiApiKey': ELS.apiKeyInput.value.trim(),
          'selectedModel': ELS.modelSelect.value,
          'responseTone': ELS.responseToneSelect.value,
          'autoHighlight': ELS.autoHighlightToggle.checked,
          'preSubmissionCheck': ELS.preSubmissionCheckToggle.checked,
          'temperature': newGlobalTemp
      };
      chrome.storage.sync.set(settingsToSave, () => {
          globalTemperature = newGlobalTemp;
          loadPromptsForActiveProfile();
          showToast('Success', 'General settings have been saved.', 'success');
      });
    }

    // --- History Management ---
    async function loadHistory() {
        // ... (function body remains the same)
    }

    // --- Prompt Profile Management ---
    function updateProfileButtonStates() {
        const selectedProfile = ELS.profileSelect.value;
        const isDefault = selectedProfile === 'Default';
        const isLastProfile = ELS.profileSelect.options.length <= 1;
        ELS.renameProfileBtn.disabled = isDefault;
        ELS.deleteProfileBtn.disabled = isDefault || isLastProfile;
    }

    async function populateProfileSelector() {
        const { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
        ELS.profileSelect.innerHTML = '';
        for (const profileName in promptProfiles) {
            const option = document.createElement('option');
            option.value = profileName;
            option.textContent = profileName;
            ELS.profileSelect.appendChild(option);
        }
        ELS.profileSelect.value = activeProfile;
        updateProfileButtonStates();
    }
    
    async function loadPromptsForActiveProfile() {
        const { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
        const activeProfileData = promptProfiles[activeProfile] || {};
        
        for (const key in PROMPT_TEXTAREAS) {
            if (PROMPT_TEXTAREAS[key]) {
                PROMPT_TEXTAREAS[key].value = activeProfileData[key] || DEFAULT_PROMPTS[key] || '';
                PROMPT_TEXTAREAS[key].placeholder = DEFAULT_PROMPTS[key] || '';
            }
        }

        for (const key in PROMPT_TEMP_SLIDERS) {
            const slider = PROMPT_TEMP_SLIDERS[key];
            if (slider) {
                const valueDisplay = document.getElementById(slider.dataset.target);
                const tempValue = activeProfileData[`${key}_temp`] !== undefined ? activeProfileData[`${key}_temp`] : globalTemperature;
                slider.value = tempValue;
                if (valueDisplay) valueDisplay.textContent = parseFloat(tempValue).toFixed(1);

                const controlGroup = slider.closest('.temperature-control-group');
                const isOverridden = Math.abs(tempValue - globalTemperature) > 0.01;
                if(controlGroup) controlGroup.classList.toggle('temp-override', isOverridden);
            }
        }

        if (REPHRASE_LANGUAGES_INPUT) {
            REPHRASE_LANGUAGES_INPUT.value = activeProfileData.rephraseLanguages || 'English, Indonesian';
        }
    }

    async function initializePromptManager() {
        let { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
        if (!promptProfiles || Object.keys(promptProfiles).length === 0) {
            promptProfiles = { 'Default': { ...DEFAULT_PROMPTS, rephraseLanguages: 'English, Indonesian' } };
            activeProfile = 'Default';
            await chrome.storage.sync.set({ promptProfiles, activeProfile });
        }
        await populateProfileSelector();
        await loadPromptsForActiveProfile();
    }

    async function savePrompts() {
        let { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
        const currentProfileData = promptProfiles[activeProfile] || {};

        for (const key in PROMPT_TEXTAREAS) {
            currentProfileData[key] = PROMPT_TEXTAREAS[key].value.trim() || DEFAULT_PROMPTS[key];
        }
        for (const key in PROMPT_TEMP_SLIDERS) {
            currentProfileData[`${key}_temp`] = parseFloat(PROMPT_TEMP_SLIDERS[key].value);
        }
        currentProfileData.rephraseLanguages = REPHRASE_LANGUAGES_INPUT.value.trim();
        
        promptProfiles[activeProfile] = currentProfileData;
        await chrome.storage.sync.set({ promptProfiles });
        chrome.runtime.sendMessage({ action: 'updateContextMenus' });
        showToast('Success', `Prompts for "${activeProfile}" have been saved.`, 'success');
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        ELS.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(link.getAttribute('href').substring(1));
            });
        });

        ELS.revealApiKey.addEventListener('click', () => {
            const isPassword = ELS.apiKeyInput.type === 'password';
            ELS.apiKeyInput.type = isPassword ? 'text' : 'password';
            ELS.revealApiKey.querySelector('.icon-eye').classList.toggle('hidden', !isPassword);
            ELS.revealApiKey.querySelector('.icon-eye-slash').classList.toggle('hidden', isPassword);
        });

        ELS.saveGeneralButton.addEventListener('click', saveGeneralSettings);
        
        ELS.testButton.addEventListener('click', () => {
            const apiKey = ELS.apiKeyInput.value.trim();
            if (!apiKey) {
                showToast('API Key Missing', 'Please enter an API key to test.', 'error');
                return;
            }
            showToast('Testing', 'Testing connection, please wait...', 'info');
            ELS.testButton.disabled = true;
            chrome.runtime.sendMessage({ action: 'testApiConnection', payload: { apiKey } }, (response) => {
                ELS.testButton.disabled = false;
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

        ELS.clearHistoryButton.addEventListener('click', async () => {
            const confirmed = await showConfirm({
                title: 'Clear History',
                message: 'Are you sure you want to delete all interaction history? This action cannot be undone.',
                okLabel: 'Clear All',
                okClass: 'button-danger'
            });
            if (confirmed) {
                chrome.storage.local.remove('history', () => {
                    showToast('Success', 'All history has been cleared.', 'success');
                    loadHistory();
                });
            }
        });

        ELS.exportHistoryButton.addEventListener('click', async () => {
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

        ELS.resetSettingsButton.addEventListener('click', async () => {
            const confirmed = await showConfirm({
                title: 'Reset All Settings',
                message: 'This will reset all settings, including your API key and custom prompts, to their defaults. This action cannot be undone.',
                okLabel: 'Reset Everything',
                okClass: 'button-danger'
            });
            if (confirmed) {
                await chrome.storage.sync.clear();
                await chrome.storage.local.remove(['history']);
                showToast('Success', 'All settings have been reset.', 'success');
                setTimeout(() => window.location.reload(), 1000);
            }
        });

        ELS.profileSelect.addEventListener('change', async () => {
            const newActiveProfile = ELS.profileSelect.value;
            await chrome.storage.sync.set({ activeProfile: newActiveProfile });
            await loadPromptsForActiveProfile();
            updateProfileButtonStates();
            showToast('Profile Changed', `Active profile is now "${newActiveProfile}".`, 'info');
        });

        ELS.savePromptsButton.addEventListener('click', savePrompts);
        
        ELS.newProfileBtn.addEventListener('click', async () => {
            const newName = prompt("Enter a name for the new profile:", "My New Profile");
            if (!newName || newName.trim() === '') return;
            let { promptProfiles } = await chrome.storage.sync.get('promptProfiles');
            if (promptProfiles[newName]) {
                showToast('Error', 'A profile with that name already exists.', 'error');
                return;
            }
            const { activeProfile } = await chrome.storage.sync.get('activeProfile');
            promptProfiles[newName] = { ...promptProfiles[activeProfile] };
            await chrome.storage.sync.set({ promptProfiles, activeProfile: newName });
            await initializePromptManager();
            showToast('Success', `Profile "${newName}" created.`, 'success');
        });
        
        ELS.renameProfileBtn.addEventListener('click', async () => {
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
            showToast('Success', `Profile renamed to "${newName}".`, 'success');
        });

        ELS.deleteProfileBtn.addEventListener('click', async () => {
            let { promptProfiles, activeProfile } = await chrome.storage.sync.get(['promptProfiles', 'activeProfile']);
            const confirmed = await showConfirm({
                title: `Delete Profile`,
                message: `Are you sure you want to delete the "${activeProfile}" profile? This cannot be undone.`,
                okLabel: 'Delete',
                okClass: 'button-danger'
            });
            if (confirmed) {
                delete promptProfiles[activeProfile];
                const newActiveProfile = 'Default';
                await chrome.storage.sync.set({ promptProfiles, activeProfile: newActiveProfile });
                await initializePromptManager();
                showToast('Success', `Profile "${activeProfile}" has been deleted.`, 'success');
            }
        });

        ELS.promptResetButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const key = e.currentTarget.dataset.promptKey;
                if (key && PROMPT_TEXTAREAS[key] && DEFAULT_PROMPTS[key]) {
                    PROMPT_TEXTAREAS[key].value = DEFAULT_PROMPTS[key];
                    showToast('Prompt Reset', `The "${key}" prompt has been reset to its default.`, 'info');
                }
            });
        });
    }
    
    // --- Initialization ---
    async function main() {
        setupEventListeners();
        await loadGeneralSettings();
        await initializePromptManager();
        showInitialTab();
    }

    main();
});