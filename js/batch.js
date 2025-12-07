// === Hafizh Rizqullah | GeminiAnswerBot ===
// 📄 js/batch.js
// 🕓 v5.0 - Multi-Tab Batch Mode feature

const BatchMode = (() => {
    let isRunning = false;
    let tabQueue = [];
    let results = [];
    let currentIndex = 0;
    let settings = {
        maxConcurrent: 3,
        delayBetweenTabs: 2000, // ms
        autoHighlight: true,
        autoClick: false
    };

    // Load batch settings
    async function loadSettings() {
        const data = await chrome.storage.sync.get('batchSettings');
        if (data.batchSettings) {
            settings = { ...settings, ...data.batchSettings };
        }
        return settings;
    }

    // Save batch settings
    async function saveSettings(newSettings) {
        settings = { ...settings, ...newSettings };
        await chrome.storage.sync.set({ batchSettings: settings });
    }

    // Get all quiz tabs
    async function scanForQuizTabs() {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const quizTabs = [];

        for (const tab of tabs) {
            if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                try {
                    // Try to detect if tab has quiz content
                    const response = await chrome.tabs.sendMessage(tab.id, { action: 'detect-quiz' }).catch(() => null);
                    if (response?.hasQuiz) {
                        quizTabs.push({
                            id: tab.id,
                            title: tab.title,
                            url: tab.url,
                            status: 'pending',
                            hasQuiz: true,
                            question: response.question || 'Quiz detected'
                        });
                    }
                } catch {
                    // Tab might not have content script
                }
            }
        }

        return quizTabs;
    }

    // Process single tab
    async function processTab(tab) {
        try {
            // Update status
            updateTabStatus(tab.id, 'processing');

            // Inject content script if needed
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['js/content.js']
            }).catch(() => { });

            // Wait a bit for injection
            await delay(500);

            // Send scan command
            const scanResult = await chrome.tabs.sendMessage(tab.id, { action: 'scan-quiz' });

            if (!scanResult?.success) {
                return {
                    tabId: tab.id,
                    success: false,
                    error: 'Failed to scan quiz'
                };
            }

            // Get answer from Gemini (via background)
            const answerResult = await chrome.runtime.sendMessage({
                action: 'batch-get-answer',
                content: scanResult.content,
                tabId: tab.id
            });

            if (!answerResult?.success) {
                return {
                    tabId: tab.id,
                    success: false,
                    error: answerResult?.error || 'Failed to get answer'
                };
            }

            // Highlight answer if enabled
            if (settings.autoHighlight) {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'highlight-answer',
                    answer: answerResult.answer
                }).catch(() => { });
            }

            // Auto-click if enabled
            if (settings.autoClick) {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'auto-click',
                    answer: answerResult.answer
                }).catch(() => { });
            }

            return {
                tabId: tab.id,
                success: true,
                answer: answerResult.answer,
                confidence: answerResult.confidence,
                question: scanResult.question
            };

        } catch (error) {
            return {
                tabId: tab.id,
                success: false,
                error: error.message
            };
        }
    }

    // Update tab status
    function updateTabStatus(tabId, status, data = {}) {
        const tab = tabQueue.find(t => t.id === tabId);
        if (tab) {
            tab.status = status;
            Object.assign(tab, data);
        }
        emitProgress();
    }

    // Emit progress update
    function emitProgress() {
        const event = new CustomEvent('batch-progress', {
            detail: {
                isRunning,
                total: tabQueue.length,
                completed: results.length,
                current: currentIndex,
                tabs: tabQueue,
                results: results
            }
        });
        document.dispatchEvent(event);
    }

    // Process queue with concurrency limit
    async function processQueue() {
        const pending = tabQueue.filter(t => t.status === 'pending');
        const processing = [];

        for (const tab of pending) {
            if (processing.length >= settings.maxConcurrent) {
                // Wait for one to complete
                await Promise.race(processing);
            }

            const promise = (async () => {
                const result = await processTab(tab);
                results.push(result);
                updateTabStatus(tab.id, result.success ? 'completed' : 'failed', result);

                // Delay between tabs
                await delay(settings.delayBetweenTabs);
            })();

            processing.push(promise);
            currentIndex++;
        }

        // Wait for all to complete
        await Promise.all(processing);
    }

    // Start batch processing
    async function start(selectedTabIds = null) {
        if (isRunning) return { success: false, error: 'Batch already running' };

        isRunning = true;
        results = [];
        currentIndex = 0;

        // Get tabs to process
        const allQuizTabs = await scanForQuizTabs();

        if (selectedTabIds) {
            tabQueue = allQuizTabs.filter(t => selectedTabIds.includes(t.id));
        } else {
            tabQueue = allQuizTabs;
        }

        if (tabQueue.length === 0) {
            isRunning = false;
            return { success: false, error: 'No quiz tabs found' };
        }

        emitProgress();

        try {
            await processQueue();
        } catch (error) {
            console.error('Batch error:', error);
        }

        isRunning = false;
        emitProgress();

        return {
            success: true,
            total: tabQueue.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    // Stop batch processing
    function stop() {
        isRunning = false;
        tabQueue.forEach(tab => {
            if (tab.status === 'pending') {
                tab.status = 'cancelled';
            }
        });
        emitProgress();
    }

    // Get current status
    function getStatus() {
        return {
            isRunning,
            total: tabQueue.length,
            completed: results.length,
            pending: tabQueue.filter(t => t.status === 'pending').length,
            tabs: tabQueue,
            results
        };
    }

    // Get summary
    function getSummary() {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        return {
            total: results.length,
            successful: successful.length,
            failed: failed.length,
            successRate: results.length > 0 ? Math.round((successful.length / results.length) * 100) : 0,
            results: results.map(r => ({
                tabId: r.tabId,
                success: r.success,
                answer: r.answer,
                confidence: r.confidence,
                error: r.error
            }))
        };
    }

    // Helper delay function
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Render batch UI - using existing design system
    function renderBatchUI(container) {
        container.innerHTML = `
      <!-- Batch Settings Card -->
      <p class="settings-group-description">Configure batch processing behavior.</p>
      <div class="settings-card">
        <div class="card-content">
          <div class="form-row">
            <label for="batchMaxConcurrent" class="form-row-label-static">Max Concurrent Tabs</label>
            <div class="form-row-control">
              <input type="number" id="batchMaxConcurrent" value="${settings.maxConcurrent}" min="1" max="10" style="width: 80px;">
            </div>
          </div>
          <div class="form-row">
            <label for="batchDelay" class="form-row-label-static">Delay Between Tabs (ms)</label>
            <div class="form-row-control">
              <input type="number" id="batchDelay" value="${settings.delayBetweenTabs}" min="500" max="10000" step="500" style="width: 100px;">
            </div>
          </div>
          <div class="form-row">
            <div class="form-row-label-stacked">
              <label for="batchAutoHighlight">Auto-Highlight Answers</label>
              <p class="form-hint">Automatically highlight correct answers on each tab.</p>
            </div>
            <div class="form-row-control">
              <label class="toggle-switch">
                <input type="checkbox" id="batchAutoHighlight" ${settings.autoHighlight ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="form-row">
            <div class="form-row-label-stacked">
              <label for="batchAutoClick">Auto-Click Answers</label>
              <p class="form-hint">Automatically click/select the correct answer.</p>
            </div>
            <div class="form-row-control">
              <label class="toggle-switch">
                <input type="checkbox" id="batchAutoClick" ${settings.autoClick ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Scanner Card -->
      <p class="settings-group-description">Detected quiz tabs in current window.</p>
      <div class="settings-card">
        <div class="card-content" style="padding: 0;">
          <div id="batchTabList" style="max-height: 300px; overflow-y: auto; padding: 16px;">
            <p style="color: var(--secondary-text); text-align: center; padding: 20px 0;">Click "Scan Tabs" to detect quiz pages.</p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions" style="justify-content: flex-start; gap: 12px;">
        <button id="batchScanBtn" class="button button-secondary">🔍 Scan Tabs</button>
        <button id="batchStartBtn" class="button button-primary" disabled>▶️ Start Batch</button>
        <button id="batchStopBtn" class="button button-danger" disabled>⏹️ Stop</button>
        <button id="batchSaveSettings" class="button button-secondary" style="margin-left: auto;">💾 Save Settings</button>
      </div>

      <!-- Progress -->
      <div class="settings-card hidden" id="batchProgress" style="margin-top: 16px;">
        <div class="card-content">
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <p class="progress-text" style="text-align: center; margin-top: 8px; color: var(--secondary-text);">0 / 0 completed</p>
        </div>
      </div>

      <!-- Results -->
      <div class="settings-card hidden" id="batchResults" style="margin-top: 16px;">
        <div class="card-header"><h2>Results</h2></div>
        <div class="card-content">
          <div class="results-summary" style="font-weight: 500; margin-bottom: 12px;"></div>
          <div class="results-list"></div>
        </div>
      </div>
    `;

        attachBatchEvents(container);
    }

    // Scan and display tabs
    async function scanAndDisplayTabs(container) {
        const tabList = container.querySelector('#batchTabList');
        tabList.innerHTML = '<p class="loading">Scanning...</p>';

        const tabs = await scanForQuizTabs();

        if (tabs.length === 0) {
            tabList.innerHTML = '<p class="empty">No quiz tabs found. Open some quiz pages and try again.</p>';
            return;
        }

        tabList.innerHTML = tabs.map(tab => `
      <div class="batch-tab-item" data-tab-id="${tab.id}">
        <input type="checkbox" class="tab-checkbox" checked>
        <span class="tab-title">${_escapeHtml(tab.title)}</span>
        <span class="tab-status status-${tab.status}">${tab.status}</span>
      </div>
    `).join('');

        container.querySelector('#batchStartBtn').disabled = false;
    }

    // Attach batch events
    function attachBatchEvents(container) {
        container.querySelector('#batchScanBtn').addEventListener('click', () => scanAndDisplayTabs(container));

        container.querySelector('#batchSaveSettings').addEventListener('click', async () => {
            await saveSettings({
                maxConcurrent: parseInt(container.querySelector('#batchMaxConcurrent').value),
                delayBetweenTabs: parseInt(container.querySelector('#batchDelay').value),
                autoHighlight: container.querySelector('#batchAutoHighlight').checked,
                autoClick: container.querySelector('#batchAutoClick').checked
            });
            UIModule?.showToast?.('Saved', 'Batch settings saved.', 'success');
        });

        container.querySelector('#batchStartBtn').addEventListener('click', async () => {
            const selectedIds = Array.from(container.querySelectorAll('.tab-checkbox:checked'))
                .map(cb => parseInt(cb.closest('.batch-tab-item').dataset.tabId));

            container.querySelector('#batchProgress').classList.remove('hidden');
            container.querySelector('#batchStartBtn').disabled = true;
            container.querySelector('#batchStopBtn').disabled = false;

            const result = await start(selectedIds);

            container.querySelector('#batchStopBtn').disabled = true;
            displayResults(container, result);
        });

        container.querySelector('#batchStopBtn').addEventListener('click', stop);

        // Listen for progress updates
        document.addEventListener('batch-progress', (e) => {
            const { total, completed, tabs } = e.detail;
            const progress = total > 0 ? (completed / total) * 100 : 0;

            container.querySelector('.progress-fill').style.width = progress + '%';
            container.querySelector('.progress-text').textContent = `${completed} / ${total} completed`;

            // Update tab statuses
            tabs.forEach(tab => {
                const item = container.querySelector(`[data-tab-id="${tab.id}"] .tab-status`);
                if (item) {
                    item.className = `tab-status status-${tab.status}`;
                    item.textContent = tab.status;
                }
            });
        });
    }

    // Display results
    function displayResults(container, result) {
        const resultsDiv = container.querySelector('#batchResults');
        resultsDiv.classList.remove('hidden');

        resultsDiv.querySelector('.results-summary').innerHTML = `
      <p>✅ Successful: ${result.successful} | ❌ Failed: ${result.failed} | Total: ${result.total}</p>
    `;

        resultsDiv.querySelector('.results-list').innerHTML = result.results.map(r => `
      <div class="result-item ${r.success ? 'success' : 'failed'}">
        <span class="result-status">${r.success ? '✅' : '❌'}</span>
        <span class="result-answer">${r.success ? _escapeHtml(r.answer || 'Answered') : _escapeHtml(r.error || 'Failed')}</span>
      </div>
    `).join('');
    }

    return {
        start,
        stop,
        getStatus,
        getSummary,
        loadSettings,
        saveSettings,
        scanForQuizTabs,
        renderBatchUI
    };
})();

// Export
if (typeof window !== 'undefined') {
    window.BatchMode = BatchMode;
}
