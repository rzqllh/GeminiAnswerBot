// === Hafizh Signature Code ===
// Author: Hafizh Rizqullah — GeminiAnswerBot
// File: js/prompts.js

const DEFAULT_PROMPTS = {
  cleaning: `Extract quiz content. Format with each option on a new line using backticks for code/tags:

**Question:** [question text]

**Options:**
A. \`[option text]\`
B. \`[option text]\`
C. \`[option text]\`
D. \`[option text]\`

Rules:
- Put each option on its own line
- Wrap code/HTML tags in backticks
- Keep original wording`,

  answer: `Answer the quiz. Format exactly like this:

**Answer:** \`[answer text]\` (Option [Letter])

**Confidence:** High/Medium/Low

**Reason:** [1 sentence explanation]

Rules:
- Wrap the answer in backticks if it's code/tags
- Include FULL answer text, not just letter
- Be honest about confidence`,

  quiz_explanation: `Explain how to get this answer:

1. What the question asks
2. Why this is correct
3. Why each wrong option is wrong

Be brief, friendly, encouraging.`,

  summarize: `Summarize in bullet points.`,
  explanation: `Explain simply for beginners.`,
  translate: `Translate to English.`,
  rephrase: `Rephrase while keeping meaning.`,
  pageAnalysis: `Summarize: topic, key points.`,

  verification: `Verify the answer:
**Result:** ✓ Confirmed / ⚠ Uncertain / ✗ Wrong
**Note:** [brief reason]`,

  'image-quiz': `Extract from image:
**Question:** [text]
**Options:**
A. \`[option]\`
B. \`[option]\`
C. \`[option]\`
D. \`[option]\``,

  'image-analyze': `Describe the image.`,
  'image-translate': `Translate text in image to English.`
};

if (typeof globalThis !== 'undefined') globalThis.DEFAULT_PROMPTS = DEFAULT_PROMPTS;
else if (typeof window !== 'undefined') window.DEFAULT_PROMPTS = DEFAULT_PROMPTS;
else if (typeof self !== 'undefined') self.DEFAULT_PROMPTS = DEFAULT_PROMPTS;