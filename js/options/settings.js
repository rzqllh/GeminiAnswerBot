// === Hafizh Rizqullah | GeminiAnswerBot ===
// 🔒 Created by Hafizh Rizqullah || Refine by AI Assistant
// 📄 js/options/settings.js
// 🕓 Created: 2024-05-22 10:15:00
// 🧠 Modular | DRY | SOLID | Apple HIG Compliant

const SettingsModule = (() => {
  let ELS = {};
  let PROMPT_TEXTAREAS = {};
  let PROMPT_TEMP_SLIDERS = {};
  let REPHRASE_LANGUAGES_INPUT = null;
  let globalTemperature = 0.4;

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
      UIModule.showToast('Success', 'General settings have been saved.', 'success');
    });
  }

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
    for (const key in PROMPT_TEXTAREAS) currentProfileData[key] = PROMPT_TEXTAREAS[key].value.trim() || DEFAULT_PROMPTS[key];
    for (const key in PROMPT_TEMP_SLIDERS) currentProfileData[`${key}_temp`] = parseFloat(PROMPT_TEMP_SLIDERS[key].value);
    currentProfileData.rephraseLanguages = REPHRASE_LANGUAGES_INPUT.value.trim();
    promptProfiles[activeProfile] = currentProfileData;
    await chrome.storage.sync.set({ promptProfiles });
    chrome.runtime.sendMessage({ action: 'updateContextMenus' });
    UIModule.showToast('Success', `Prompts for "${activeProfile}" have been saved.`, 'success');
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
        await chrome.storage.sync.clear();
        await chrome.storage.local.remove(['history']);
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
        ELS.revealApiKey.querySelector('.icon-eye').classList.toggle('hidden', !isPassword);
        ELS.revealApiKey.querySelector('.icon-eye-slash').classList.toggle('hidden', isPassword);
    });

    ELS.profileSelect.addEventListener('change', async () => {
        const newActiveProfile = ELS.profileSelect.value;
        await chrome.storage.sync.set({ activeProfile: newActiveProfile });
        await loadPromptsForActiveProfile();
        updateProfileButtonStates();
        UIModule.showToast('Profile Changed', `Active profile is now "${newActiveProfile}".`, 'info');
    });

    ELS.newProfileBtn.addEventListener('click', async () => {
        const newName = prompt("Enter a name for the new profile:", "My New Profile");
        if (!newName || newName.trim() === '') return;
        let { promptProfiles } = await chrome.storage.sync.get('promptProfiles');
        if (promptProfiles[newName]) { UIModule.showToast('Error', 'A profile with that name already exists.', 'error'); return; }
        const { activeProfile } = await chrome.storage.sync.get('activeProfile');
        promptProfiles[newName] = { ...promptProfiles[activeProfile] };
        await chrome.storage.sync.set({ promptProfiles, activeProfile: newName });
        await initializePromptManager();
        UIModule.showToast('Success', `Profile "${newName}" created.`, 'success');
    });

    // ... (rename, delete, reset buttons) ...
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