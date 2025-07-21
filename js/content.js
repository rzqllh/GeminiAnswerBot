// js/content.js

// Pencegahan deklarasi ganda: Pastikan seluruh script hanya dieksekusi sekali per konteks
if (typeof window.geminiAnswerBotContentScriptLoaded === 'undefined') {
  window.geminiAnswerBotContentScriptLoaded = true;

  let markerInstance = null;
  let isMarkerInitialized = false;

  function initializeMarker() {
      if (typeof Mark !== 'undefined' && !markerInstance) {
          markerInstance = new Mark(document.body);
          isMarkerInitialized = true;
      } else if (!isMarkerInitialized) {
          console.error("Content Script: Mark.js library (window.Mark) not found. Highlighting may not work.");
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
  }

  function highlightText(text) {
      if (!markerInstance) {
          console.error("Content Script: Mark.js not initialized. Cannot highlight.");
          return;
      }

      removePreviousHighlights();

      const textsToHighlight = Array.isArray(text) ? text : [text];

      if (textsToHighlight.length === 0 || textsToHighlight.every(t => !t || t.trim() === '')) {
          return;
      }

      textsToHighlight.forEach(t => {
          if (t && t.trim() !== '') {
              markerInstance.mark(t, {
                  "separateWordSearch": false, 
                  "accuracy": "partially", 
                  "caseSensitive": false, 
                  "acrossElements": true
              });
          }
      });

      const firstHighlight = document.querySelector('mark');
      if (firstHighlight) {
          firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }

  function _tryLevel1Extraction() {
      const quizContainerSelectors = [
          'div.w3-container.w3-panel',
          'div#mainLeaderboard > form',
          'div[class*="quiz"], form[action*="quiz"]',
          'div[class*="question-block"], div[id*="question"]'
      ];

      for (const selector of quizContainerSelectors) {
          const container = document.querySelector(selector);
          if (container && (container.querySelector('input[type="radio"]') || container.querySelector('input[type="checkbox"]'))) {
              let quizQuestion = '';
              const questionCandidates = container.querySelectorAll('h3, h4, p:first-of-type, div.w3-large, div[class*="question"]');
              for (const qEl of questionCandidates) {
                  let qText = qEl.textContent.trim().replace(/^Question\s+\d+\s+of\s+\d+\s*[:-]?\s*/i, '').trim();
                  if (qText.length > 10 && !qText.toLowerCase().includes('quiz') && !qText.toLowerCase().includes('html quiz')) {
                      quizQuestion = qText;
                      break;
                  }
              }

              const quizOptions = [];
              const rawOptionElements = container.querySelectorAll('input[type="radio"] + label, input[type="checkbox"] + label, div[class*="option"], div.w3-code, div.w3-example, li, p');
              const seenOptions = new Set();
              rawOptionElements.forEach(el => {
                  let optionContent = '';
                  const codeOrPreEl = el.querySelector('code, pre');
                  if (codeOrPreEl) {
                      optionContent = codeOrPreEl.textContent.trim();
                      optionContent = optionContent.includes('\n') ? `CODE_BLOCK_START\n${optionContent}\nCODE_BLOCK_END` : `\`${optionContent}\``;
                  } else {
                      const innerText = el.textContent.trim();
                      const innerHTML = el.innerHTML.trim();
                      if ((innerText.startsWith('<') && innerText.endsWith('>') && innerText.length < 50) || (innerHTML.includes('&lt;') && innerHTML.includes('&gt;') && innerHTML.length < 100)) {
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = innerHTML;
                          const parsedHtmlEl = tempDiv.firstElementChild;
                          if (parsedHtmlEl && parsedHtmlEl.tagName && parsedHtmlEl.outerHTML === innerHTML) {
                              optionContent = `CODE_BLOCK_START\n${innerHTML}\nCODE_BLOCK_END`;
                          } else {
                              optionContent = innerText;
                          }
                      } else {
                          optionContent = innerText;
                      }
                  }
                  if (optionContent.length > 1 && !optionContent.toLowerCase().includes('next') && !optionContent.toLowerCase().includes('submit') && !optionContent.toLowerCase().includes('previous') && !seenOptions.has(optionContent.toLowerCase())) {
                      quizOptions.push(optionContent);
                      seenOptions.add(optionContent.toLowerCase());
                  }
              });

              if (quizQuestion.length > 10 && quizOptions.length >= 2) {
                  let extractedStructuredContent = `Question: ${quizQuestion}\n\nOptions:\n`;
                  quizOptions.forEach(opt => {
                      extractedStructuredContent += `- ${opt}\n`;
                  });
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
      bodyCloneFinal.querySelectorAll('script, style, noscript, iframe, .hidden, [style*="display:none"], [aria-hidden="true"]').forEach(el => el.remove());
      return bodyCloneFinal.innerText.replace(/\s+/g, ' ').trim();
  }

  function getQuizContentFromPage() {
      const level1Result = _tryLevel1Extraction();
      if (level1Result) {
          console.log("Content Script: Level 1 Extraction SUCCESS.");
          return level1Result;
      }

      console.log("Content Script: Level 1 failed. Attempting Level 2.");
      const level2Result = _tryLevel2Extraction();
      if (level2Result) {
          console.log("Content Script: Level 2 Extraction SUCCESS.");
          return level2Result;
      }

      console.log("Content Script: Level 2 failed. Attempting Level 3.");
      return _tryLevel3Fallback();
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "ping_content_script") {
          sendResponse({ ready: isMarkerInitialized, success: true });
          return true;
      }

      if (request.action === "get_page_content") {
          const selectedText = window.getSelection().toString().trim();
          let pageContent = '';

          if (selectedText.length > 20) {
              pageContent = selectedText;
          } else {
              pageContent = getQuizContentFromPage();
          }
          
          sendResponse({ content: pageContent, source: selectedText.length > 20 ? 'selection' : 'auto' });
          return true;
      } else if (request.action === "highlight-answer") {
          highlightText(request.text);
          sendResponse({ success: true });
          return true;
      }
  });
}