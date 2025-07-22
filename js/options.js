// js/options.js

document.addEventListener('DOMContentLoaded', function() {
  // --- DOM Elements ---
  const saveButton = document.getElementById('saveButton');
  const testButton = document.getElementById('testButton');
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('modelSelect');
  const responseToneSelect = document.getElementById('responseToneSelect'); 
  const statusDiv = document.getElementById('status');
  const autoHighlightToggle = document.getElementById('autoHighlightToggle');
  const temperatureSlider = document.getElementById('temperatureSlider');
  const temperatureValueSpan = document.getElementById('temperatureValue');
  const cleaningPromptTextarea = document.getElementById('cleaningPrompt');
  const answerPromptTextarea = document.getElementById('answerPrompt');
  const explanationPromptTextarea = document.getElementById('explanationPrompt');
  const summarizePromptTextarea = document.getElementById('summarizePrompt');
  const translatePromptTextarea = document.getElementById('translatePrompt');
  const rephrasePromptTextarea = document.getElementById('rephrasePrompt');
  const rephraseLanguagesInput = document.getElementById('rephraseLanguages');


  // --- Load all saved settings ---
  // Note: DEFAULT_PROMPTS is now loaded from prompts.js
  chrome.storage.sync.get([
    'geminiApiKey', 
    'selectedModel', 
    'responseTone', 
    'autoHighlight', 
    'customPrompts',
    'temperature',
    'rephraseLanguages'
  ], function(result) {
    apiKeyInput.value = result.geminiApiKey || '';
    modelSelect.value = result.selectedModel || 'gemini-1.5-flash-latest';
    responseToneSelect.value = result.responseTone || 'normal'; 
    autoHighlightToggle.checked = result.autoHighlight || false;
    rephraseLanguagesInput.value = result.rephraseLanguages || 'English, Indonesian';
    
    const temperature = result.temperature !== undefined ? result.temperature : 0.4;
    temperatureSlider.value = temperature;
    temperatureValueSpan.textContent = parseFloat(temperature).toFixed(1);

    // Set placeholders with default prompts from the global DEFAULT_PROMPTS object
    cleaningPromptTextarea.placeholder = DEFAULT_PROMPTS.cleaning;
    answerPromptTextarea.placeholder = DEFAULT_PROMPTS.answer;
    explanationPromptTextarea.placeholder = DEFAULT_PROMPTS.explanation;
    summarizePromptTextarea.placeholder = DEFAULT_PROMPTS.summarize; 
    translatePromptTextarea.placeholder = DEFAULT_PROMPTS.translate;
    rephrasePromptTextarea.placeholder = DEFAULT_PROMPTS.rephrase;

    // Set saved values if they exist
    const prompts = result.customPrompts || {};
    cleaningPromptTextarea.value = prompts.cleaning || '';
    answerPromptTextarea.value = prompts.answer || '';
    explanationPromptTextarea.value = prompts.explanation || '';
    summarizePromptTextarea.value = prompts.summarize || ''; 
    translatePromptTextarea.value = prompts.translate || '';
    rephrasePromptTextarea.value = prompts.rephrase || '';
  });

  // --- Event listener for Temperature Slider ---
  temperatureSlider.addEventListener('input', function() {
    temperatureValueSpan.textContent = parseFloat(this.value).toFixed(1);
  });

  // --- Event listener for Save button ---
  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    const selectedModel = modelSelect.value;
    const responseTone = responseToneSelect.value; 
    const autoHighlight = autoHighlightToggle.checked;
    const temperature = parseFloat(temperatureSlider.value);
    const rephraseLanguages = rephraseLanguagesInput.value.trim();
    const customPrompts = {
      cleaning: cleaningPromptTextarea.value.trim(),
      answer: answerPromptTextarea.value.trim(),
      explanation: explanationPromptTextarea.value.trim(),
      summarize: summarizePromptTextarea.value.trim(), 
      translate: translatePromptTextarea.value.trim(),
      rephrase: rephrasePromptTextarea.value.trim()
    };
    
    if (apiKey) {
      chrome.storage.sync.set({ 
        'geminiApiKey': apiKey,
        'selectedModel': selectedModel,
        'responseTone': responseTone, 
        'autoHighlight': autoHighlight,
        'temperature': temperature,
        'customPrompts': customPrompts,
        'rephraseLanguages': rephraseLanguages
      }, function() {
        showStatus('Settings saved successfully!', 'success');
      });
    } else {
      showStatus('API key field cannot be empty.', 'error');
    }
  });

  // --- Event listener for Test Connection button ---
  testButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showStatus('Please enter an API key to test.', 'error');
      return;
    }

    showStatus('Testing connection...', 'normal');
    testButton.disabled = true;

    chrome.runtime.sendMessage(
      { action: 'testApiConnection', payload: { apiKey } },
      (response) => {
        if (chrome.runtime.lastError) {
          showStatus(`Error: ${chrome.runtime.lastError.message}`, 'error');
          testButton.disabled = false;
          return;
        }
        
        if (response && response.success) {
          showStatus(response.text, 'success');
        } else {
          const errorMessage = response.error || 'An unknown error occurred.';
          showStatus(errorMessage, 'error');
        }
        testButton.disabled = false;
      }
    );
  });

  // --- Utility function ---
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type; 
    
    if (type !== 'error') {
        setTimeout(() => {
            if (statusDiv.textContent === message) {
                statusDiv.textContent = '';
                statusDiv.className = '';
            }
        }, 4000);
    }
  }
});