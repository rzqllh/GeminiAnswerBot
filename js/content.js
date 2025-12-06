// === Hafizh Signature Code ===
// Author: Hafizh Rizqullah — GeminiAnswerBot Specialist
// File: js/content.js
// Created: 2025-08-27 12:05:00

if (typeof window.geminiAnswerBotContentLoaded === 'undefined') {
  window.geminiAnswerBotContentLoaded = true;

  class MarkerModule {
    constructor() {
      this.markerInstance = null;
      this.init();
    }

    init() {
      if (typeof Mark !== 'undefined') {
        this.markerInstance = new Mark(document.body);
      } else {
        console.error("Content Script: Mark.js library (window.Mark) not found.");
      }
    }

    highlight(text, onComplete) {
      if (!this.markerInstance) return;
      this.unmark();

      const textsToHighlight = Array.isArray(text) ? text : [text];
      if (textsToHighlight.length === 0 || textsToHighlight.every(t => !t || t.trim() === '')) {
        if (onComplete) onComplete();
        return;
      }

      this.markerInstance.mark(textsToHighlight, {
        "className": "gemini-answer-highlight",
        "separateWordSearch": false,
        "accuracy": "exactly",
        "caseSensitive": false,
        "acrossElements": true,
        "done": () => {
          const firstHighlight = document.querySelector('mark.gemini-answer-highlight');
          if (firstHighlight) {
            firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          if (onComplete) onComplete();
        }
      });
    }

    unmark() {
      if (this.markerInstance) {
        this.markerInstance.unmark();
      }
    }
  }

  class QuizModule {
    constructor() {
      this.correctAiAnswer = null;
      this.quizContainer = null;
      this.submissionHandler = this.handleSubmissionClick.bind(this);
    }

    _findBestVisibleQuizBlock() {
      const quizBlocks = this._findQuizBlocks();
      if (quizBlocks.length === 0) return null;

      let bestCandidate = null;
      let maxVisibility = 0;

      const viewportHeight = window.innerHeight;

      quizBlocks.forEach(block => {
        const rect = block.getBoundingClientRect();

        if (rect.bottom > 0 && rect.top < viewportHeight) {
          const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
          const visibilityRatio = visibleHeight / rect.height;

          if (visibilityRatio > maxVisibility) {
            maxVisibility = visibilityRatio;
            bestCandidate = block;
          }
        }
      });

      return bestCandidate || quizBlocks[0];
    }

    _findQuizBlocks() {
      const inputGroups = {};
      document.querySelectorAll('input[type="radio"]').forEach(input => {
        if (!this._isVisible(input) || !input.name) return;
        if (!inputGroups[input.name]) {
          inputGroups[input.name] = [];
        }
        inputGroups[input.name].push(input);
      });

      const containers = new Set();
      for (const name in inputGroups) {
        const group = inputGroups[name];
        if (group.length < 2) continue;

        let commonAncestor = group[0].parentElement;
        for (let i = 1; i < group.length; i++) {
          while (commonAncestor && !commonAncestor.contains(group[i])) {
            commonAncestor = commonAncestor.parentElement;
          }
        }

        while (commonAncestor && commonAncestor.parentElement && commonAncestor.parentElement.tagName !== 'BODY' && commonAncestor.parentElement.tagName !== 'HTML') {
          const parent = commonAncestor.parentElement;
          const parentInputs = parent.querySelectorAll('input[type="radio"]').length;
          if (parentInputs > group.length + 2) {
            break;
          }
          commonAncestor = parent;
        }

        if (commonAncestor && commonAncestor.tagName !== 'BODY' && commonAncestor.tagName !== 'HTML') {
          containers.add(commonAncestor);
        }
      }

      if (containers.size === 0) {
        const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        if (inputs.length > 1 && inputs.length < 20) {
          let commonAncestor = inputs[0].parentElement;
          for (let i = 1; i < inputs.length; i++) {
            while (commonAncestor && !commonAncestor.contains(inputs[i])) {
              commonAncestor = commonAncestor.parentElement;
            }
          }
          if (commonAncestor && commonAncestor.tagName !== 'BODY') {
            containers.add(commonAncestor);
          }
        }
      }

      return Array.from(containers);
    }

    extractContent() {
      const visibleBlock = this._findBestVisibleQuizBlock();
      if (!visibleBlock) return null;

      return this._extractDataFromBlock(visibleBlock);
    }

    _extractDataFromBlock(block) {
      if (!block) return null;

      const options = [];
      const seenOptions = new Set();
      let hasCheckboxes = false;
      const inputs = block.querySelectorAll('input[type="radio"], input[type="checkbox"]');

      // 1. Extract Options
      inputs.forEach(input => {
        if (!this._isVisible(input)) return;
        if (input.type === 'checkbox') hasCheckboxes = true;

        let optionText = '';
        let label = input.closest('label');
        if (!label && input.id) {
          label = document.querySelector(`label[for="${input.id}"]`);
        }

        if (label) {
          optionText = label.textContent.trim();
        }

        if (!optionText && input.parentElement) {
          const parentClone = input.parentElement.cloneNode(true);
          parentClone.querySelector('input')?.remove();
          optionText = parentClone.textContent.trim();
        }

        if (optionText && !seenOptions.has(optionText)) {
          options.push(optionText);
          seenOptions.add(optionText);
        }
      });

      if (options.length < 2) return null;

      // 2. Extract Question Context (Enhanced)
      let questionText = '';
      try {
        const blockClone = block.cloneNode(true);

        const inputsInClone = blockClone.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        inputsInClone.forEach(inp => {
          const label = inp.closest('label');
          if (label) {
            label.remove();
          } else {
            const parent = inp.parentElement;
            if (parent && parent.textContent.trim().length < 200) {
              parent.remove();
            } else {
              inp.remove();
            }
          }
        });

        blockClone.querySelectorAll('script, style, noscript').forEach(el => el.remove());

        let rawText = blockClone.innerText;
        questionText = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');

      } catch (e) {
        console.warn("Error in enhanced extraction, falling back:", e);
      }

      if (questionText.length < 10) {
        const firstInput = inputs[0];
        if (firstInput) {
          const allElements = Array.from(block.getElementsByTagName('*'));
          const firstOptionContainer = firstInput.closest('div, p, li, label');
          const firstInputIndex = firstOptionContainer ? allElements.indexOf(firstOptionContainer) : -1;

          if (firstInputIndex !== -1) {
            for (let i = firstInputIndex - 1; i >= 0; i--) {
              const el = allElements[i];
              if (el.querySelector('input')) continue;
              if (firstOptionContainer.contains(el)) continue;
              if (!this._isVisible(el)) continue;

              const text = el.textContent.trim();
              if (text.length > 10) {
                questionText = text;
                break;
              }
            }
          }
        }
      }

      if (questionText && options.length > 1) {
        let content = `Question: ${questionText}\n\nOptions:\n${options.map(opt => `- ${opt}`).join('\n')}`;
        if (hasCheckboxes) {
          content += "\n\nNote: This question may have multiple correct answers. Select all that apply.";
        }
        return content;
      }

      return null;
    }

    _isVisible(el) {
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }

    extractOptions() {
      const visibleBlock = this._findBestVisibleQuizBlock();
      const container = visibleBlock || document;
      const options = [];
      const seenOptions = new Set();
      container.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
        if (this._isVisible(input)) {
          const label = input.closest('label') || (input.id && document.querySelector(`label[for="${input.id}"]`));
          if (label) {
            const optionContent = label.textContent.trim();
            if (optionContent && !seenOptions.has(optionContent)) {
              options.push(optionContent);
              seenOptions.add(optionContent);
            }
          }
        }
      });
      return options;
    }

    activatePreSubmissionCheck(aiAnswer) {
      this.correctAiAnswer = aiAnswer;
      if (!this.correctAiAnswer) return;
      const highlight = document.querySelector('mark.gemini-answer-highlight');
      this.quizContainer = highlight ? highlight.closest('form, div[class*="quiz"], div[class*="question"], div.w3-panel') : document.body;
      if (!this.quizContainer) return;
      const keywords = ['next', 'submit', 'finish', 'selesai', 'lanjut', 'berikutnya', 'kirim'];
      const selectors = 'button, a, div[role="button"], input[type="submit"]';
      this.quizContainer.querySelectorAll(selectors).forEach(el => {
        const elText = el.textContent.toLowerCase().trim();
        if (keywords.some(keyword => elText.includes(keyword))) {
          el.removeEventListener('click', this.submissionHandler, true);
          el.addEventListener('click', this.submissionHandler, true);
        }
      });
    }

    handleSubmissionClick(event) {
      if (!this.quizContainer || !this.correctAiAnswer) return;
      const userSelectedInput = this.quizContainer.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked');
      if (!userSelectedInput) return;
      let userSelectedText = (userSelectedInput.closest('label')?.textContent || userSelectedInput.value).trim();
      const normalize = str => str?.replace(/`/g, '').replace(/\s+/g, ' ').toLowerCase().trim();
      if (normalize(userSelectedText) !== normalize(this.correctAiAnswer)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.showConfirmationDialog(userSelectedText, this.correctAiAnswer, confirmed => {
          if (confirmed) {
            event.target.removeEventListener('click', this.submissionHandler, true);
            event.target.click();
          }
        });
      }
    }

    showConfirmationDialog(userAnswer, aiAnswer, callback) {
      const oldDialog = document.getElementById('gemini-dialog-overlay');
      if (oldDialog) oldDialog.remove();
      const dialogOverlay = document.createElement('div');
      dialogOverlay.id = 'gemini-dialog-overlay';
      dialogOverlay.className = 'gemini-answer-bot-dialog-overlay';
      const safeUserAnswer = _escapeHtml(userAnswer);
      const safeAiAnswer = _escapeHtml(typeof aiAnswer === 'string' ? aiAnswer.replace(/`/g, '') : aiAnswer);
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
      const closeDialog = () => {
        dialogOverlay.classList.remove('visible');
        setTimeout(() => dialogOverlay.remove(), 200);
      };
      document.getElementById('gemini-confirm-btn').onclick = () => { callback(true); closeDialog(); };
      document.getElementById('gemini-cancel-btn').onclick = () => { callback(false); closeDialog(); };
      setTimeout(() => dialogOverlay.classList.add('visible'), 10);
    }
  }

  class PageModule {
    constructor() {
      this.MAX_CONTENT_LENGTH = 50000;
    }

    extractFullContent() {
      const mainContentSelectors = ['main', 'article', 'div[role="main"]', 'div[id*="content"]', 'div[class*="content"]'];
      let mainContentArea = mainContentSelectors.map(s => document.querySelector(s)).find(el => el) || document.body;
      const clone = mainContentArea.cloneNode(true);
      const selectorsToRemove = [
        'script', 'style', 'noscript', 'iframe', 'nav', 'header', 'footer', 'aside', 'button', 'input', 'textarea',
        'select', 'form', '[aria-hidden="true"]', '[style*="display:none"]', 'div[class*="sidebar"]',
        'div[id*="sidebar"]', 'div[class*="promo"]', 'div[class*="related"]', '[class*="ad"]', '[id*="ad"]'
      ];
      clone.querySelectorAll(selectorsToRemove.join(', ')).forEach(el => el.remove());
      let content = clone.innerText;
      content = content.replace(/\s{3,}/g, '\n\n').trim();

      if (content.length > this.MAX_CONTENT_LENGTH) {
        console.warn(`Content truncated from ${content.length} to ${this.MAX_CONTENT_LENGTH} characters.`);
        content = content.substring(0, this.MAX_CONTENT_LENGTH);
      }

      return content.length > 100 ? content : this.fallbackContent();
    }

    fallbackContent() {
      try {
        const documentClone = document.cloneNode(true);
        const article = new Readability(documentClone).parse();
        if (article && article.textContent) {
          console.log("Readability.js fallback successful.");
          let content = article.textContent.trim();
          if (content.length > this.MAX_CONTENT_LENGTH) {
            console.warn(`Readability content truncated from ${content.length} to ${this.MAX_CONTENT_LENGTH} characters.`);
            content = content.substring(0, this.MAX_CONTENT_LENGTH);
          }
          return content;
        }
      } catch (e) {
        console.error("Readability.js failed, using raw text fallback:", e);
      }

      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());
      let content = clone.innerText.trim();

      if (content.length > this.MAX_CONTENT_LENGTH) {
        console.warn(`Raw text fallback content truncated from ${content.length} to ${this.MAX_CONTENT_LENGTH} characters.`);
        content = content.substring(0, this.MAX_CONTENT_LENGTH);
      }
      return content;
    }
  }

  class ToolbarModule {
    constructor(dialogModule) {
      this.toolbarElement = null;
      this.dialogModule = dialogModule;
      this.create();
      this.bindEvents();
    }

    create() {
      const existingToolbar = document.getElementById('gemini-answer-bot-toolbar');
      if (existingToolbar) {
        this.toolbarElement = existingToolbar;
        return;
      }
      this.toolbarElement = document.createElement('div');
      this.toolbarElement.id = 'gemini-answer-bot-toolbar';
      this.toolbarElement.className = 'gemini-answer-bot-toolbar';
      const toolbarActions = [
        { action: 'summarize', title: 'Summarize', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.37 3.63a2.12 2.12 0 1 1 3 3L12 16l-4 1 1-4Z"/></svg>' },
        { action: 'explanation', title: 'Explain', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14-4-4 4-4"/><path d="M12 14h-4a2 2 0 0 0-2 2v4"/><path d="m16 10 4 4-4 4"/><path d="m16 10h4a2 2 0 0 1 2 2v4"/></svg>' },
        { action: 'translate', title: 'Translate', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>' },
      ];
      toolbarActions.forEach(item => {
        const button = document.createElement('button');
        button.className = 'gab-toolbar-button';
        button.title = item.title;
        button.innerHTML = item.svg;
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          this.hide();
          const selectedText = window.getSelection().toString();
          if (selectedText.trim()) {
            this.dialogModule.show(item.title);
            chrome.runtime.sendMessage({
              action: 'triggerContextMenuAction',
              payload: { action: item.action, selectionText: selectedText }
            });
          }
        });
        this.toolbarElement.appendChild(button);
      });
      document.body.appendChild(this.toolbarElement);
    }

    bindEvents() {
      document.addEventListener('mouseup', () => setTimeout(() => {
        if (this.dialogModule.isVisible()) return;
        const selectionText = window.getSelection().toString().trim();
        if (selectionText.length > 5) { this.show(); } else { this.hide(); }
      }, 10));
      document.addEventListener('mousedown', (e) => {
        if (this.toolbarElement && !this.toolbarElement.contains(e.target)) {
          this.hide();
        }
      });
    }

    show() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !this.toolbarElement) { this.hide(); return; }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width < 5 && rect.height < 5) { this.hide(); return; }
      this.toolbarElement.classList.add('visible');
      const { offsetWidth: toolbarWidth, offsetHeight: toolbarHeight } = this.toolbarElement;
      let top = rect.top + window.scrollY - toolbarHeight - 10;
      let left = rect.left + window.scrollX + (rect.width / 2) - (toolbarWidth / 2);
      if (top < window.scrollY) top = rect.bottom + window.scrollY + 10;
      if (left < 0) left = 5;
      if (left + toolbarWidth > document.documentElement.clientWidth) {
        left = document.documentElement.clientWidth - toolbarWidth - 5;
      }
      this.toolbarElement.style.top = `${top}px`;
      this.toolbarElement.style.left = `${left}px`;
    }

    hide() {
      if (this.toolbarElement) {
        this.toolbarElement.classList.remove('visible');
      }
    }
  }

  class DialogModule {
    constructor() {
      this.overlay = null;
      this.contentArea = null;
      this.titleArea = null;
      this.streamAccumulator = '';
      this.boundEscapeHandler = this._handleEscapeKey.bind(this);
    }

    _ensureStylesheet() {
      if (!document.getElementById('gemini-answer-bot-result-dialog-css')) {
        const link = document.createElement('link');
        link.id = 'gemini-answer-bot-result-dialog-css';
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = chrome.runtime.getURL('assets/resultDialog.css');
        document.head.appendChild(link);
      }
    }

    create() {
      if (this.overlay) return;
      this._ensureStylesheet();

      this.overlay = document.createElement('div');
      this.overlay.id = 'gemini-answer-bot-result-dialog-overlay';

      this.overlay.innerHTML = `
              <div id="gemini-answer-bot-result-dialog-box" role="dialog" aria-modal="true">
                  <div class="gab-result-dialog-header">
                      <h2 class="gab-result-dialog-title">Result</h2>
                      <button class="gab-result-dialog-close-btn" aria-label="Close">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                  </div>
                  <div class="gab-result-dialog-content">
                      <div class="gab-result-dialog-loader">
                          <div class="gab-result-dialog-spinner"></div>
                      </div>
                  </div>
              </div>
          `;

      document.body.appendChild(this.overlay);

      this.contentArea = this.overlay.querySelector('.gab-result-dialog-content');
      this.titleArea = this.overlay.querySelector('.gab-result-dialog-title');

      this.overlay.querySelector('.gab-result-dialog-close-btn').addEventListener('click', () => this.hide());
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.hide();
        }
      });
    }

    show(title = 'Result') {
      this.create();
      this.titleArea.textContent = _escapeHtml(title);
      this.streamAccumulator = '';
      this.contentArea.innerHTML = `
              <div class="gab-result-dialog-loader">
                  <div class="gab-result-dialog-spinner"></div>
              </div>
          `;

      setTimeout(() => this.overlay.classList.add('visible'), 10);
      document.addEventListener('keydown', this.boundEscapeHandler);
    }

    hide() {
      if (!this.overlay) return;

      document.removeEventListener('keydown', this.boundEscapeHandler);

      this.overlay.classList.remove('visible');

      this.overlay.addEventListener('transitionend', () => {
        if (this.overlay) {
          this.overlay.remove();
          this.overlay = null;
          this.contentArea = null;
          this.titleArea = null;
        }
      }, { once: true });
    }

    _handleEscapeKey(event) {
      if (event.key === 'Escape') {
        this.hide();
      }
    }

    update(chunk) {
      if (!this.contentArea) return;
      if (this.streamAccumulator === '') {
        this.contentArea.innerHTML = '';
      }
      this.streamAccumulator += chunk;
      this.contentArea.innerHTML = DOMPurify.sanitize(marked.parse(this.streamAccumulator));
    }

    handleError(error) {
      if (!this.contentArea) return;
      this.titleArea.textContent = 'Error';
      this.contentArea.innerHTML = `<p><strong>${_escapeHtml(error.title)}</strong></p><p>${_escapeHtml(error.message)}</p>`;
    }

    isVisible() {
      return this.overlay && this.overlay.classList.contains('visible');
    }
  }

  class ContentController {
    constructor() {
      this.marker = new MarkerModule();
      this.quiz = new QuizModule();
      this.page = new PageModule();
      this.dialog = new DialogModule();
      this.toolbar = new ToolbarModule(this.dialog);
      this.listenForMessages();
    }

    listenForMessages() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        const { action, payload } = request;
        switch (action) {
          case "ping_content_script":
            sendResponse({ ready: true });
            break;
          case "get_quiz_content":
            setTimeout(() => {
              const selectedText = window.getSelection().toString().trim();
              let content;
              if (selectedText.length > 20) {
                content = `Question: ${selectedText}`;
              } else {
                content = this.quiz.extractContent();
              }

              if (!content) {
                console.log("No specific quiz block found. Falling back to Readability.js for analysis.");
                content = this.page.fallbackContent();
              }
              sendResponse({ content });
            }, 150);
            return true;

          case "geminiStreamUpdate":
            if (!payload.success) {
              this.dialog.handleError(payload.error);
              return;
            }
            if (payload.chunk) {
              this.dialog.update(payload.chunk);
            }
            break;

          case "showDialogForContextMenu":
            const titleMap = {
              summarize: 'Summary',
              explanation: 'Explanation',
              translate: 'Translation',
            };
            const title = titleMap[payload.action.split('-')[0]] || 'Result';
            this.dialog.show(title);
            chrome.runtime.sendMessage({
              action: 'triggerContextMenuAction',
              payload: payload
            });
            break;

          case "get_full_page_content":
            const fullContent = this.page.extractFullContent();
            sendResponse({ content: fullContent });
            break;
          case "highlight-answer":
            this.marker.highlight(payload.text, () => {
              if (payload.preSubmissionCheck) {
                this.quiz.activatePreSubmissionCheck(payload.text[0]);
              }
            });
            sendResponse({ success: true });
            break;
          case "get_quiz_options":
            const options = this.quiz.extractOptions();
            sendResponse({ options });
            break;
        }
        return true;
      });
    }
  }

  new ContentController();
}