document.addEventListener('DOMContentLoaded', function() {
  // --- DEFAULT PROMPTS to be used as placeholders ---
  const DEFAULT_PROMPTS = {
    cleaning: `You are an extremely meticulous text cleaner and quiz content extractor. Your SOLE purpose is to identify and extract ONLY the quiz question and its exact provided options from the raw, potentially noisy webpage text provided.

CRITICAL RULES FOR EXTRACTION:
1.  **Identify The Single Question:** Locate the main quiz question.
2.  **Identify All Options:** Locate *all* the multiple-choice or selection options directly associated with that question.
3.  **Strict Exclusion:** ABSOLUTELY filter out and remove *all other text and elements*. This includes, but is not limited to: menus, sidebars, headers, footers, advertisements, navigation links, contextual instructions not part of the question itself (e.g., "Next", "Previous", "Submit"), scores, category names, general page content unrelated to the specific quiz question and its options.
4.  **Preserve Original Formatting:** Maintain the exact wording, spelling, and any special characters or code snippets within the question and options.
5.  **Markdown Formatting:** Format the extracted content using standard Markdown. Use CODE_BLOCK_START and CODE_BLOCK_END for any multi-line code blocks found within options (e.g., "CODE_BLOCK_START\\nconsole.log('hello')\\nCODE_BLOCK_END"), and wrap inline code with single backticks (\`inline code\`). Use list items for options (e.g., "- Option A"). If the option text itself is a HTML tag (like <p>), you should also wrap it in CODE_BLOCK_START/END to preserve it.
6.  **Direct Output:** Return ONLY the cleaned Markdown text. Do NOT add any introductory phrases, summaries, explanations, or conversational text. Your output must be purely the extracted question and its options.
7.  **CRITICAL LANGUAGE RULE**: Analyze the language of the provided raw webpage text. You MUST respond in the EXACT SAME LANGUAGE as the input text. Do NOT translate any part of the quiz content or your response.
`, 
    answer: `Act as an expert quiz solver. Based on the following cleaned quiz text (containing only the question and its options), your tasks are:
1. Identify the single, most correct answer *from the provided options*.
2. Provide a confidence score (High, Medium, or Low).
3. Provide a brief, one-sentence reason for your confidence level.

Respond in the exact format below, without any extra words or explanations.
FORMAT:
Answer: [The exact text of the chosen option. If it's a multi-line code block, output it as CODE_BLOCK_START...CODE_BLOCK_END. If it's inline code, output it as \`inline code\`.]
Confidence: [High/Medium/Low]
Reason: [Your one-sentence reason here]
CRITICAL LANGUAGE RULE: Respond in the EXACT SAME LANGUAGE as the quiz content you processed. Do NOT translate.
`, 
    explanation: `Act as an expert tutor. For the following quiz content, provide a clear, step-by-step explanation for why the provided answer is correct and why the other options are incorrect. IMPORTANT: Analyze the language of the provided text. Respond in the *exact same language* as the input text, and use Markdown for formatting. CODE_BLOCK_START and CODE_BLOCK_END denote multi-line code blocks. Single backticks (\`) denote inline code. CRITICAL LANGUAGE RULE: Respond in the EXACT SAME LANGUAGE as the quiz content you processed. Do NOT translate.`, 
    summarize: `Summarize the following text concisely. IMPORTANT: Analyze the language of the provided text. Respond in the *exact same language* as the input text, and use Markdown for formatting: CRITICAL LANGUAGE RULE: Respond in the EXACT SAME LANGUAGE as the input text. Do NOT translate.`, 
    translate: `Translate the following text into 
    1. English
    2. Indonesian
    
    Importnant: if the default language is english, no need to translate to english. vice versa:`, 
    define: `Provide a clear and concise definition for the following term or concept found in the text. IMPORTANT: Analyze the language of the provided text. Respond in the *exact same language* as the input text, and use Markdown for formatting: CRITICAL LANGUAGE RULE: Respond in the EXACT SAME LANGUAGE as the input text. Do NOT translate.`, 
  };

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
  const definePromptTextarea = document.getElementById('definePrompt');


  // --- Load all saved settings ---
  chrome.storage.sync.get([
    'geminiApiKey', 
    'selectedModel', 
    'responseTone', 
    'autoHighlight', 
    'customPrompts',
    'temperature'
  ], function(result) {
    apiKeyInput.value = result.geminiApiKey || '';
    modelSelect.value = result.selectedModel || 'gemini-1.5-flash-latest';
    responseToneSelect.value = result.responseTone || 'normal'; 
    autoHighlightToggle.checked = result.autoHighlight || false;
    
    const temperature = result.temperature !== undefined ? temperature : 0.4;
    temperatureSlider.value = temperature;
    temperatureValueSpan.textContent = parseFloat(temperature).toFixed(1);

    // Set placeholders with default prompts
    cleaningPromptTextarea.placeholder = DEFAULT_PROMPTS.cleaning;
    answerPromptTextarea.placeholder = DEFAULT_PROMPTS.answer;
    explanationPromptTextarea.placeholder = DEFAULT_PROMPTS.explanation;
    summarizePromptTextarea.placeholder = DEFAULT_PROMPTS.summarize; 
    translatePromptTextarea.placeholder = DEFAULT_PROMPTS.translate;
    definePromptTextarea.placeholder = DEFAULT_PROMPTS.define;

    // Set saved values if they exist
    const prompts = result.customPrompts || {};
    cleaningPromptTextarea.value = prompts.cleaning || '';
    answerPromptTextarea.value = prompts.answer || '';
    explanationPromptTextarea.value = prompts.explanation || '';
    summarizePromptTextarea.value = prompts.summarize || ''; 
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
    const responseTone = responseToneSelect.value; 
    const autoHighlight = autoHighlightToggle.checked;
    const temperature = parseFloat(temperatureSlider.value);
    const customPrompts = {
      cleaning: cleaningPromptTextarea.value.trim(),
      answer: answerPromptTextarea.value.trim(),
      explanation: explanationPromptTextarea.value.trim(),
      summarize: summarizePromptTextarea.value.trim(), 
      translate: translatePromptTextarea.value.trim(),
      define: definePromptTextarea.value.trim()
    };
    
    if (apiKey) {
      chrome.storage.sync.set({ 
        'geminiApiKey': apiKey,
        'selectedModel': selectedModel,
        'responseTone': responseTone, 
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