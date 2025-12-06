// === Hafizh Signature Code ===
// Author: Hafizh Rizqullah — GeminiAnswerBot Specialist
// File: js/options/settings.js
// Created: 2025-08-27 12:05:00

const SettingsModule = (() => {
  let ELS = {};
  let PROMPT_TEXTAREAS = {};
  let PROMPT_TEMP_SLIDERS = {};
  let REPHRASE_LANGUAGES_INPUT = null;
  let globalTemperature = 0.4;

  const PROFILE_KEY_PREFIX = 'profile_';

  const MODAL_ELS = {
    modal: document.getElementById('customActionModal'),
    title: document.getElementById('customActionModalTitle'),
    form: document.getElementById('customActionForm'),
    idInput: document.getElementById('customActionId'),
    nameInput: document.getElementById('customActionName'),
    promptInput: document.getElementById('customActionPrompt'),
    saveButton: document.getElementById('customActionSave'),
    cancelButton: document.getElementById('customActionCancel'),
    addNewButton: document.getElementById('addNewActionButton'),
    actionsList: document.getElementById('customActionsList'),
  };

  // **NEW**: Element for the permissions toggle
  const fullAccessToggle = document.getElementById('fullAccessToggle');

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
    ELS.modelSelect.value = settings.selectedModel || 'gemini-2.5-pro';
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
    
    const keysToFetch = Object.keys(DEFAULT_PROMPTS).map(key => `${PROFILE_KEY_PREFIX}${activeProfile}_${key}`);
    keysToFetch.push(`${PROFILE_KEY_PREFIX}${activeProfile}_rephraseLanguages`);
    
    const profileData = await StorageManager.get(keysToFetch);

    for (const key in PROMPT_TEXTAREAS) {
      const storageKey = `${PROFILE_KEY_PREFIX}${activeProfile}_${key}`;
      if (PROMPT_TEXTAREAS[key]) {
        PROMPT_TEXTAREAS[key].value = profileData[storageKey] || DEFAULT_PROMPTS[key] || '';
        PROMPT_TEXTAREAS[key].placeholder = DEFAULT_PROMPTS[key] || '';
      }
    }
    for (const key in PROMPT_TEMP_SLIDERS) {
      const slider = PROMPT_TEMP_SLIDERS[key];
      const storageKey = `${PROFILE_KEY_PREFIX}${activeProfile}_${key}_temp`;
      if (slider) {
        const tempValue = profileData[storageKey] !== undefined ? profileData[storageKey] : globalTemperature;
        slider.value = tempValue;
        updateSliderTooltip(slider);
        const controlGroup = slider.closest('.temperature-control-group');
        const isOverridden = Math.abs(parseFloat(slider.value) - globalTemperature) > 0.01;
        if(controlGroup) controlGroup.classList.toggle('temp-override', isOverridden);
      }
    }
    if (REPHRASE_LANGUAGES_INPUT) {
      const storageKey = `${PROFILE_KEY_PREFIX}${activeProfile}_rephraseLanguages`;
      REPHRASE_LANGUAGES_INPUT.value = profileData[storageKey] || 'English, Indonesian';
    }
    
    const customActionsKey = `${PROFILE_KEY_PREFIX}${activeProfile}_customActions`;
    const customActions = profileData[customActionsKey] || [];
    renderCustomActions(customActions);
  }

  async function initializePromptManager() {
    let { profileList } = await StorageManager.get('profileList');
    if (!profileList || profileList.length === 0) {
      const defaultProfileSettings = {
        profileList: ['Default'],
        activeProfile: 'Default',
        [`${PROFILE_KEY_PREFIX}Default_rephraseLanguages`]: 'English, Indonesian'
      };
      for(const key in DEFAULT_PROMPTS) {
        defaultProfileSettings[`${PROFILE_KEY_PREFIX}Default_${key}`] = DEFAULT_PROMPTS[key];
      }
      await StorageManager.set(defaultProfileSettings);
    }
    await populateProfileSelector();
    await loadPromptsForActiveProfile();
  }

  async function savePrompts() {
    const { activeProfile } = await StorageManager.get('activeProfile');
    const settingsToSave = {};

    for (const key in PROMPT_TEXTAREAS) {
        const storageKey = `${PROFILE_KEY_PREFIX}${activeProfile}_${key}`;
        if (PROMPT_TEXTAREAS[key]) {
            settingsToSave[storageKey] = PROMPT_TEXTAREAS[key].value.trim() || DEFAULT_PROMPTS[key];
        }
    }
    for (const key in PROMPT_TEMP_SLIDERS) {
        const storageKey = `${PROFILE_KEY_PREFIX}${activeProfile}_${key}_temp`;
        const sliderValue = parseFloat(PROMPT_TEMP_SLIDERS[key].value);
        if (Math.abs(sliderValue - globalTemperature) > 0.01) {
            settingsToSave[storageKey] = sliderValue;
        } else {
            await StorageManager.remove(storageKey);
        }
    }
    settingsToSave[`${PROFILE_KEY_PREFIX}${activeProfile}_rephraseLanguages`] = REPHRASE_LANGUAGES_INPUT.value.trim();
    
    try {
      await StorageManager.set(settingsToSave);
      chrome.runtime.sendMessage({ action: 'updateContextMenus' });
      UIModule.showToast('Success', `Prompts for "${activeProfile}" have been saved.`, 'success');
      await loadPromptsForActiveProfile();
    } catch (error) {
      UIModule.showToast('Error Saving Prompts', error.message, 'error');
    }
  }

  function renderCustomActions(actions) {
    MODAL_ELS.actionsList.innerHTML = '';
    if (!actions || actions.length === 0) {
      MODAL_ELS.actionsList.innerHTML = '<p class="empty-actions-state">No custom actions created yet. Add one below!</p>';
      return;
    }

    actions.forEach(action => {
      const item = document.createElement('div');
      item.className = 'custom-action-item';
      item.innerHTML = `
        <span class="custom-action-name">${_escapeHtml(action.name)}</span>
        <div class="custom-action-buttons">
          <button class="button button-secondary button-icon edit-action-btn" title="Edit Action">✏️</button>
          <button class="button button-danger button-icon delete-action-btn" title="Delete Action">🗑️</button>
        </div>
      `;
      item.querySelector('.edit-action-btn').addEventListener('click', () => openActionModal(action));
      item.querySelector('.delete-action-btn').addEventListener('click', () => deleteCustomAction(action.id));
      MODAL_ELS.actionsList.appendChild(item);
    });
  }

  function openActionModal(action = null) {
    MODAL_ELS.form.reset();
    if (action) {
      MODAL_ELS.title.textContent = 'Edit Action';
      MODAL_ELS.idInput.value = action.id;
      MODAL_ELS.nameInput.value = action.name;
      MODAL_ELS.promptInput.value = action.prompt;
    } else {
      MODAL_ELS.title.textContent = 'Add New Action';
      MODAL_ELS.idInput.value = `custom_${Date.now()}`;
    }
    MODAL_ELS.modal.classList.remove('hidden');
    setTimeout(() => MODAL_ELS.modal.classList.add('show'), 10);
  }

  function closeActionModal() {
    MODAL_ELS.modal.classList.remove('show');
    MODAL_ELS.modal.addEventListener('transitionend', () => {
      MODAL_ELS.modal.classList.add('hidden');
    }, { once: true });
  }

  async function saveCustomAction(e) {
    e.preventDefault();
    const { activeProfile } = await StorageManager.get('activeProfile');
    const customActionsKey = `${PROFILE_KEY_PREFIX}${activeProfile}_customActions`;
    
    const result = await StorageManager.get(customActionsKey);
    let actions = result[customActionsKey] || [];

    const action = {
      id: MODAL_ELS.idInput.value,
      name: MODAL_ELS.nameInput.value.trim(),
      prompt: MODAL_ELS.promptInput.value.trim(),
    };

    const existingIndex = actions.findIndex(a => a.id === action.id);
    if (existingIndex > -1) {
      actions[existingIndex] = action;
    } else {
      actions.push(action);
    }

    try {
      await StorageManager.set({ [customActionsKey]: actions });
      UIModule.showToast('Success', `Action "${action.name}" saved.`, 'success');
      chrome.runtime.sendMessage({ action: 'updateContextMenus' });
      renderCustomActions(actions);
      closeActionModal();
    } catch (error) {
      UIModule.showToast('Error', `Could not save action: ${error.message}`, 'error');
    }
  }

  async function deleteCustomAction(actionId) {
    const confirmed = await UIModule.showConfirm({
      title: 'Delete Action',
      message: 'Are you sure you want to delete this custom action? This cannot be undone.',
      okLabel: 'Delete',
      okClass: 'button-danger'
    });

    if (confirmed) {
      const { activeProfile } = await StorageManager.get('activeProfile');
      const customActionsKey = `${PROFILE_KEY_PREFIX}${activeProfile}_customActions`;
      
      const result = await StorageManager.get(customActionsKey);
      let actions = result[customActionsKey] || [];
      
      const updatedActions = actions.filter(a => a.id !== actionId);

      try {
        await StorageManager.set({ [customActionsKey]: updatedActions });
        UIModule.showToast('Success', 'Action deleted.', 'success');
        chrome.runtime.sendMessage({ action: 'updateContextMenus' });
        renderCustomActions(updatedActions);
      } catch (error) {
        UIModule.showToast('Error', `Could not delete action: ${error.message}`, 'error');
      }
    }
  }

  // **NEW**: Functions to manage optional permissions
  async function initializePermissions() {
    const hasPermission = await chrome.permissions.contains({ origins: ["<all_urls>"] });
    fullAccessToggle.checked = hasPermission;
  }

  async function handlePermissionToggle(e) {
    const isEnabled = e.target.checked;
    try {
      if (isEnabled) {
        const granted = await chrome.permissions.request({ origins: ["<all_urls>"] });
        if (granted) {
          UIModule.showToast('Success', 'Full-Page Access has been enabled.', 'success');
        } else {
          UIModule.showToast('Info', 'Permission request was denied.', 'info');
          e.target.checked = false; // Revert toggle if denied
        }
      } else {
        const removed = await chrome.permissions.remove({ origins: ["<all_urls>"] });
        if (removed) {
          UIModule.showToast('Success', 'Full-Page Access has been disabled.', 'success');
        } else {
          // This case is unlikely but handled for robustness
          UIModule.showToast('Error', 'Could not remove permission.', 'error');
          e.target.checked = true;
        }
      }
    } catch (err) {
      console.error("Permission toggle error:", err);
      UIModule.showToast('Error', 'An error occurred while changing permissions.', 'error');
      e.target.checked = !isEnabled; // Revert on error
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

  async function handleNewProfile() {
    const newName = prompt("Enter a name for the new profile:", "My New Profile");
    if (!newName || newName.trim() === '') return;
    let { profileList, activeProfile } = await StorageManager.get(['profileList', 'activeProfile']);
    if (profileList.includes(newName)) { UIModule.showToast('Error', 'A profile with that name already exists.', 'error'); return; }
    
    const keysToClone = Object.keys(DEFAULT_PROMPTS).map(k => `${PROFILE_KEY_PREFIX}${activeProfile}_${k}`);
    keysToClone.push(`${PROFILE_KEY_PREFIX}${activeProfile}_rephraseLanguages`);
    
    const currentProfileData = await StorageManager.get(keysToClone);
    const newProfileData = {};
    for(const oldKey in currentProfileData) {
        const newKey = oldKey.replace(`${PROFILE_KEY_PREFIX}${activeProfile}_`, `${PROFILE_KEY_PREFIX}${newName}_`);
        newProfileData[newKey] = currentProfileData[oldKey];
    }
    
    profileList.push(newName);
    await StorageManager.set({
        ...newProfileData,
        profileList: profileList,
        activeProfile: newName,
    });
    await initializePromptManager();
    UIModule.showToast('Success', `Profile "${newName}" created.`, 'success');
  }

  async function handleRenameProfile() {
    let { profileList, activeProfile } = await StorageManager.get(['profileList', 'activeProfile']);
    const newName = prompt(`Enter a new name for the "${activeProfile}" profile:`, activeProfile);
    if (!newName || newName.trim() === '' || newName === activeProfile) return;
    if (profileList.includes(newName)) {
        UIModule.showToast('Error', 'A profile with that name already exists.', 'error');
        return;
    }
    
    const keysToMove = Object.keys(DEFAULT_PROMPTS).map(k => `${PROFILE_KEY_PREFIX}${activeProfile}_${k}`);
    keysToMove.push(`${PROFILE_KEY_PREFIX}${activeProfile}_rephraseLanguages`);
    
    const profileData = await StorageManager.get(keysToMove);
    const newSettings = {};
    for(const oldKey in profileData) {
        const newKey = oldKey.replace(`${PROFILE_KEY_PREFIX}${activeProfile}_`, `${PROFILE_KEY_PREFIX}${newName}_`);
        newSettings[newKey] = profileData[oldKey];
    }

    const newProfileList = profileList.map(p => p === activeProfile ? newName : p);
    newSettings.profileList = newProfileList;
    newSettings.activeProfile = newName;

    await StorageManager.set(newSettings);
    await StorageManager.remove(keysToMove);

    await initializePromptManager();
    UIModule.showToast('Success', `Profile renamed to "${newName}".`, 'success');
  }

  async function handleDeleteProfile() {
    let { profileList, activeProfile } = await StorageManager.get(['profileList', 'activeProfile']);
    const confirmed = await UIModule.showConfirm({
        title: `Delete Profile`,
        message: `Are you sure you want to delete the "${activeProfile}" profile? This cannot be undone.`,
        okLabel: 'Delete',
        okClass: 'button-danger'
    });
    if (confirmed) {
        const keysToRemove = Object.keys(DEFAULT_PROMPTS).map(k => `${PROFILE_KEY_PREFIX}${activeProfile}_${k}`);
        keysToRemove.push(`${PROFILE_KEY_PREFIX}${activeProfile}_rephraseLanguages`);
        
        const newProfileList = profileList.filter(p => p !== activeProfile);
        await StorageManager.set({
            profileList: newProfileList,
            activeProfile: 'Default'
        });
        await StorageManager.remove(keysToRemove);
        await initializePromptManager();
        UIModule.showToast('Success', `Profile "${activeProfile}" has been deleted.`, 'success');
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
    ELS.newProfileBtn.addEventListener('click', handleNewProfile);
    ELS.renameProfileBtn.addEventListener('click', handleRenameProfile);
    ELS.deleteProfileBtn.addEventListener('click', handleDeleteProfile);
    ELS.promptResetButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const key = e.currentTarget.dataset.promptKey;
            if (key && PROMPT_TEXTAREAS[key] && DEFAULT_PROMPTS[key]) {
                PROMPT_TEXTAREAS[key].value = DEFAULT_PROMPTS[key];
                UIModule.showToast('Prompt Reset', `The "${key}" prompt has been reset to its default.`, 'info');
            }
        });
    });

    MODAL_ELS.addNewButton.addEventListener('click', () => openActionModal());
    MODAL_ELS.cancelButton.addEventListener('click', closeActionModal);
    MODAL_ELS.modal.addEventListener('click', (e) => {
      if (e.target === MODAL_ELS.modal) closeActionModal();
    });
    MODAL_ELS.form.addEventListener('submit', saveCustomAction);

    // **NEW**: Bind the permission toggle handler
    fullAccessToggle.addEventListener('change', handlePermissionToggle);
  }
  
  async function initialize(elements, prompts, temps, rephraseInput) {
    ELS = elements;
    PROMPT_TEXTAREAS = prompts;
    PROMPT_TEMP_SLIDERS = temps;
    REPHRASE_LANGUAGES_INPUT = rephraseInput;
    
    await loadGeneralSettings();
    await initializePromptManager();
    await initializePermissions(); // **NEW**: Initialize permission state on load
    bindEventListeners();
  }

  return {
    initialize,
  };
})();