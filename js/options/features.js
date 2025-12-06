// === GeminiAnswerBot v4.0 Features Settings ===
// Author: Hafizh Rizqullah
// File: js/options/features.js
// Purpose: Handle v4.0 feature settings (auto-click, display mode, language, context memory, themes)

const FeaturesModule = (() => {
  const DEFAULT_FEATURE_SETTINGS = {
    autoClickEnabled: false,
    displayMode: 'popup',
    responseLanguage: 'auto',
    enableContextMemory: true,
    contextMemoryLimit: 5,
    theme: {
      preset: 'default',
      accentColor: '#1a73e8',
      mode: 'auto'
    }
  };

  // Theme preset color schemes
  const THEME_PRESETS = {
    default: { accent: '#1a73e8' },
    ocean: { accent: '#0891b2' },
    sunset: { accent: '#f97316' },
    neon: { accent: '#a855f7' },
    midnight: { accent: '#6366f1' }
  };

  let featuresPane = null;
  let appearancePane = null;

  /**
   * Helper: Switch tab (consistent with NavModule)
   */
  function switchTab(targetId) {
    // Update nav links
    document.querySelectorAll('.settings-sidebar a').forEach(navLink => {
      const isActive = navLink.getAttribute('href') === `#${targetId}`;
      navLink.classList.toggle('active', isActive);
    });
    // Update content panes
    document.querySelectorAll('.content-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === targetId);
    });
    window.location.hash = targetId;
  }

  /**
   * Create the Features settings pane HTML
   */
  function createFeaturesPane() {
    const pane = document.createElement('div');
    pane.id = 'features';
    pane.className = 'content-pane';
    pane.innerHTML = `
      <div class="pane-header-main">
        <h1>Features</h1>
        <p class="section-description">Configure advanced automation and intelligence features.</p>
      </div>

      <p class="settings-group-description">Quiz automation settings.</p>
      <div class="settings-card">
        <div class="card-content">
          <div class="form-row">
            <div class="form-row-label-stacked">
              <label for="autoClickToggle">Auto-Click Answer</label>
              <p class="form-hint">Automatically select/click the correct answer on the page after analysis.</p>
            </div>
            <div class="form-row-control">
              <label class="toggle-switch">
                <input type="checkbox" id="autoClickToggle">
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="form-row">
            <div class="form-row-label-stacked">
              <label for="contextMemoryToggle">Context Memory</label>
              <p class="form-hint">Remember previous questions to provide better context for multi-question quizzes.</p>
            </div>
            <div class="form-row-control">
              <label class="toggle-switch">
                <input type="checkbox" id="contextMemoryToggle" checked>
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <p class="settings-group-description">Display and language preferences.</p>
      <div class="settings-card">
        <div class="card-content">
          <div class="form-row">
            <label for="displayModeSelect" class="form-row-label-static">Display Mode</label>
            <div class="form-row-control">
              <select id="displayModeSelect">
                <option value="popup">Popup (Default)</option>
                <option value="widget">Floating Widget</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <label for="languageSelect" class="form-row-label-static">Response Language</label>
            <div class="form-row-control">
              <select id="languageSelect">
                <option value="auto">Auto-detect (match page language)</option>
                <option value="en">English</option>
                <option value="id">Indonesian</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <p class="settings-group-description">Batch processing for multi-question pages.</p>
      <div class="settings-card">
        <div class="card-content">
          <div class="form-row">
            <div class="form-row-label-stacked">
              <label for="batchModeToggle">Batch Quiz Mode</label>
              <p class="form-hint">Enable "Solve All" button to answer all questions on a page at once.</p>
            </div>
            <div class="form-row-control">
              <label class="toggle-switch">
                <input type="checkbox" id="batchModeToggle">
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="form-row">
            <div class="form-row-label-stacked">
              <label for="confidenceScoreToggle">Show Confidence Score</label>
              <p class="form-hint">Display AI's confidence level (0-100%) for each answer.</p>
            </div>
            <div class="form-row-control">
              <label class="toggle-switch">
                <input type="checkbox" id="confidenceScoreToggle" checked>
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <p class="settings-group-description">Learning and review features.</p>
      <div class="settings-card">
        <div class="card-content">
          <div class="form-row">
            <div class="form-row-label-stacked">
              <label for="learningModeToggle">Smart Learning Mode</label>
              <p class="form-hint">Track wrong answers and create a personal study guide.</p>
            </div>
            <div class="form-row-control">
              <label class="toggle-switch">
                <input type="checkbox" id="learningModeToggle">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
    return pane;
  }

  /**
   * Create the Appearance settings pane HTML
   */
  function createAppearancePane() {
    const pane = document.createElement('div');
    pane.id = 'appearance';
    pane.className = 'content-pane';
    pane.innerHTML = `
      <div class="pane-header-main">
        <h1>Appearance</h1>
        <p class="section-description">Customize the look and feel of the extension.</p>
      </div>

      <p class="settings-group-description">Choose a theme preset or customize colors.</p>
      <div class="settings-card">
        <div class="card-content">
          <div class="form-row">
            <label for="themePresetSelect" class="form-row-label-static">Theme Preset</label>
            <div class="form-row-control">
              <select id="themePresetSelect">
                <option value="default">Default</option>
                <option value="ocean">Ocean</option>
                <option value="sunset">Sunset</option>
                <option value="neon">Neon</option>
                <option value="midnight">Midnight</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <label for="themeModeSelect" class="form-row-label-static">Color Mode</label>
            <div class="form-row-control">
              <select id="themeModeSelect">
                <option value="auto">Auto (follow system)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <label for="accentColorPicker" class="form-row-label-static">Accent Color</label>
            <div class="form-row-control">
              <div class="color-picker-wrapper" style="display: flex; align-items: center; gap: 12px;">
                <input type="color" id="accentColorPicker" value="#1a73e8" style="width: 50px; height: 36px; border: none; border-radius: 8px; cursor: pointer;">
                <span id="accentColorValue" class="color-value" style="font-family: monospace; color: var(--secondary-text);">#1a73e8</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button id="resetThemeButton" class="button button-secondary">Reset to Default</button>
      </div>
    `;
    return pane;
  }

  /**
   * Add nav items to sidebar WITH click handlers
   */
  function addNavItems() {
    const sidebar = document.querySelector('.settings-sidebar ul');
    if (!sidebar) return;

    // Find the prompts nav item to insert before it
    const promptsNavItem = sidebar.querySelector('a[href="#prompts"]')?.parentElement;
    if (!promptsNavItem) return;

    // Create Features nav item
    const featuresNavItem = document.createElement('li');
    featuresNavItem.innerHTML = `
      <a href="#features">
        <span class="sidebar-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M19 17v4"/><path d="M17 19h4"/></svg></span>
        Features
      </a>
    `;

    // Create Appearance nav item
    const appearanceNavItem = document.createElement('li');
    appearanceNavItem.innerHTML = `
      <a href="#appearance">
        <span class="sidebar-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg></span>
        Appearance
      </a>
    `;

    // Insert before prompts
    sidebar.insertBefore(featuresNavItem, promptsNavItem);
    sidebar.insertBefore(appearanceNavItem, promptsNavItem);

    // **FIX**: Add click handlers to new nav items
    const featuresLink = featuresNavItem.querySelector('a');
    const appearanceLink = appearanceNavItem.querySelector('a');

    featuresLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('features');
    });

    appearanceLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('appearance');
    });
  }

  /**
   * Add panes to content area
   */
  function addPanes() {
    const content = document.querySelector('.settings-content');
    if (!content) return;

    // Find the prompts pane to insert before it
    const promptsPane = document.getElementById('prompts');
    if (!promptsPane) return;

    featuresPane = createFeaturesPane();
    appearancePane = createAppearancePane();

    content.insertBefore(featuresPane, promptsPane);
    content.insertBefore(appearancePane, promptsPane);
  }

  /**
   * Load current settings into UI
   */
  async function loadSettings() {
    const settings = await StorageManager.get([
      'autoClickEnabled',
      'displayMode',
      'responseLanguage',
      'enableContextMemory',
      'batchModeEnabled',
      'confidenceScoreEnabled',
      'learningModeEnabled',
      'theme'
    ]);

    // Features
    const autoClickToggle = document.getElementById('autoClickToggle');
    const contextMemoryToggle = document.getElementById('contextMemoryToggle');
    const displayModeSelect = document.getElementById('displayModeSelect');
    const languageSelect = document.getElementById('languageSelect');
    const batchModeToggle = document.getElementById('batchModeToggle');
    const confidenceScoreToggle = document.getElementById('confidenceScoreToggle');
    const learningModeToggle = document.getElementById('learningModeToggle');

    if (autoClickToggle) autoClickToggle.checked = settings.autoClickEnabled ?? false;
    if (contextMemoryToggle) contextMemoryToggle.checked = settings.enableContextMemory ?? true;
    if (displayModeSelect) displayModeSelect.value = settings.displayMode ?? 'popup';
    if (languageSelect) languageSelect.value = settings.responseLanguage ?? 'auto';
    if (batchModeToggle) batchModeToggle.checked = settings.batchModeEnabled ?? false;
    if (confidenceScoreToggle) confidenceScoreToggle.checked = settings.confidenceScoreEnabled ?? true;
    if (learningModeToggle) learningModeToggle.checked = settings.learningModeEnabled ?? false;

    // Appearance
    const theme = settings.theme ?? DEFAULT_FEATURE_SETTINGS.theme;
    const themePresetSelect = document.getElementById('themePresetSelect');
    const themeModeSelect = document.getElementById('themeModeSelect');
    const accentColorPicker = document.getElementById('accentColorPicker');
    const accentColorValue = document.getElementById('accentColorValue');

    if (themePresetSelect) themePresetSelect.value = theme.preset ?? 'default';
    if (themeModeSelect) themeModeSelect.value = theme.mode ?? 'auto';
    if (accentColorPicker) accentColorPicker.value = theme.accentColor ?? '#1a73e8';
    if (accentColorValue) accentColorValue.textContent = theme.accentColor ?? '#1a73e8';
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Auto-save toggles
    const autoClickToggle = document.getElementById('autoClickToggle');
    const contextMemoryToggle = document.getElementById('contextMemoryToggle');
    const displayModeSelect = document.getElementById('displayModeSelect');
    const languageSelect = document.getElementById('languageSelect');
    const batchModeToggle = document.getElementById('batchModeToggle');
    const confidenceScoreToggle = document.getElementById('confidenceScoreToggle');
    const learningModeToggle = document.getElementById('learningModeToggle');

    autoClickToggle?.addEventListener('change', async (e) => {
      await StorageManager.set({ autoClickEnabled: e.target.checked });
      UIModule.showToast('Setting Saved', `Auto-Click has been ${e.target.checked ? 'enabled' : 'disabled'}.`, 'success');
    });

    contextMemoryToggle?.addEventListener('change', async (e) => {
      await StorageManager.set({ enableContextMemory: e.target.checked });
      UIModule.showToast('Setting Saved', `Context Memory has been ${e.target.checked ? 'enabled' : 'disabled'}.`, 'success');
    });

    displayModeSelect?.addEventListener('change', async (e) => {
      await StorageManager.set({ displayMode: e.target.value });
      UIModule.showToast('Setting Saved', `Display Mode set to ${e.target.value}.`, 'success');
    });

    languageSelect?.addEventListener('change', async (e) => {
      await StorageManager.set({ responseLanguage: e.target.value });
      UIModule.showToast('Setting Saved', `Response Language set to ${e.target.options[e.target.selectedIndex].text}.`, 'success');
    });

    batchModeToggle?.addEventListener('change', async (e) => {
      await StorageManager.set({ batchModeEnabled: e.target.checked });
      UIModule.showToast('Setting Saved', `Batch Mode has been ${e.target.checked ? 'enabled' : 'disabled'}.`, 'success');
    });

    confidenceScoreToggle?.addEventListener('change', async (e) => {
      await StorageManager.set({ confidenceScoreEnabled: e.target.checked });
      UIModule.showToast('Setting Saved', `Confidence Score has been ${e.target.checked ? 'enabled' : 'disabled'}.`, 'success');
    });

    learningModeToggle?.addEventListener('change', async (e) => {
      await StorageManager.set({ learningModeEnabled: e.target.checked });
      UIModule.showToast('Setting Saved', `Learning Mode has been ${e.target.checked ? 'enabled' : 'disabled'}.`, 'success');
    });

    // Appearance
    const themePresetSelect = document.getElementById('themePresetSelect');
    const themeModeSelect = document.getElementById('themeModeSelect');
    const accentColorPicker = document.getElementById('accentColorPicker');
    const accentColorValue = document.getElementById('accentColorValue');
    const resetThemeButton = document.getElementById('resetThemeButton');

    const saveTheme = async () => {
      const theme = {
        preset: themePresetSelect?.value ?? 'default',
        mode: themeModeSelect?.value ?? 'auto',
        accentColor: accentColorPicker?.value ?? '#1a73e8'
      };
      await StorageManager.set({ theme });
      applyTheme(theme);
      UIModule.showToast('Theme Saved', 'Your appearance settings have been saved.', 'success');
    };

    themePresetSelect?.addEventListener('change', saveTheme);
    themeModeSelect?.addEventListener('change', saveTheme);
    accentColorPicker?.addEventListener('input', (e) => {
      if (accentColorValue) accentColorValue.textContent = e.target.value;
    });
    accentColorPicker?.addEventListener('change', saveTheme);

    resetThemeButton?.addEventListener('click', async () => {
      const defaultTheme = DEFAULT_FEATURE_SETTINGS.theme;
      await StorageManager.set({ theme: defaultTheme });
      if (themePresetSelect) themePresetSelect.value = defaultTheme.preset;
      if (themeModeSelect) themeModeSelect.value = defaultTheme.mode;
      if (accentColorPicker) accentColorPicker.value = defaultTheme.accentColor;
      if (accentColorValue) accentColorValue.textContent = defaultTheme.accentColor;
      applyTheme(defaultTheme);
      UIModule.showToast('Theme Reset', 'Appearance has been reset to default.', 'success');
    });
  }

  /**
   * Apply theme to document with presets
   */
  function applyTheme(theme) {
    const root = document.documentElement;
    const preset = THEME_PRESETS[theme.preset] || THEME_PRESETS.default;

    // Apply accent color - use preset if using a preset theme, otherwise custom
    const accentColor = theme.preset === 'default' ? theme.accentColor : preset.accent;
    root.style.setProperty('--accent-color', accentColor);
    root.style.setProperty('--primary-color', accentColor);

    // Apply color mode
    if (theme.mode === 'dark') {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else if (theme.mode === 'light') {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    } else {
      document.body.classList.remove('dark-mode', 'light-mode');
    }

    console.log('[Theme] Applied:', theme.preset, accentColor, theme.mode);
  }

  /**
   * Initialize the module
   */
  async function initialize() {
    addNavItems();
    addPanes();
    await loadSettings();
    bindEvents();

    // Apply current theme
    const { theme } = await StorageManager.get('theme');
    if (theme) applyTheme(theme);
  }

  return {
    initialize
  };
})();
