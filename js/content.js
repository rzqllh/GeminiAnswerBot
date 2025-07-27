// js/content.js

if (typeof window.geminiAnswerBotContentScriptLoaded === 'undefined') {
  window.geminiAnswerBotContentScriptLoaded = true;

  let markerInstance = null;
  let isMarkerInitialized = false;
  let correctAiAnswer = null;
  let quizContainer = null;

  function initializeMarker() {
      if (typeof Mark !== 'undefined' && !markerInstance) {
          markerInstance = new Mark(document.body);
          isMarkerInitialized = true;
      } else if (!isMarkerInitialized) {
          console.error("Content Script: Mark.js library (window.Mark) not found.");
      }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initializeMarker();
  } else {
      document.addEventListener('DOMContentLoaded', initializeMarker);
  }

  function removePreviousHighlights() {
      if (markerInstance) {
          markerInstance.unmark();
      }
      correctAiAnswer = null;
      quizContainer = null;
  }

  function highlightText(text) {
      if (!markerInstance) return;
      removePreviousHighlights();
      const textsToHighlight = Array.isArray(text) ? text : [text];
      correctAiAnswer = textsToHighlight.length > 0 ? textsToHighlight[0] : null;
      if (textsToHighlight.length === 0 || textsToHighlight.every(t => !t || t.trim() === '')) return;

      textsToHighlight.forEach(t => {
          if (t && t.trim() !== '') {
              markerInstance.mark(t, {
                  "className": "gemini-answer-highlight",
                  "separateWordSearch": false,
                  "accuracy": "exactly",
                  "caseSensitive": false,
                  "acrossElements": true,
                  "done": () => {
                      chrome.storage.sync.get('preSubmissionCheck', (settings) => {
                          if (settings.preSubmissionCheck ?? true) {
                              activatePreSubmissionCheck();
                          }
                      });
                  }
              });
          }
      });

      const firstHighlight = document.querySelector('mark.gemini-answer-highlight');
      if (firstHighlight) {
          firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }

  // --- Escape HTML ---
  function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  function findQuizContainer() {
      const highlight = document.querySelector('mark.gemini-answer-highlight');
      if (!highlight) return document.body;
      return highlight.closest('form, div[class*="quiz"], div[class*="question"], div.w3-panel');
  }

  function activatePreSubmissionCheck() {
      if (!correctAiAnswer) return;
      quizContainer = findQuizContainer();
      if (!quizContainer) return;

      const keywords = ['next', 'submit', 'finish', 'selesai', 'lanjut', 'berikutnya', 'kirim'];
      const selectors = 'button, a, div[role="button"], input[type="submit"]';

      quizContainer.querySelectorAll(selectors).forEach(el => {
          const elText = el.textContent.toLowerCase().trim();
          if (keywords.some(keyword => elText.includes(keyword))) {
              el.removeEventListener('click', handleSubmissionClick, true);
              el.addEventListener('click', handleSubmissionClick, true);
          }
      });
  }

  function showCustomConfirm(userAnswer, aiAnswer, callback) {
      const oldDialog = document.getElementById('gemini-dialog-overlay');
      if (oldDialog) oldDialog.remove();

      const styleLink = document.createElement('link');
      styleLink.rel = 'stylesheet';
      styleLink.type = 'text/css';
      styleLink.href = chrome.runtime.getURL('assets/dialog.css');
      document.head.appendChild(styleLink);

      const dialogOverlay = document.createElement('div');
      dialogOverlay.id = 'gemini-dialog-overlay';
      dialogOverlay.className = 'gemini-answer-bot-dialog-overlay';

      const safeUserAnswer = escapeHtml(userAnswer);
      const safeAiAnswer = escapeHtml(typeof aiAnswer === 'string' ? aiAnswer.replace(/`/g, '') : aiAnswer);

      dialogOverlay.innerHTML = `
        <div class="gemini-answer-bot-dialog-box">
            <h2 class="gemini-answer-bot-dialog-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L14.472 9.528L22 12L14.472 14.472L12 22L9.528 14.472L2 12L9.528 9.528L12 2Z" stroke="#0a84ff" stroke-width="2.5" stroke-linejoin="round"/></svg>
                Answer Confirmation
            </h2>
            <div class="gemini-answer-bot-dialog-content">
                <p>Your selected answer is different from the AI's suggestion. Are you sure you want to continue?</p>
                <div class="gemini-answer-bot-dialog-answers">
                    <div class="gemini-answer-bot-answer-item"><strong>Your Answer</strong><code>${safeUserAnswer}</code></div>
                    <div class="gemini-answer-bot-answer-item"><strong>AI's Suggestion</strong><code>${safeAiAnswer}</code></div>
                </div>
            </div>
            <div class="gemini-answer-bot-dialog-buttons">
                <button class="gemini-answer-bot-dialog-button secondary" id="gemini-cancel-btn">Cancel</button>
                <button class="gemini-answer-bot-dialog-button primary" id="gemini-confirm-btn">Continue Anyway</button>
            </div>
        </div>`;

      document.body.appendChild(dialogOverlay);

      function closeDialog() {
          dialogOverlay.classList.remove('visible');
          setTimeout(() => {
              dialogOverlay.remove();
              styleLink.remove();
          }, 200);
      }

      document.getElementById('gemini-confirm-btn').onclick = () => { callback(true); closeDialog(); };
      document.getElementById('gemini-cancel-btn').onclick = () => { callback(false); closeDialog(); };

      setTimeout(() => dialogOverlay.classList.add('visible'), 10);
  }

  function handleSubmissionClick(event) {
      if (!quizContainer || !correctAiAnswer) return;

      const userSelectedInput = quizContainer.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked');
      if (!userSelectedInput) return;

      let userSelectedText = '';
      const parentLabel = userSelectedInput.closest('label') ||
          document.querySelector(`label[for="${userSelectedInput.id}"]`);
      if (parentLabel) {
          userSelectedText = parentLabel.textContent.trim();
      } else if (userSelectedInput.value) {
          userSelectedText = userSelectedInput.value.trim();
      }

      const normalize = str => str?.replace(/`/g, '').replace(/\s+/g, ' ').toLowerCase().trim();
      if (normalize(userSelectedText) !== normalize(correctAiAnswer)) {
          event.preventDefault();
          event.stopImmediatePropagation();

          showCustomConfirm(userSelectedText, correctAiAnswer, confirmed => {
              if (confirmed) {
                  event.target.removeEventListener('click', handleSubmissionClick, true);
                  event.target.click();
                  setTimeout(() => event.target.addEventListener('click', handleSubmissionClick, true), 100);
              }
          });
      }
  }

  // 🔧 REVISI EKSTRAKSI QUIZ YANG LEBIH FLEKSIBEL
  function _tryLevel1Extraction() {
      const quizContainerSelectors = [
          'div.w3-container.w3-panel',
          'div#mainLeaderboard > form',
          'div[class*="quiz"]',
          'form[action*="quiz"]',
          'div[class*="question-block"]',
          'div[id*="question"]'
      ];
      for (const selector of quizContainerSelectors) {
          const container = document.querySelector(selector);
          if (container && (container.querySelector('input[type="radio"]') || container.querySelector('input[type="checkbox"]'))) {
              let quizQuestion = '';
              const questionCandidates = container.querySelectorAll('h3, h4, p:first-of-type, div.w3-large, div[class*="question"]');
              for (const qEl of questionCandidates) {
                  let qText = qEl.textContent.trim().replace(/^Question\s+\d+\s+of\s+\d+\s*[:-]?\s*/i, '').trim();
                  if (qText.length > 10 && !qText.toLowerCase().includes('quiz')) {
                      quizQuestion = qText;
                      break;
                  }
              }

              const quizOptions = [];
              const seenOptions = new Set();
              const inputOptions = container.querySelectorAll('input[type="radio"], input[type="checkbox"]');

              inputOptions.forEach(input => {
                  let label = input.closest('label') || container.querySelector(`label[for="${input.id}"]`);
                  if (label) {
                      const tempDiv = document.createElement('div');
                      tempDiv.innerHTML = label.innerHTML;
                      tempDiv.querySelectorAll('input').forEach(el => el.remove());
                      const optionContent = tempDiv.textContent.trim();
                      if (optionContent.length > 0 && !seenOptions.has(optionContent)) {
                          quizOptions.push(optionContent);
                          seenOptions.add(optionContent);
                      }
                  }
              });

              if (quizQuestion.length > 10 && quizOptions.length >= 2) {
                  let extractedStructuredContent = `Question: ${quizQuestion}\n\nOptions:\n`;
                  quizOptions.forEach(opt => { extractedStructuredContent += `- ${opt}\n`; });
                  return extractedStructuredContent.trim();
              }
          }
      }
      return null;
  }
  function _tryLevel2Extraction() {
      const mainContentArea = document.querySelector('main') || document.querySelector('article') || document.querySelector('div.w3-main') || document.querySelector('#main') || document.querySelector('body > div.container');
      if (!mainContentArea) return null;
      let content = '';
      const clone = mainContentArea.cloneNode(true);
      const aggressiveSelectorsToRemove = ['script', 'style', 'noscript', 'iframe', '.ads', '.ad', '[id*="ad"]', '[class*="ad"]', 'nav', 'header', 'footer', 'aside', '.hidden', '[style*="display:none"]', '[aria-hidden="true"]', '.w3-sidebar', '#mySidenav', '.w3-bar', '.w3-top', '.w3-bottom', 'input[type="hidden"]', 'button', 'textarea', 'select', 'img', '.w3-example', '.w3-code', '[class*="google-ads"]', '[id*="google_ads"]', '.w3-include-css', '.w3-include-html', '.w3-hide-small', '.w3-hide-medium', '.w3-hide-large', '#google_translate_element', 'div[id*="at-svc"]', 'div[class*="at-svc"]', 'a[href*="#"]', '[role="button"]', '.navbar', '.breadcrumb', '.footer', '#main-footer', '.sidebar', '.section-header', '.course-info-card', '.progress-bar', '.user-profile-widget', '.activity-log', '.notification-area', '.leaderboard-widget', '[class*="ad-box"]', '[id*="ad-block"]', '[class*="ad-unit"]'];
      clone.querySelectorAll(aggressiveSelectorsToRemove.join(', ')).forEach(el => el.remove());
      clone.childNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
              const tagName = node.tagName.toLowerCase();
              if (['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe'].includes(tagName)) return;
              let text = node.textContent.trim();
              if (tagName === 'pre' || tagName === 'code') { text = `CODE_BLOCK_START\n${text}\nCODE_BLOCK_END`; }
              if (text.length > 1 && text.length < 1000 && !/advertisement|cookie|login|sign up|next|previous|submit|test your skills/i.test(text)) {
                  content += text + '\n\n';
              }
          } else if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 1) {
              content += node.nodeValue.trim() + '\n\n';
          }
      });
      content = content.trim().replace(/\n\s*\n\s*\n/g, '\n\n').trim();
      return content.length > 50 ? content : null;
  }
  function _tryLevel3Fallback() {
      const bodyCloneFinal = document.body.cloneNode(true);
      bodyCloneFinal.querySelectorAll('script', 'style', 'noscript', 'iframe', '.hidden', '[style*="display:none"]', '[aria-hidden="true"]').forEach(el => el.remove());
      return bodyCloneFinal.innerText.replace(/\s+/g, ' ').trim();
  }
  function getQuizContentFromPage() {
      const level1Result = _tryLevel1Extraction();
      if (level1Result) return level1Result;
      const level2Result = _tryLevel2Extraction();
      if (level2Result) return level2Result;
      return _tryLevel3Fallback();
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "ping_content_script") {
          sendResponse({ ready: isMarkerInitialized, success: true });
          return true;
      }
      if (request.action === "get_page_content") {
          const selectedText = window.getSelection().toString().trim();
          const pageContent = selectedText.length > 20 ? selectedText : getQuizContentFromPage();
          sendResponse({ content: pageContent, source: selectedText.length > 20 ? 'selection' : 'auto' });
          return true;
      } else if (request.action === "highlight-answer") {
          highlightText(request.text);
          sendResponse({ success: true });
          return true;
      }
  });
}