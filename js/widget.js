// === Hafizh Rizqullah | GeminiAnswerBot ===
// 📄 js/widget.js
// 🕓 v5.0 - Floating Widget feature

const GeminiWidget = (() => {
    let widget = null;
    let isDragging = false;
    let isMinimized = false;
    let dragOffset = { x: 0, y: 0 };
    let position = { x: null, y: null };

    const WIDGET_ID = 'gemini-answer-widget';
    const STORAGE_KEY = 'widgetPosition';

    // Default position (bottom-right with padding)
    function getDefaultPosition() {
        return {
            x: window.innerWidth - 380,
            y: window.innerHeight - 500
        };
    }

    // Load saved position
    async function loadPosition() {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEY);
            if (data[STORAGE_KEY]) {
                position = data[STORAGE_KEY];
                // Validate position is still on screen
                if (position.x > window.innerWidth - 50) position.x = window.innerWidth - 380;
                if (position.y > window.innerHeight - 50) position.y = window.innerHeight - 500;
                if (position.x < 0) position.x = 20;
                if (position.y < 0) position.y = 20;
            } else {
                position = getDefaultPosition();
            }
        } catch {
            position = getDefaultPosition();
        }
    }

    // Save position
    async function savePosition() {
        try {
            await chrome.storage.local.set({ [STORAGE_KEY]: position });
        } catch (e) {
            console.log('Could not save widget position');
        }
    }

    // Create widget HTML
    function createWidgetHTML() {
        return `
      <div id="${WIDGET_ID}" class="gemini-widget ${isMinimized ? 'minimized' : ''}">
        <div class="widget-header" id="widget-drag-handle">
          <div class="widget-title">
            <img src="${chrome.runtime.getURL('assets/icon.png')}" alt="icon" class="widget-icon">
            <span>GeminiAnswerBot</span>
          </div>
          <div class="widget-controls">
            <button class="widget-btn" id="widget-minimize" title="Minimize">
              ${isMinimized ? '🔼' : '🔽'}
            </button>
            <button class="widget-btn" id="widget-close" title="Close">✕</button>
          </div>
        </div>
        
        <div class="widget-body" ${isMinimized ? 'style="display:none"' : ''}>
          <div class="widget-status" id="widget-status">
            <span class="status-text">Ready to scan</span>
          </div>
          
          <div class="widget-actions">
            <button class="widget-action-btn" id="widget-scan">
              🔍 Scan Quiz
            </button>
            <button class="widget-action-btn" id="widget-visual">
              📷 Visual Solve
            </button>
          </div>
          
          <div class="widget-content" id="widget-content">
            <!-- Answer will appear here -->
          </div>
          
          <div class="widget-footer">
            <button class="widget-footer-btn" id="widget-settings">⚙️ Settings</button>
            <button class="widget-footer-btn" id="widget-explain" disabled>💡 Explain</button>
          </div>
        </div>
      </div>
    `;
    }

    // Create widget CSS
    function injectStyles() {
        if (document.getElementById('gemini-widget-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'gemini-widget-styles';
        styles.textContent = `
      .gemini-widget {
        position: fixed;
        width: 360px;
        max-height: 480px;
        background: linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,252,0.98));
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 2147483647;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      
      .gemini-widget.minimized {
        max-height: 48px;
        width: 200px;
      }
      
      .gemini-widget.dragging {
        opacity: 0.9;
        cursor: grabbing;
      }
      
      .widget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        cursor: grab;
        user-select: none;
      }
      
      .widget-header:active {
        cursor: grabbing;
      }
      
      .widget-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 14px;
      }
      
      .widget-icon {
        width: 20px;
        height: 20px;
        border-radius: 4px;
      }
      
      .widget-controls {
        display: flex;
        gap: 4px;
      }
      
      .widget-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s;
      }
      
      .widget-btn:hover {
        background: rgba(255,255,255,0.3);
      }
      
      .widget-body {
        padding: 16px;
        max-height: 400px;
        overflow-y: auto;
      }
      
      .widget-status {
        padding: 8px 12px;
        background: #f0f9ff;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 13px;
        color: #0369a1;
      }
      
      .widget-status.loading {
        background: #fef3c7;
        color: #92400e;
      }
      
      .widget-status.success {
        background: #dcfce7;
        color: #166534;
      }
      
      .widget-status.error {
        background: #fee2e2;
        color: #991b1b;
      }
      
      .widget-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .widget-action-btn {
        flex: 1;
        padding: 10px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .widget-action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      
      .widget-action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      
      .widget-content {
        background: #f8fafc;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
        font-size: 13px;
        line-height: 1.6;
        max-height: 200px;
        overflow-y: auto;
      }
      
      .widget-content:empty {
        display: none;
      }
      
      .widget-content .answer-label {
        color: #667eea;
        font-weight: 600;
      }
      
      .widget-content .confidence-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        margin-left: 8px;
      }
      
      .widget-content .confidence-high { background: #dcfce7; color: #166534; }
      .widget-content .confidence-medium { background: #fef3c7; color: #92400e; }
      .widget-content .confidence-low { background: #fee2e2; color: #991b1b; }
      
      .widget-footer {
        display: flex;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;
      }
      
      .widget-footer-btn {
        flex: 1;
        padding: 8px;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        color: #475569;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .widget-footer-btn:hover:not(:disabled) {
        background: #e2e8f0;
        color: #1e293b;
      }
      
      .widget-footer-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      @media (prefers-color-scheme: dark) {
        .gemini-widget {
          background: linear-gradient(145deg, rgba(30,41,59,0.98), rgba(15,23,42,0.98));
          color: #e2e8f0;
        }
        .widget-status { background: #1e3a5f; color: #7dd3fc; }
        .widget-content { background: #1e293b; color: #e2e8f0; }
        .widget-footer { border-color: #334155; }
        .widget-footer-btn { background: #334155; border-color: #475569; color: #e2e8f0; }
      }
    `;
        document.head.appendChild(styles);
    }

    // Initialize dragging
    function initDrag() {
        const handle = widget.querySelector('#widget-drag-handle');

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('.widget-btn')) return;
            isDragging = true;
            widget.classList.add('dragging');
            dragOffset.x = e.clientX - widget.offsetLeft;
            dragOffset.y = e.clientY - widget.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            let newX = e.clientX - dragOffset.x;
            let newY = e.clientY - dragOffset.y;

            // Keep on screen
            newX = Math.max(0, Math.min(newX, window.innerWidth - widget.offsetWidth));
            newY = Math.max(0, Math.min(newY, window.innerHeight - widget.offsetHeight));

            widget.style.left = newX + 'px';
            widget.style.top = newY + 'px';

            position.x = newX;
            position.y = newY;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                widget.classList.remove('dragging');
                savePosition();
            }
        });
    }

    // Show widget
    async function show() {
        if (widget) return;

        await loadPosition();
        injectStyles();

        const container = document.createElement('div');
        container.innerHTML = createWidgetHTML();
        widget = container.firstElementChild;

        widget.style.left = position.x + 'px';
        widget.style.top = position.y + 'px';

        document.body.appendChild(widget);

        initDrag();
        attachEvents();
    }

    // Hide widget
    function hide() {
        if (widget) {
            widget.remove();
            widget = null;
        }
    }

    // Toggle minimize
    function toggleMinimize() {
        isMinimized = !isMinimized;
        widget.classList.toggle('minimized', isMinimized);
        widget.querySelector('#widget-minimize').textContent = isMinimized ? '🔼' : '🔽';
        widget.querySelector('.widget-body').style.display = isMinimized ? 'none' : '';
    }

    // Update status
    function setStatus(text, type = 'info') {
        const status = widget?.querySelector('#widget-status');
        if (status) {
            status.className = `widget-status ${type}`;
            status.querySelector('.status-text').textContent = text;
        }
    }

    // Set content
    function setContent(html) {
        const content = widget?.querySelector('#widget-content');
        if (content) {
            content.innerHTML = html;
        }
    }

    // Attach event listeners
    function attachEvents() {
        widget.querySelector('#widget-close').addEventListener('click', hide);
        widget.querySelector('#widget-minimize').addEventListener('click', toggleMinimize);

        widget.querySelector('#widget-scan').addEventListener('click', async () => {
            setStatus('Scanning page...', 'loading');
            // Send message to content script
            try {
                const response = await chrome.runtime.sendMessage({ action: 'widget-scan' });
                if (response?.success) {
                    setStatus('Answer found!', 'success');
                    setContent(response.answerHTML);
                } else {
                    setStatus('No quiz found', 'error');
                }
            } catch (e) {
                setStatus('Scan failed', 'error');
            }
        });

        widget.querySelector('#widget-visual').addEventListener('click', () => {
            setStatus('Visual solve not available in widget mode', 'info');
        });

        widget.querySelector('#widget-settings').addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'open-options' });
        });
    }

    // Toggle widget visibility
    function toggle() {
        if (widget) {
            hide();
        } else {
            show();
        }
    }

    // Check if widget is visible
    function isVisible() {
        return widget !== null;
    }

    return {
        show,
        hide,
        toggle,
        isVisible,
        setStatus,
        setContent,
        toggleMinimize
    };
})();

// Export for content script
if (typeof window !== 'undefined') {
    window.GeminiWidget = GeminiWidget;
}
