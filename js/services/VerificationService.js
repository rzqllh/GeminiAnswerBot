// === Hafizh Rizqullah | GeminiAnswerBot ===
// 📄 js/services/VerificationService.js
// 🕓 v5.0 - Answer Verification feature

const VerificationService = (() => {
    const VERIFICATION_PROMPT = `You are a fact-checker. I need you to independently verify an answer.

Question: {question}
Given Answer: {answer}
Context/Options: {context}

Please verify this answer by:
1. Analyzing the question independently
2. Determining if the given answer is correct
3. If incorrect, provide the correct answer

Respond in this exact format:
**Verification:** [✓ Confirmed / ⚠ Uncertain / ✗ Wrong]
**Assessment:** [Brief explanation of your verification]
**Correct Answer:** [Only if the given answer is wrong, otherwise say "N/A"]
**Confidence:** [Your confidence in this verification: High/Medium/Low]`;

    // Verify an answer
    async function verifyAnswer(question, answer, context = '') {
        const prompt = VERIFICATION_PROMPT
            .replace('{question}', question)
            .replace('{answer}', answer)
            .replace('{context}', context);

        try {
            // Use GeminiService to call API
            const response = await callGeminiForVerification(prompt);
            return parseVerificationResponse(response);
        } catch (error) {
            console.error('Verification failed:', error);
            return {
                status: 'error',
                statusIcon: '❌',
                assessment: 'Verification failed: ' + error.message,
                correctAnswer: null,
                confidence: 'N/A'
            };
        }
    }

    // Call Gemini API for verification (non-streaming)
    async function callGeminiForVerification(prompt) {
        const settings = await StorageManager.get(['apiKey', 'modelSettings']);
        const apiKey = settings.apiKey;
        const model = settings.modelSettings?.model || 'gemini-2.0-flash';

        if (!apiKey) {
            throw new Error('API key not configured');
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3 } // Lower temperature for more consistent verification
                })
            }
        );

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // Parse verification response
    function parseVerificationResponse(text) {
        const result = {
            status: 'uncertain',
            statusIcon: '⚠',
            assessment: 'Could not parse verification result.',
            correctAnswer: null,
            confidence: 'N/A',
            raw: text
        };

        // Parse status
        const statusMatch = text.match(/\*?\*?Verification:?\*?\*?\s*(✓|✗|⚠|Confirmed|Wrong|Uncertain)/i);
        if (statusMatch) {
            const s = statusMatch[1].toLowerCase();
            if (s.includes('✓') || s.includes('confirmed')) {
                result.status = 'confirmed';
                result.statusIcon = '✓';
            } else if (s.includes('✗') || s.includes('wrong')) {
                result.status = 'wrong';
                result.statusIcon = '✗';
            } else {
                result.status = 'uncertain';
                result.statusIcon = '⚠';
            }
        }

        // Parse assessment
        const assessmentMatch = text.match(/\*?\*?Assessment:?\*?\*?\s*([\s\S]*?)(?=\n\*\*|$)/i);
        if (assessmentMatch) {
            result.assessment = assessmentMatch[1].trim();
        }

        // Parse correct answer (only if wrong)
        const correctMatch = text.match(/\*?\*?Correct Answer:?\*?\*?\s*([\s\S]*?)(?=\n\*\*|$)/i);
        if (correctMatch && !correctMatch[1].toLowerCase().includes('n/a')) {
            result.correctAnswer = correctMatch[1].trim();
        }

        // Parse confidence
        const confMatch = text.match(/\*?\*?Confidence:?\*?\*?\s*(High|Medium|Low)/i);
        if (confMatch) {
            result.confidence = confMatch[1];
        }

        return result;
    }

    // Get status class for styling
    function getStatusClass(status) {
        switch (status) {
            case 'confirmed': return 'verification-confirmed';
            case 'wrong': return 'verification-wrong';
            case 'uncertain': return 'verification-uncertain';
            default: return 'verification-unknown';
        }
    }

    // Get status label
    function getStatusLabel(status) {
        switch (status) {
            case 'confirmed': return 'Verified ✓';
            case 'wrong': return 'Incorrect ✗';
            case 'uncertain': return 'Uncertain ⚠';
            default: return 'Unknown';
        }
    }

    // Render verification result
    function renderVerificationResult(result) {
        const statusClass = getStatusClass(result.status);

        return `
      <div class="verification-result ${statusClass}">
        <div class="verification-header">
          <span class="verification-icon">${result.statusIcon}</span>
          <span class="verification-status">${getStatusLabel(result.status)}</span>
        </div>
        <div class="verification-body">
          <p class="verification-assessment">${_escapeHtml(result.assessment)}</p>
          ${result.correctAnswer ? `
            <div class="verification-correction">
              <strong>Correct Answer:</strong> ${_escapeHtml(result.correctAnswer)}
            </div>
          ` : ''}
          <span class="verification-confidence">Verification confidence: ${result.confidence}</span>
        </div>
      </div>
    `;
    }

    // Quick verify (returns just status)
    async function quickVerify(question, answer) {
        const result = await verifyAnswer(question, answer);
        return {
            isCorrect: result.status === 'confirmed',
            status: result.status,
            icon: result.statusIcon
        };
    }

    return {
        verifyAnswer,
        quickVerify,
        parseVerificationResponse,
        getStatusClass,
        getStatusLabel,
        renderVerificationResult
    };
})();
