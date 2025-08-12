// === Hafizh Signature Code ===
// Author: Hafizh Rizqullah — GeminiAnswerBot
// File: js/options/settings.js
// Created: 2025-08-08 16:42:03

const SettingsModule = (() => {
  let ELS = {};
  let PROMPT_TEXTAREAS = {};
  let PROMPT_TEMP_SLIDERS = {};
  let REPHRASE_LANGUAGES_INPUT = null;
  let globalTemperature = 0.4;

  const PROFILE_KEY_PREFIX = 'profile_';

  function updateSliderTooltip(slider) {
    const tooltip = slider.parentElement.querySelector('.slider-value-display');
    if (!tooltip) return;
    const value = parseFloat(slider.value);
    tooltip.textContent = value.toFixed(1);
    
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const percent = (value - min) / (max - min);
    const thumbWidth = 24; 
    const trackWidth = slider.offsetWidth;
    const tooltipWidth = tooltip.offsetWidth;
    
    let newLeft = percent * (trackWidth - thumbWidth) + (thumbWidth / 2) - (tooltipWidth / 2);
    newLeft = Math.max(0, Math.min(newLeft, trackWidth - tooltipWidth));
    tooltip.style.left = `${newLeft}px`;
  }

  function initializeSliderInteractions(slider) {
    const tooltip = slider.parentElement.querySelector('.slider-value-display');
    if (!tooltip) return;

    const showTooltip = () => tooltip.classList.add('tooltip-visible');
    const hideTooltip = () => tooltip.classList.remove('tooltip-visible');

    slider.addEventListener('input', () => updateSliderTooltip(slider));
    slider.addEventListener('mousedown', showTooltip);
    slider.addEventListener('mouseup', hideTooltip);
    slider.addEventListener('mouseenter', showTooltip);
    slider.addEventListener('mouseleave', hideTooltip);
    
    setTimeout(() => updateSliderTooltip(slider), 50);
  }

  async function loadGeneralSettings() {
    const settings = await StorageManager.get(['geminiApiKey', 'selectedModel', 'autoHighlight', 'preSubmissionCheck', 'temperature', 'debugMode']);
    ELS.apiKeyInput.value = settings.geminiApiKey || '';
    ELS.modelSelect.value = settings.selectedModel || 'gemini-1.5-pro-latest';
    ELS.autoHighlightToggle.checked = settings.autoHighlight ?? true;
    ELS.preSubmissionCheckToggle.checked = settings.preSubmissionCheck ?? true;
    ELS.debugModeToggle.checked = settings.debugMode ?? false;
    const temp = settings.temperature !== undefined ? settings.temperature : 0.4;
    ELS.temperatureSlider.value = temp;
    globalTemperature = temp;
    updateSliderTooltip(ELS.temperatureSlider);

    const syncAvailable = await StorageManager.isSyncAvailable();
    document.getElementById('syncWarning').classList.toggle('hidden', syncAvailable);
  }

  async function saveGeneralSettings() {
    const newGlobalTemp = parseFloat(ELS.temperatureSlider.value);
    const settingsToSave = {
      geminiApiKey: ELS.apiKeyInput.value.trim(),
      selectedModel: ELS.modelSelect.value,
      temperature: newGlobalTemp
    };
    try {
      await StorageManager.set(settingsToSave);
      globalTemperature = newGlobalTemp;
      await loadPromptsForActiveProfile();
      UIModule.showToast('Success', 'General settings have been saved.', 'success');
    } catch (error) {
      UIModule.showToast('Error Saving', 'Could not save settings. ' + error.message, 'error');
    }
  }

  function updateProfileButtonStates() {
    const selectedProfile = ELS.profileSelect.value;
    const isDefault = selectedProfile === 'Default';
    const isLastProfile = ELS.profileSelect.options.length <= 1;
    ELS.renameProfileBtn.disabled = isDefault;
    ELS.deleteProfileBtn.disabled = isDefault || isLastProfile;
  }

  async function populateProfileSelector() {
    const { profileList = ['Default'], activeProfile = 'Default' } = await StorageManager.get(['profileList', 'activeProfile']);
    ELS.profileSelect.innerHTML = '';
    profileList.forEach(profileName => {
      const option = document.createElement('option');
      option.value = profileName;
      option.textContent = profileName;
      ELS.profileSelect.appendChild(option);
    });
    ELS.profileSelect.value = activeProfile;
    updateProfileButtonStates();
  }

  async function loadPromptsForActiveProfile() {
    const { activeProfile = 'Default' } = await StorageManager.get('activeProfile');
    const profileKey = `${PROFILE_KEY_PREFIX}${activeProfile}`;
    const result = await StorageManager.get(profileKey);
    const activeProfileData = result[profileKey] || {};

    for (const key in PROMPT_TEXTAREAS) {
      if (PROMPT_TEXTAREAS[key]) {
        PROMPT_TEXTAREAS[key].value = activeProfileData[key] || DEFAULT_PROMPTS[key] || '';
        PROMPT_TEXTAREAS[key].placeholder = DEFAULT_PROMPTS[key] || '';
      }
    }
    for (const key in PROMPT_TEMP_SLIDERS) {
      const slider = PROMPT_TEMP_SLIDERS[key];
      if (slider) {
        const tempValue = activeProfileData[`${key}_temp`] !== undefined ? activeProfileData[`${key}_temp`] : globalTemperature;
        slider.value = tempValue;
        updateSliderTooltip(slider);
        const controlGroup = slider.closest('.temperature-control-group');
        const isOverridden = Math.abs(parseFloat(slider.value) - globalTemperature) > 0.01;
        if(controlGroup) controlGroup.classList.toggle('temp-override', isOverridden);
      }
    }
    if (REPHRASE_LANGUAGES_INPUT) {
      REPHRASE_LANGUAGES_INPUT.value = activeProfileData.rephraseLanguages || 'English, Indonesian';
    }
  }

  async function initializePromptManager() {
    let { profileList } = await StorageManager.get('profileList');
    if (!profileList || profileList.length === 0) {
      const defaultProfile = { ...DEFAULT_PROMPTS, rephraseLanguages: 'English, Indonesian' };
      await StorageManager.set({
        profileList: ['Default'],
        activeProfile: 'Default',
        [`${PROFILE_KEY_PREFIX}Default`]: defaultProfile
      });
    }
    await populateProfileSelector();
    await loadPromptsForActiveProfile();
  }

  async function savePrompts() {
    const { activeProfile } = await StorageManager.get('activeProfile');
    const profileKey = `${PROFILE_KEY_PREFIX}${activeProfile}`;
    const result = await StorageManager.get(profileKey);
    const currentProfileData = result[profileKey] || {};

    for (const key in PROMPT_TEXTAREAS) {
        if (PROMPT_TEXTAREAS[key]) {
            currentProfileData[key] = PROMPT_TEXTAREAS[key].value.trim() || DEFAULT_PROMPTS[key];
        }
    }
    for (const key in PROMPT_TEMP_SLIDERS) {
        const sliderValue = parseFloat(PROMPT_TEMP_SLIDERS[key].value);
        if (Math.abs(sliderValue - globalTemperature) > 0.01) {
            currentProfileData[`${key}_temp`] = sliderValue;
        } else {
            delete currentProfileData[`${key}_temp`];
        }
    }
    currentProfileData.rephraseLanguages = REPHRASE_LANGUAGES_INPUT.value.trim();
    
    try {
      await StorageManager.set({ [profileKey]: currentProfileData });
      chrome.runtime.sendMessage({ action: 'updateContextMenus' });
      UIModule.showToast('Success', `Prompts for "${activeProfile}" have been saved.`, 'success');
      await loadPromptsForActiveProfile();
    } catch (error) {
      UIModule.showToast('Error Saving Prompts', error.message, 'error');
    }
  }

  function testConnection() {
    const apiKey = ELS.apiKeyInput.value.trim();
    if (!apiKey) {
      UIModule.showToast('API Key Missing', 'Please enter an API key to test.', 'error');
      return;
    }
    UIModule.showToast('Testing', 'Testing connection, please wait...', 'info');
    ELS.testButton.disabled = true;
    chrome.runtime.sendMessage({ action: 'testApiConnection', payload: { apiKey } }, (response) => {
      ELS.testButton.disabled = false;
      if (chrome.runtime.lastError) {
        UIModule.showToast('Connection Error', `Error: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }
      if (response && response.success) {
        UIModule.showToast('Connection Successful', response.text, 'success');
      } else {
        UIModule.showToast('Connection Failed', response.error || 'An unknown error occurred.', 'error');
      }
    });
  }

  async function resetAllSettings() {
    const confirmed = await UIModule.showConfirm({
        title: 'Reset All Settings',
        message: 'This will reset all settings, including your API key and custom prompts, to their defaults. This action cannot be undone.',
        okLabel: 'Reset Everything',
        okClass: 'button-danger'
    });
    if (confirmed) {
        await StorageManager.clear();
        await StorageManager.local.clear();
        UIModule.showToast('Success', 'All settings have been reset.', 'success');
        setTimeout(() => window.location.reload(), 1000);
    }
  }

  function bindEventListeners() {
    ELS.saveGeneralButton.addEventListener('click', saveGeneralSettings);
    ELS.testButton.addEventListener('click', testConnection);
    ELS.resetSettingsButton.addEventListener('click', resetAllSettings);
    ELS.savePromptsButton.addEventListener('click', savePrompts);
    ELS.revealApiKey.addEventListener('click', () => {
        const isPassword = ELS.apiKeyInput.type === 'password';
        ELS.apiKeyInput.type = isPassword ? 'text' : 'password';
        ELS.revealApiKey.querySelector('.icon-eye').classList.toggle('hidden', isPassword);
        ELS.revealApiKey.querySelector('.icon-eye-slash').classList.toggle('hidden', !isPassword);
    });
    
    document.querySelectorAll('input[type="range"]').forEach(initializeSliderInteractions);

    const setupToggleListener = (toggleElement, key, name) => {
      toggleElement.addEventListener('change', async (e) => {
        const isEnabled = e.target.checked;
        try {
          await StorageManager.set({ [key]: isEnabled });
          UIModule.showToast('Setting Saved', `${name} has been ${isEnabled ? 'enabled' : 'disabled'}.`, 'success');
        } catch (error) {
          UIModule.showToast('Error', `Could not save ${name} setting.`, 'error');
        }
      });
    };

    setupToggleListener(ELS.autoHighlightToggle, 'autoHighlight', 'Auto-Highlight');
    setupToggleListener(ELS.preSubmissionCheckToggle, 'preSubmissionCheck', 'Pre-Submission Check');
    setupToggleListener(ELS.debugModeToggle, 'debugMode', 'Debug Mode');

    ELS.temperatureSlider.addEventListener('input', (e) => {
        const newTemp = parseFloat(e.target.value);
        globalTemperature = newTemp;
        for (const key in PROMPT_TEMP_SLIDERS) {
            const slider = PROMPT_TEMP_SLIDERS[key];
            const controlGroup = slider.closest('.temperature-control-group');
            const isOverridden = Math.abs(parseFloat(slider.value) - globalTemperature) > 0.01;
            controlGroup.classList.toggle('temp-override', isOverridden);
        }
    });
    for (const key in PROMPT_TEMP_SLIDERS) {
        const slider = PROMPT_TEMP_SLIDERS[key];
        slider.addEventListener('input', () => {
            const controlGroup = slider.closest('.temperature-control-group');
            const isOverridden = Math.abs(parseFloat(slider.value) - globalTemperature) > 0.01;
            controlGroup.classList.toggle('temp-override', isOverridden);
        });
    }

    ELS.profileSelect.addEventListener('change', async () => {
        const newActiveProfile = ELS.profileSelect.value;
        await StorageManager.set({ activeProfile: newActiveProfile });
        await loadPromptsForActiveProfile();
        updateProfileButtonStates();
        UIModule.showToast('Profile Changed', `Active profile is now "${newActiveProfile}".`, 'info');
    });
    ELS.newProfileBtn.addEventListener('click', async () => {
        const newName = prompt("Enter a name for the new profile:", "My New Profile");
        if (!newName || newName.trim() === '') return;
        let { profileList } = await StorageManager.get('profileList');
        if (profileList.includes(newName)) { UIModule.showToast('Error', 'A profile with that name already exists.', 'error'); return; }
        
        const { activeProfile } = await StorageManager.get('activeProfile');
        const activeProfileKey = `${PROFILE_KEY_PREFIX}${activeProfile}`;
        const result = await StorageManager.get(activeProfileKey);
        const newProfileData = { ...result[activeProfileKey] };
        
        profileList.push(newName);
        await StorageManager.set({
            profileList: profileList,
            activeProfile: newName,
            [`${PROFILE_KEY_PREFIX}${newName}`]: newProfileData
        });
        await initializePromptManager();
        UIModule.showToast('Success', `Profile "${newName}" created.`, 'success');
    });
    ELS.renameProfileBtn.addEventListener('click', async () => {
        let { profileList, activeProfile } = await StorageManager.get(['profileList', 'activeProfile']);
        const newName = prompt(`Enter a new name for the "${activeProfile}" profile:`, activeProfile);
        if (!newName || newName.trim() === '' || newName === activeProfile) return;
        if (profileList.includes(newName)) {
            UIModule.showToast('Error', 'A profile with that name already exists.', 'error');
            return;
        }
        
        const oldKey = `${PROFILE_KEY_PREFIX}${activeProfile}`;
        const newKey = `${PROFILE_KEY_PREFIX}${newName}`;
        const result = await StorageManager.get(oldKey);
        const profileData = result[oldKey];

        const newProfileList = profileList.map(p => p === activeProfile ? newName : p);

        await StorageManager.set({
            profileList: newProfileList,
            activeProfile: newName,
            [newKey]: profileData
        });
        await StorageManager.remove(oldKey);

        await initializePromptManager();
        UIModule.showToast('Success', `Profile renamed to "${newName}".`, 'success');
    });
    ELS.deleteProfileBtn.addEventListener('click', async () => {
        let { profileList, activeProfile } = await StorageManager.get(['profileList', 'activeProfile']);
        const confirmed = await UIModule.showConfirm({
            title: `Delete Profile`,
            message: `Are you sure you want to delete the "${activeProfile}" profile? This cannot be undone.`,
            okLabel: 'Delete',
            okClass: 'button-danger'
        });
        if (confirmed) {
            const keyToRemove = `${PROFILE_KEY_PREFIX}${activeProfile}`;
            const newProfileList = profileList.filter(p => p !== activeProfile);
            await StorageManager.set({
                profileList: newProfileList,
                activeProfile: 'Default'
            });
            await StorageManager.remove(keyToRemove);
            await initializePromptManager();
            UIModule.showToast('Success', `Profile "${activeProfile}" has been deleted.`, 'success');
        }
    });
    ELS.promptResetButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const key = e.currentTarget.dataset.promptKey;
            if (key && PROMPT_TEXTAREAS[key] && DEFAULT_PROMPTS[key]) {
                PROMPT_TEXTAREAS[key].value = DEFAULT_PROMPTS[key];
                UIModule.showToast('Prompt Reset', `The "${key}" prompt has been reset to its default.`, 'info');
            }
        });
    });
  }
  
  async function initialize(elements, prompts, temps, rephraseInput) {
    ELS = elements;
    PROMPT_TEXTAREAS = prompts;
    PROMPT_TEMP_SLIDERS = temps;
    REPHRASE_LANGUAGES_INPUT = rephraseInput;
    await loadGeneralSettings();
    await initializePromptManager();
    bindEventListeners();
  }

  return {
    initialize,
  };
})();