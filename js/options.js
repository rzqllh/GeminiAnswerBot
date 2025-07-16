document.addEventListener('DOMContentLoaded', function() {
  // --- DEFAULT PROMPTS to be used as placeholders ---
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
    explanation: `Act as an expert tutor. For the following quiz content, provide a clear, step-by-step explanation for why the provided answer is correct and why the other options are incorrect. IMPORTANT: Analyze the language of the provided text. Respond in the *exact same language* as the input text, and use Markdown for formatting.`, // PROMPT BAHASA DITINGKATKAN
    summarize: `Summarize the following text concisely. IMPORTANT: Analyze the language of the provided text. Respond in the *exact same language* as the input text, and use Markdown for formatting:`, // PROMPT BAHASA DITINGKATKAN
    translate: `Translate the following text into 
    1. English
    2. Indonesian
    
    Importnant: if the default language is english, no need to translate to english. vice versa:`, // Default for translate (tetap sesuai instruksi sebelumnya)
    define: `Provide a clear and concise definition for the following term or concept found in the text. IMPORTANT: Analyze the language of the provided text. Respond in the *exact same language* as the input text, and use Markdown for formatting:`, // PROMPT BAHASA DITINGKATKAN
  };

  // --- DOM Elements ---
  const saveButton = document.getElementById('saveButton');
  const testButton = document.getElementById('testButton');
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('modelSelect');
  const responseToneSelect = document.getElementById('responseToneSelect'); // Diubah namanya
  const statusDiv = document.getElementById('status');
  const autoHighlightToggle = document.getElementById('autoHighlightToggle');
  const temperatureSlider = document.getElementById('temperatureSlider');
  const temperatureValueSpan = document.getElementById('temperatureValue');
  const cleaningPromptTextarea = document.getElementById('cleaningPrompt');
  const answerPromptTextarea = document.getElementById('answerPrompt');
  const explanationPromptTextarea = document.getElementById('explanationPrompt');
  // New prompt textareas for context menu actions
  const summarizePromptTextarea = document.getElementById('summarizePrompt');
  const translatePromptTextarea = document.getElementById('translatePrompt');
  const definePromptTextarea = document.getElementById('definePrompt');


  // --- Load all saved settings ---
  chrome.storage.sync.get([
    'geminiApiKey', 
    'selectedModel', 
    'responseTone', // Diubah namanya
    'autoHighlight', 
    'customPrompts',
    'temperature'
  ], function(result) {
    apiKeyInput.value = result.geminiApiKey || '';
    modelSelect.value = result.selectedModel || 'gemini-1.5-flash-latest';
    responseToneSelect.value = result.responseTone || 'normal'; // Diubah namanya
    autoHighlightToggle.checked = result.autoHighlight || false;
    
    const temperature = result.temperature !== undefined ? result.temperature : 0.4;
    temperatureSlider.value = temperature;
    temperatureValueSpan.textContent = parseFloat(temperature).toFixed(1);

    // Set placeholders with default prompts
    cleaningPromptTextarea.placeholder = DEFAULT_PROMPTS.cleaning;
    answerPromptTextarea.placeholder = DEFAULT_PROMPTS.answer;
    explanationPromptTextarea.placeholder = DEFAULT_PROMPTS.explanation;
    summarizePromptTextarea.placeholder = DEFAULT_PROMPTS.summarize; // Placeholder for new prompts
    translatePromptTextarea.placeholder = DEFAULT_PROMPTS.translate;
    definePromptTextarea.placeholder = DEFAULT_PROMPTS.define;

    // Set saved values if they exist
    const prompts = result.customPrompts || {};
    cleaningPromptTextarea.value = prompts.cleaning || '';
    answerPromptTextarea.value = prompts.answer || '';
    explanationPromptTextarea.value = prompts.explanation || '';
    summarizePromptTextarea.value = prompts.summarize || ''; // Load custom context prompts
    translatePromptTextarea.value = prompts.translate || '';
    definePromptTextarea.value = prompts.define || '';
  });

  // --- Event listener for Temperature Slider ---
  temperatureSlider.addEventListener('input', function() {
    temperatureValueSpan.textContent = parseFloat(this.value).toFixed(1);
  });

  // --- Event listener for Save button ---
  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    const selectedModel = modelSelect.value;
    const responseTone = responseToneSelect.value; // Diubah namanya
    const autoHighlight = autoHighlightToggle.checked;
    const temperature = parseFloat(temperatureSlider.value);
    const customPrompts = {
      cleaning: cleaningPromptTextarea.value.trim(),
      answer: answerPromptTextarea.value.trim(),
      explanation: explanationPromptTextarea.value.trim(),
      summarize: summarizePromptTextarea.value.trim(), // Save new custom prompts
      translate: translatePromptTextarea.value.trim(),
      define: definePromptTextarea.value.trim()
    };
    
    if (apiKey) {
      chrome.storage.sync.set({ 
        'geminiApiKey': apiKey,
        'selectedModel': selectedModel,
        'responseTone': responseTone, // Diubah namanya
        'autoHighlight': autoHighlight,
        'temperature': temperature,
        'customPrompts': customPrompts
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