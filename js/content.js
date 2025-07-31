// js/content.js

/**
 * Mengenkapsulasi semua interaksi dengan pustaka Mark.js untuk menyorot teks.
 */
class MarkerModule {
  constructor() {
    this.markerInstance = null;
    this.init();
  }

  init() {
    if (typeof Mark !== 'undefined') {
      this.markerInstance = new Mark(document.body);
    } else {
      console.error("Content Script: Pustaka Mark.js (window.Mark) tidak ditemukan.");
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

/**
 * Mengelola semua logika terkait ekstraksi konten kuis dan pemeriksaan pra-pengiriman.
 */
class QuizModule {
  constructor() {
    this.correctAiAnswer = null;
    this.quizContainer = null;
    this.submissionHandler = this.handleSubmissionClick.bind(this);
  }
  
  extractContent() {
    const quizContainerSelectors = [
      'div.w3-container.w3-panel', 'form[action*="quiz"]', 'div[id*="quiz"]',
      'div[class*="quiz"]', 'div[class*="question-block"]', 'div[id*="question"]'
    ];

    for (const selector of quizContainerSelectors) {
      const container = document.querySelector(selector);
      if (container && (container.querySelector('input[type="radio"]') || container.querySelector('input[type="checkbox"]'))) {
        let quizQuestion = '';
        const questionCandidates = container.querySelectorAll('h3, h4, p, div.w3-large, div[class*="question-text"]');
        for (const qEl of questionCandidates) {
          let qText = qEl.textContent.trim().replace(/^Question\s+\d+\s+of\s+\d+\s*[:-]?\s*/i, '').trim();
          if (qText.length > 10 && !qEl.querySelector('input')) {
            quizQuestion = qText;
            break;
          }
        }

        const quizOptions = [];
        const seenOptions = new Set();
        container.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
          let label = input.closest('label') || container.querySelector(`label[for="${input.id}"]`);
          if (label) {
            const optionContent = label.textContent.trim();
            if (optionContent && !seenOptions.has(optionContent)) {
              quizOptions.push(optionContent);
              seenOptions.add(optionContent);
            }
          }
        });

        if (quizQuestion && quizOptions.length >= 2) {
          return `Question: ${quizQuestion}\n\nOptions:\n${quizOptions.map(opt => `- ${opt}`).join('\n')}`;
        }
      }
    }
    return null;
  }

  extractOptions() {
    const container = document.querySelector('div[class*="quiz"], form[action*="quiz"], div.w3-panel');
    if (!container) return [];

    const options = [];
    const seenOptions = new Set();
    container.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
        const label = input.closest('label') || document.querySelector(`label[for="${input.id}"]`);
        if (label) {
            const optionContent = label.textContent.trim();
            if (optionContent && !seenOptions.has(optionContent)) {
                options.push(optionContent);
                seenOptions.add(optionContent);
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

/**
 * Mengelola ekstraksi konten dari seluruh halaman.
 */
class PageModule {
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
        return content.length > 100 ? content : this.fallbackContent();
    }

    fallbackContent() {
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());
        return clone.innerText.trim();
    }
}

/**
 * Mengelola pembuatan dan perilaku floating toolbar.
 */
class ToolbarModule {
  constructor() {
    this.toolbarElement = null;
    this.create();
    this.bindEvents();
  }

  create() {
    if (document.getElementById('gemini-answer-bot-toolbar')) return;

    this.toolbarElement = document.createElement('div');
    this.toolbarElement.id = 'gemini-answer-bot-toolbar';
    this.toolbarElement.className = 'gemini-answer-bot-toolbar';
    
    const toolbarActions = [
        { action: 'summarize', title: 'Summarize', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.37 3.63a2.12 2.12 0 1 1 3 3L12 16l-4 1 1-4Z"/></svg>' },
        { action: 'explain', title: 'Explain', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14-4-4 4-4"/><path d="M12 14h-4a2 2 0 0 0-2 2v4"/><path d="m16 10 4 4-4 4"/><path d="m16 10h4a2 2 0 0 1 2 2v4"/></svg>' },
        { action: 'translate', title: 'Translate', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>' },
    ];

    toolbarActions.forEach(item => {
      const button = document.createElement('button');
      button.className = 'gab-toolbar-button';
      button.title = item.title;
      button.innerHTML = item.svg;
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedText = window.getSelection().toString();
        if (selectedText.trim()) {
          chrome.runtime.sendMessage({
            action: 'triggerContextMenuAction',
            payload: { action: item.action, selectionText: selectedText }
          });
        }
        this.hide();
      });
      this.toolbarElement.appendChild(button);
    });

    document.body.appendChild(this.toolbarElement);
  }
  
  bindEvents() {
    document.addEventListener('mouseup', () => setTimeout(() => {
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
    if (!selection || selection.isCollapsed) { this.hide(); return; }
    
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

/**
 * Controller utama yang menginisialisasi dan mengelola semua modul di content script.
 */
class ContentController {
  constructor() {
    this.marker = new MarkerModule();
    this.quiz = new QuizModule();
    this.page = new PageModule();
    this.toolbar = new ToolbarModule();
    this.listenForMessages();
  }
  
  listenForMessages() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case "ping_content_script":
          sendResponse({ ready: true, success: true });
          break;
        case "get_quiz_content":
          const content = this.quiz.extractContent() || this.page.fallbackContent();
          sendResponse({ content });
          break;
        case "get_full_page_content":
          const fullContent = this.page.extractFullContent();
          sendResponse({ content: fullContent });
          break;
        case "highlight-answer":
          this.marker.highlight(request.text, () => {
              chrome.storage.sync.get('preSubmissionCheck', (settings) => {
                  if (settings.preSubmissionCheck ?? true) {
                      this.quiz.activatePreSubmissionCheck(request.text[0]);
                  }
              });
          });
          sendResponse({ success: true });
          break;
        case "get_quiz_options":
          const options = this.quiz.extractOptions();
          sendResponse({ options });
          break;
      }
      return true; // Keep the message channel open for async responses
    });
  }
}

// Inisialisasi controller hanya jika belum pernah dimuat sebelumnya.
if (typeof window.geminiAnswerBotContentScriptLoaded === 'undefined') {
  window.geminiAnswerBotContentScriptLoaded = true;
  new ContentController();
}