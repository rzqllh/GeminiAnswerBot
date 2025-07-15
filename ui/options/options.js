// This script doesn't need to import prompts anymore,
// since the background script is the single source of truth for them.
// We will define them locally just for the placeholder text.

const DEFAULT_PROMPTS = {
    cleaning: `You are a text cleaner. Your only job is to analyze the following messy text from a webpage and extract the main quiz content...`,
    answer: `Act as an expert quiz solver. Based on the following cleaned text, your tasks are...`,
    explanation: `Act as an expert tutor. For the following quiz content, provide a clear, step-by-step explanation...`
};

document.addEventListener('DOMContentLoaded', function() {
  const saveButton = document.getElementById('saveButton');
  const testButton = document.getElementById('testButton');
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('modelSelect');
  const explanationToneSelect = document.getElementById('explanationToneSelect');
  const statusDiv = document.getElementById('status');
  const temperatureSlider = document.getElementById('temperatureSlider');
  const temperatureValueSpan = document.getElementById('temperatureValue');
  const cleaningPromptTextarea = document.getElementById('cleaningPrompt');
  const answerPromptTextarea = document.getElementById('answerPrompt');
  const explanationPromptTextarea = document.getElementById('explanationPrompt');

  function showStatus(message, type = 'normal') {
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

  async function loadSettings() {
    const result = await chrome.storage.sync.get([
      'geminiApiKey', 
      'selectedModel', 
      'explanationTone',
      'customPrompts',
      'temperature'
    ]);
    
    apiKeyInput.value = result.geminiApiKey || '';
    modelSelect.value = result.selectedModel || 'gemini-1.5-flash-latest';
    explanationToneSelect.value = result.explanationTone || 'normal';
    
    const temperature = result.temperature !== undefined ? result.temperature : 0.4;
    temperatureSlider.value = temperature;
    temperatureValueSpan.textContent = parseFloat(temperature).toFixed(1);

    cleaningPromptTextarea.placeholder = DEFAULT_PROMPTS.cleaning;
    answerPromptTextarea.placeholder = DEFAULT_PROMPTS.answer;
    explanationPromptTextarea.placeholder = DEFAULT_PROMPTS.explanation;

    const prompts = result.customPrompts || {};
    cleaningPromptTextarea.value = prompts.cleaning || '';
    answerPromptTextarea.value = prompts.answer || '';
    explanationPromptTextarea.value = prompts.explanation || '';
  }

  function saveSettings() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showStatus('API key field cannot be empty.', 'error');
      return;
    }

    const settings = {
      'geminiApiKey': apiKey,
      'selectedModel': modelSelect.value,
      'explanationTone': explanationToneSelect.value,
      'temperature': parseFloat(temperatureSlider.value),
      'customPrompts': {
        cleaning: cleaningPromptTextarea.value.trim(),
        answer: answerPromptTextarea.value.trim(),
        explanation: explanationPromptTextarea.value.trim()
      }
    };

    chrome.storage.sync.set(settings, () => {
      showStatus('Settings saved successfully!', 'success');
    });
  }

  temperatureSlider.addEventListener('input', () => {
    temperatureValueSpan.textContent = parseFloat(temperatureSlider.value).toFixed(1);
  });
  
  saveButton.addEventListener('click', saveSettings);
  
  loadSettings();
});