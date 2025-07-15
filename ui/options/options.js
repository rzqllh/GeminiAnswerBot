document.addEventListener('DOMContentLoaded', function() {
  // Define default prompts locally to serve as placeholders
  const DEFAULT_PROMPTS = {
    cleaning: `You are a text cleaner. Your only job is to analyze the following messy text from a webpage and extract the main quiz content. 
RULES: 
1. Remove all irrelevant text (menus, sidebars, footers, ads, navigation links, etc.). 
2. Preserve the original formatting of the question, options, and especially code blocks. 
3. Format all content using standard Markdown (e.g., use triple backticks for code). 
4. Directly return only the cleaned Markdown text. Do not add any introductory phrases like "Here is the cleaned text:".`,
    answer: `Act as an expert quiz solver. Based on the following cleaned text, your tasks are:
1.  Provide the single, most correct answer for the question(s).
2.  Provide a confidence score (High, Medium, or Low).
3.  Provide a brief, one-sentence reason for your confidence level.

Respond in the exact format below, without any extra words or explanations.
FORMAT:
Answer: [Your Answer Here]
Confidence: [High/Medium/Low]
Reason: [Your one-sentence reason here]`,
    explanation: `Act as an expert tutor. For the following quiz content, provide a clear, step-by-step explanation for why the provided answer is correct and why the other options are incorrect. IMPORTANT: Respond in the same language as the question and use Markdown for formatting.`
  };

  // --- DOM Elements ---
  const saveButton = document.getElementById('saveButton');
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

    // Set full placeholders
    cleaningPromptTextarea.placeholder = DEFAULT_PROMPTS.cleaning;
    answerPromptTextarea.placeholder = DEFAULT_PROMPTS.answer;
    explanationPromptTextarea.placeholder = DEFAULT_PROMPTS.explanation;

    // Set saved custom values if they exist
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