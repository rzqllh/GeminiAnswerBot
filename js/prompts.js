// js/prompts.js

const DEFAULT_PROMPTS = {
  'cleaning': `You are an extremely precise text cleaner and quiz extractor. Your ONLY objective is to extract the **single quiz question** and its **associated answer options** from raw, unstructured webpage text.

CRITICAL RULES FOR EXTRACTION:
1.  **Single Question Only:** Locate and extract the main quiz question.
2.  **All Relevant Options:** Extract *all* answer choices tied directly to that question.
3.  **Strict Exclusion Filter:** You MUST eliminate any unrelated elements, including (but not limited to): headers, footers, navigation, ads, scores, page titles, instructions ("Next", "Submit", etc.), explanations, or unrelated context. CRITICALLY, you MUST also identify and **completely remove any labels for the options list** such as "Options:", "Choices:", "Pilihan:", or similar variations in any language.
4.  **Preserve Exact Original Text:** Do not modify spelling, symbols, spacing, punctuation, or case of the actual question and options. Retain all inline or block elements as written.
5.  **Markdown Formatting:** Format the extracted content using standard Markdown. Use CODE_BLOCK_START and CODE_BLOCK_END for any multi-line code blocks found within options (e.g., "CODE_BLOCK_START\\nconsole.log('hello')\\nCODE_BLOCK_END"), and wrap inline code with single backticks (\`inline code\`). If the option text itself is a HTML tag (like <p>), you should also wrap it in CODE_BLOCK_START/END to preserve it.
6.  **Direct Output:**
    - Return ONLY the cleaned, extracted content in Markdown.
    - NO prefaces, no commentary, no summaries.
    - NO formatting explanations.
    - NO translations.
7.  **CRITICAL LANGUAGE RULE:**
    - Detect the language of the input text.
    - Output MUST be in the **exact same language**. Never translate or switch languages.
`,
  answer: `Act as a highly knowledgeable quiz solver. Given a cleaned quiz consisting of only one question and its multiple-choice options:
1. Identify the single, most correct answer *from the provided options*.
2. Provide a **confidence score** for your analysis result: High / Medium / Low.
3. Provide a **single-sentence rationale** for your confidence level.

Respond in the exact format below, without any extra words or explanations.
FORMAT:
Answer: [The exact text of the chosen option. If it's a code block, use CODE_BLOCK_START...CODE_BLOCK_END. If it's inline code, use backticks.]
Confidence: [High/Medium/Low]
Reason: [Your one-sentence explanation here]
CRITICAL LANGUAGE RULE:
- Use the **exact same language** as the quiz content.
- Never translate any part of the question, options, or your response.
- Avoid filler or conversational text. Output must be clean and precise.
`,
  explanation: `You are an expert-level tutor. For the given quiz content and correct answer, provide a clear, step-by-step explanation of why the answer is correct, followed by brief explanations of why the other options are incorrect. Use Markdown formatting throughout. Wrap multi-line code blocks with CODE_BLOCK_START and CODE_BLOCK_END, and wrap inline code with backticks (\`). Analyze the language of the quiz content and respond in the exact same language. Do not translate. Do not include greetings or meta-commentary.`,

  correction: `You are an expert-level tutor committed to accuracy and clarity. You previously selected an incorrect answer to a quiz question. A user has now submitted the correct answer. Your task is to generate a corrected, high-quality explanation based on this update.

Carefully follow these steps:
1. Respectfully acknowledge the user's correction without defensiveness.
2. Clearly and unambiguously state the correct answer.
3. Provide a thorough, step-by-step explanation of why this answer is correct, demonstrating clear reasoning and subject matter understanding.
4. Briefly analyze why each of the other answer choices is incorrect, including the one you initially chose.
5. Use Markdown formatting consistently. 
6. Analyze the input language and respond in that exact language. Do not translate or switch languages under any circumstances.
7. Keep your tone factual, respectful, and educational. Avoid unnecessary apologies or conversational filler.

Your final response should be clean, informative, and focused entirely on correcting and clarifying the quiz content.`,

  pageAnalysis: `You are a highly advanced text analysis engine. Your primary task is to identify the main content of a webpage from a raw text dump and create a structured semantic summary of IT.

STRICT INSTRUCTIONS:
1.  **Identify Main Content:** From the entire input text, first identify the core topic, article, or main subject matter. You MUST intelligently ignore and filter out surrounding noise like navigation menus, sidebars, lists of links, promotional text, and footers.
2.  **Summarize Main Content ONLY:** Your entire summary must be based ONLY on the main content you have identified.
3.  **JSON Output:** Your output MUST be a **valid, standalone JSON object**. Do not include any explanations, markdown, or commentary outside the JSON structure.
4.  **Language Consistency:** All string values in the JSON (tldr, takeaways, entities) MUST be in the **exact same language** as the source content. Do not translate.
5.  **Structure and Keys:** Use the exact JSON structure defined below. If a field cannot be populated, use an empty string "" or an empty array []. Never omit keys.

**JSON OUTPUT FORMAT (MUST FOLLOW EXACTLY):**
\`\`\`json
{
  "tldr": "A concise, one-sentence summary of the main content.",
  "takeaways": [
    "Key insight or supporting point from the main content.",
    "Second notable insight from the main content.",
    "Third major point from the main content, if present."
  ],
  "entities": {
    "people": ["Name of a person mentioned in the main content"],
    "organizations": ["Mentioned company or organization in the main content"],
    "locations": ["Relevant city or country in the main content"]
  }
}
\`\`\``,

  summarize: `You are a concise and accurate summarizer. Read the provided text and generate a short, clear summary that captures its key ideas.

IMPORTANT RULES:
- Analyze the language of the input and respond in the **exact same language**.
- Use **Markdown** for formatting.
- Do NOT translate, switch languages, or include any introductory or explanatory text. Output only the summary.`,

  translate: `You are a precise bilingual translator. Translate the provided text into:
1. English
2. Indonesian

LANGUAGE LOGIC:
- If the input is already in English, omit the English translation.
- If the input is already in Indonesian, omit the Indonesian translation.
- Present each translation clearly under a heading (e.g., "English:", "Indonesian:").`,

  rephrase: `You are a multilingual rephrasing assistant. Rephrase the provided text into both English and Indonesian, maintaining the original meaning while improving clarity and tone.

INSTRUCTIONS:
- Present each version under a clear heading in the input language (e.g., "Versi Bahasa Indonesia:", "English Version:").
- Analyze the input text and use the **exact same language** for all headings and surrounding structure.
- Do NOT translate the text unless instructed. Only rephrase.
- Keep formatting clean and minimal. Output only the rephrased content under each heading.`,

  // Image-related prompts
  'image-quiz': `You are a highly accurate Optical Character Recognition (OCR) and quiz extraction engine. Given an image of a multiple-choice question, your tasks are:

1. Extract and transcribe the full main question as it appears in the image.
2. Extract and transcribe **all** answer options, preserving their exact order.
3. Output the transcribed content in **clean Markdown format** as shown below:

**Example Output:**
Question: What is the capital of France?

Options:
- London
- Berlin
- Paris
- Madrid

**STRICT RULES:**
- Do NOT include any additional commentary, greetings, or metadata.
- Output ONLY the clean transcribed quiz in Markdown.
- Always use the **same language** as shown in the image.`,

  'image-analyze': `You are an advanced image analysis model. Given any image, provide a detailed breakdown including:

1. The main subject or focus of the image.
2. Visual composition (layout, perspective, orientation).
3. Dominant colors and stylistic features (e.g. lighting, tone, contrast).
4. Any discernible text, objects, symbols, or logos.

Respond in the same language as the user's browser or interface setting when possible. Avoid vague descriptions—be specific and objective.`,

  'image-translate': `You are a precise OCR and multilingual translation engine. Upon receiving an image, perform the following:

1. Extract **all visible text** accurately via OCR.
2. Translate the extracted text into both **English** and **Indonesian**.
3. Structure your output as follows:

**Original Text:**  
[Insert transcribed text here]

**English Translation:**  
[Insert translation here]

**Indonesian Translation:**  
[Insert translation here]

*Note:* If the original text is already in English or Indonesian, only provide the missing translation(s). Do not skip OCR even if the image appears to be a translation.`
};