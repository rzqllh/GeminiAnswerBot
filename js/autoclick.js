// === GeminiAnswerBot v4.0: AutoClick Module ===
// Author: Hafizh Rizqullah
// Purpose: Automatically clicks the correct answer on the page

(function () {
    'use strict';

    // Skip if already loaded
    if (window.AutoClickModule) return;

    window.AutoClickModule = {
        lastClickedElement: null,

        /**
         * Find and click the answer option that matches the given text
         * @param {string} answerText - The answer text to find and click
         * @returns {Object} - Result with success status and message
         */
        clickAnswer(answerText) {
            if (!answerText || typeof answerText !== 'string') {
                return { success: false, message: 'Invalid answer text provided' };
            }

            console.log('[AutoClick] Looking for:', answerText);

            const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
            let bestMatch = null;
            let bestScore = 0;

            for (const input of inputs) {
                if (!this._isVisible(input)) continue;

                const labelText = this._getLabelText(input);
                if (!labelText) continue;

                const score = this._matchScore(answerText, labelText);
                console.log(`[AutoClick] Option "${labelText}" score: ${score}`);

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = { input, labelText };
                }
            }

            // Require at least 50% match score
            if (bestMatch && bestScore >= 0.5) {
                const { input, labelText } = bestMatch;

                // Click the input
                input.checked = true;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('input', { bubbles: true }));

                const label = input.closest('label') || (input.id && document.querySelector(`label[for="${input.id}"]`));
                if (label) {
                    label.click();
                } else {
                    input.click();
                }

                this._addClickFeedback(input);
                this.lastClickedElement = input;

                console.log(`[AutoClick] Selected: "${labelText}" with score ${bestScore}`);
                return { success: true, message: `Clicked: ${labelText.substring(0, 50)}` };
            }

            console.log('[AutoClick] No suitable match found');
            return { success: false, message: 'Could not find matching answer option' };
        },

        /**
         * Get label text for an input element
         */
        _getLabelText(input) {
            let label = input.closest('label');
            if (label) return label.textContent.trim();

            if (input.id) {
                label = document.querySelector(`label[for="${input.id}"]`);
                if (label) return label.textContent.trim();
            }

            const parent = input.parentElement;
            if (parent) {
                const clone = parent.cloneNode(true);
                clone.querySelector('input')?.remove();
                return clone.textContent.trim();
            }

            return input.value;
        },

        /**
         * Calculate match score between answer and option (0-1)
         * Higher is better match
         */
        _matchScore(answer, option) {
            // Clean but preserve important characters
            const cleanAnswer = answer.replace(/`/g, '').trim();
            const cleanOption = option.trim();

            // Exact match (case insensitive)
            if (cleanAnswer.toLowerCase() === cleanOption.toLowerCase()) {
                return 1.0;
            }

            // Check if answer is contained in option or vice versa
            const answerLower = cleanAnswer.toLowerCase();
            const optionLower = cleanOption.toLowerCase();

            if (answerLower === optionLower) return 1.0;

            // For very short answers (like single characters), require exact match
            if (cleanAnswer.length <= 2) {
                // Check if option ends with the answer or is just the answer
                if (optionLower === answerLower ||
                    optionLower.endsWith(answerLower) ||
                    optionLower.startsWith(answerLower)) {
                    return 0.9;
                }
                return 0;
            }

            // For longer answers, check containment
            if (optionLower.includes(answerLower)) {
                return 0.8;
            }
            if (answerLower.includes(optionLower)) {
                return 0.7;
            }

            // Word-based matching for longer text
            const answerWords = answerLower.split(/\s+/).filter(w => w.length > 0);
            const optionWords = optionLower.split(/\s+/).filter(w => w.length > 0);

            if (answerWords.length === 0 || optionWords.length === 0) return 0;

            const matches = answerWords.filter(w => optionWords.some(ow => ow.includes(w) || w.includes(ow)));
            return matches.length / answerWords.length * 0.6;
        },

        /**
         * Check if element is visible
         */
        _isVisible(el) {
            return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        },

        /**
         * Add visual feedback animation when answer is clicked
         */
        _addClickFeedback(input) {
            const label = input.closest('label') || input.parentElement;
            if (!label) return;

            const originalTransition = label.style.transition;
            const originalBoxShadow = label.style.boxShadow;

            label.style.transition = 'box-shadow 0.3s ease';
            label.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.5), 0 0 20px rgba(34, 197, 94, 0.3)';

            setTimeout(() => {
                label.style.boxShadow = originalBoxShadow;
                setTimeout(() => {
                    label.style.transition = originalTransition;
                }, 300);
            }, 1000);
        }
    };

    // Listen for auto-click messages
    if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'auto-click-answer') {
                const result = window.AutoClickModule.clickAnswer(request.payload.text);
                sendResponse(result);
                return true;
            }
        });
    }
})();
