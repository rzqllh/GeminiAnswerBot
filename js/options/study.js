// === Hafizh Rizqullah | GeminiAnswerBot ===
// 📄 js/options/study.js
// 🕓 v5.0 - Study Mode feature

const StudyModule = (() => {
  let ELS = {};
  let studyItems = [];
  let currentQuizIndex = 0;
  let quizMode = false;

  // Load study items from storage
  async function loadStudyItems() {
    const data = await StorageManager.local.get('studyItems');
    studyItems = data.studyItems || [];
    return studyItems;
  }

  // Save study items
  async function saveStudyItems() {
    await StorageManager.local.set({ studyItems });
  }

  // Add item to study list
  async function addToStudy(item) {
    await loadStudyItems();

    // Check for duplicates
    const exists = studyItems.some(s =>
      s.question === item.question ||
      (s.timestamp && s.timestamp === item.timestamp)
    );

    if (!exists) {
      const studyItem = {
        id: Date.now(),
        question: item.question || item.cleanedContent?.match(/Question:\s*([\s\S]*?)(?=\nOptions:|$)/i)?.[1]?.trim() || 'Unknown',
        options: item.options || [],
        correctAnswer: item.answer || item.correctAnswer,
        confidence: item.confidence || 'N/A',
        reason: item.reason || '',
        userNotes: '',
        savedAt: new Date().toISOString(),
        learned: false,
        reviewCount: 0,
        lastReviewed: null,
        tagId: item.tagId || 'general',
        sourceUrl: item.url || ''
      };

      studyItems.unshift(studyItem);
      await saveStudyItems();
      return studyItem;
    }
    return null;
  }

  // Remove from study list
  async function removeFromStudy(itemId) {
    studyItems = studyItems.filter(s => s.id !== itemId);
    await saveStudyItems();
  }

  // Mark as learned
  async function markAsLearned(itemId, learned = true) {
    const item = studyItems.find(s => s.id === itemId);
    if (item) {
      item.learned = learned;
      item.lastReviewed = new Date().toISOString();
      item.reviewCount++;
      await saveStudyItems();
    }
  }

  // Add user notes
  async function updateNotes(itemId, notes) {
    const item = studyItems.find(s => s.id === itemId);
    if (item) {
      item.userNotes = notes;
      await saveStudyItems();
    }
  }

  // Get items for review (not learned)
  function getItemsForReview() {
    return studyItems.filter(s => !s.learned);
  }

  // Get learned items
  function getLearnedItems() {
    return studyItems.filter(s => s.learned);
  }

  // Get statistics
  function getStats() {
    const total = studyItems.length;
    const learned = studyItems.filter(s => s.learned).length;
    const pending = total - learned;
    const avgReviews = total > 0
      ? Math.round(studyItems.reduce((sum, s) => sum + s.reviewCount, 0) / total * 10) / 10
      : 0;

    return { total, learned, pending, avgReviews };
  }

  // Start quiz mode
  function startQuiz(shuffle = true) {
    const items = getItemsForReview();
    if (items.length === 0) return false;

    if (shuffle) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
    }

    quizMode = true;
    currentQuizIndex = 0;
    return items;
  }

  // Render study item card
  function renderStudyCard(item, showAnswer = true) {
    const tagBadge = typeof TagsModule !== 'undefined'
      ? TagsModule.createTagBadge(item.tagId)
      : '';

    return `
      <div class="study-card ${item.learned ? 'learned' : ''}" data-id="${item.id}">
        <div class="study-card-header">
          <span class="study-status">${item.learned ? '✅ Learned' : '📚 To Review'}</span>
          ${tagBadge}
          <span class="study-date">${new Date(item.savedAt).toLocaleDateString()}</span>
        </div>
        <div class="study-question">
          <h4>Question</h4>
          <p>${_escapeHtml(item.question)}</p>
        </div>
        ${showAnswer ? `
          <div class="study-answer">
            <h4>Correct Answer</h4>
            <p class="answer-text">${_escapeHtml(item.correctAnswer)}</p>
            <p class="answer-reason"><strong>Reason:</strong> ${_escapeHtml(item.reason)}</p>
          </div>
        ` : ''}
        <div class="study-notes">
          <h4>Your Notes</h4>
          <textarea class="notes-input" placeholder="Add your notes here...">${_escapeHtml(item.userNotes || '')}</textarea>
        </div>
        <div class="study-actions" style="display: flex; gap: 8px; margin-top: 16px;">
          ${!item.learned ? `<button class="button button-primary mark-learned" data-id="${item.id}">✅ Mark as Learned</button>` :
        `<button class="button button-secondary unmark-learned" data-id="${item.id}">↩️ Need More Review</button>`}
          <button class="button button-danger remove-study" data-id="${item.id}">🗑️ Remove</button>
        </div>
        <div class="study-meta">
          Reviewed ${item.reviewCount} time(s) ${item.lastReviewed ? `• Last: ${new Date(item.lastReviewed).toLocaleDateString()}` : ''}
        </div>
      </div>
    `;
  }

  // Render quiz card (hide answer initially)
  function renderQuizCard(item) {
    return `
      <div class="quiz-card" data-id="${item.id}">
        <div class="quiz-progress">Question ${currentQuizIndex + 1} of ${getItemsForReview().length}</div>
        <div class="quiz-question">
          <h3>${_escapeHtml(item.question)}</h3>
        </div>
        <div class="quiz-reveal">
          <button class="button button-primary reveal-answer">🔍 Reveal Answer</button>
        </div>
        <div class="quiz-answer hidden">
          <div class="answer-box">
            <h4>Answer</h4>
            <p>${_escapeHtml(item.correctAnswer)}</p>
            <p class="reason">${_escapeHtml(item.reason)}</p>
          </div>
          <div class="quiz-feedback">
            <p>Did you get it right?</p>
            <button class="button button-primary got-it" data-id="${item.id}">✅ Got it!</button>
            <button class="button button-secondary need-review" data-id="${item.id}">❌ Need more practice</button>
          </div>
        </div>
        <div class="quiz-nav">
          <button class="button button-secondary skip-question">Skip →</button>
        </div>
      </div>
    `;
  }

  // Render main study page
  async function renderStudyPage(container) {
    await loadStudyItems();
    const stats = getStats();
    const toReview = getItemsForReview();
    const learned = getLearnedItems();

    container.innerHTML = `
      <div class="study-page">
        <div class="study-stats">
          <div class="stat-card">
            <span class="stat-number">${stats.total}</span>
            <span class="stat-label">Total Saved</span>
          </div>
          <div class="stat-card pending">
            <span class="stat-number">${stats.pending}</span>
            <span class="stat-label">To Review</span>
          </div>
          <div class="stat-card learned">
            <span class="stat-number">${stats.learned}</span>
            <span class="stat-label">Learned</span>
          </div>
        </div>
        
        ${stats.pending > 0 ? `
          <div class="quiz-start">
            <button id="startQuizBtn" class="button button-primary" style="padding: 14px 28px; font-size: 16px;">🎯 Start Practice Quiz (${stats.pending} questions)</button>
          </div>
        ` : ''}
        
        <div class="study-tabs">
          <button class="study-tab active" data-tab="review">To Review (${stats.pending})</button>
          <button class="study-tab" data-tab="learned">Learned (${stats.learned})</button>
        </div>
        
        <div class="study-content">
          <div class="study-list" id="reviewList">
            ${toReview.length > 0 ? toReview.map(item => renderStudyCard(item)).join('') :
        '<p style="color: var(--secondary-text); text-align: center; padding: 40px;">No items to review. Great job! 🎉</p>'}
          </div>
          <div class="study-list hidden" id="learnedList">
            ${learned.length > 0 ? learned.map(item => renderStudyCard(item)).join('') :
        '<p style="color: var(--secondary-text); text-align: center; padding: 40px;">No learned items yet.</p>'}
          </div>
        </div>
      </div>
    `;

    // Event listeners
    attachEventListeners(container);
  }

  // Attach event listeners
  function attachEventListeners(container) {
    // Tab switching
    container.querySelectorAll('.study-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        container.querySelectorAll('.study-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');

        const tabName = e.target.dataset.tab;
        container.querySelector('#reviewList').classList.toggle('hidden', tabName !== 'review');
        container.querySelector('#learnedList').classList.toggle('hidden', tabName !== 'learned');
      });
    });

    // Mark as learned
    container.querySelectorAll('.mark-learned').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.target.dataset.id);
        await markAsLearned(id, true);
        renderStudyPage(container);
        UIModule.showToast('Well done!', 'Marked as learned.', 'success');
      });
    });

    // Unmark learned
    container.querySelectorAll('.unmark-learned').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.target.dataset.id);
        await markAsLearned(id, false);
        renderStudyPage(container);
      });
    });

    // Remove from study
    container.querySelectorAll('.remove-study').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.target.dataset.id);
        await removeFromStudy(id);
        renderStudyPage(container);
        UIModule.showToast('Removed', 'Item removed from study list.', 'info');
      });
    });

    // Save notes on blur
    container.querySelectorAll('.notes-input').forEach(textarea => {
      textarea.addEventListener('blur', async (e) => {
        const card = e.target.closest('.study-card');
        const id = parseInt(card.dataset.id);
        await updateNotes(id, e.target.value);
      });
    });

    // Start quiz
    container.querySelector('#startQuizBtn')?.addEventListener('click', () => {
      const items = startQuiz(true);
      if (items && items.length > 0) {
        renderQuizMode(container, items);
      }
    });
  }

  // Render quiz mode
  function renderQuizMode(container, items) {
    const item = items[currentQuizIndex];

    container.innerHTML = `
      <div class="quiz-mode">
        <div class="quiz-header">
          <h2>🎯 Practice Quiz</h2>
          <button id="exitQuizBtn" class="button button-secondary">Exit Quiz</button>
        </div>
        ${renderQuizCard(item)}
      </div>
    `;

    // Reveal answer
    container.querySelector('.reveal-answer')?.addEventListener('click', () => {
      container.querySelector('.quiz-reveal').classList.add('hidden');
      container.querySelector('.quiz-answer').classList.remove('hidden');
    });

    // Got it
    container.querySelector('.got-it')?.addEventListener('click', async () => {
      await markAsLearned(item.id, true);
      nextQuizQuestion(container, items);
    });

    // Need review
    container.querySelector('.need-review')?.addEventListener('click', async () => {
      item.reviewCount++;
      await saveStudyItems();
      nextQuizQuestion(container, items);
    });

    // Skip
    container.querySelector('.skip-question')?.addEventListener('click', () => {
      nextQuizQuestion(container, items);
    });

    // Exit
    container.querySelector('#exitQuizBtn')?.addEventListener('click', () => {
      quizMode = false;
      renderStudyPage(container);
    });
  }

  // Next quiz question
  function nextQuizQuestion(container, items) {
    currentQuizIndex++;
    if (currentQuizIndex < items.length) {
      renderQuizMode(container, items);
    } else {
      // Quiz complete
      quizMode = false;
      container.innerHTML = `
        <div class="quiz-complete">
          <h2>🎉 Quiz Complete!</h2>
          <p>You've reviewed all pending questions.</p>
          <button id="backToStudyBtn" class="button button-primary">Back to Study</button>
        </div>
      `;
      container.querySelector('#backToStudyBtn').addEventListener('click', () => {
        renderStudyPage(container);
      });
    }
  }

  // Initialize
  function initialize(elements) {
    ELS = elements;
    document.addEventListener('studyTabActivated', () => {
      if (ELS.studyContainer) {
        renderStudyPage(ELS.studyContainer);
      }
    });
  }

  return {
    initialize,
    loadStudyItems,
    addToStudy,
    removeFromStudy,
    markAsLearned,
    updateNotes,
    getItemsForReview,
    getLearnedItems,
    getStats,
    startQuiz,
    renderStudyPage,
    renderStudyCard
  };
})();
