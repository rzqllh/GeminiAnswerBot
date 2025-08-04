// === Hafizh Rizqullah | GeminiAnswerBot ===
// 🔒 Created by Hafizh Rizqullah || Refine by AI Assistant
// 📄 js/options.js
// 🕓 Created: 2024-05-22 10:20:00
// 🧠 Modular | DRY | SOLID | Apple HIG Compliant

document.addEventListener('DOMContentLoaded', function() {
    // Peta Elemen DOM (Single Source of Truth)
    const ELS = {
        // Navigasi & Konten
        navLinks: document.querySelectorAll('.settings-sidebar a'),
        contentPanes: document.querySelectorAll('.content-pane'),
        
        // Pengaturan Umum
        saveGeneralButton: document.getElementById('saveGeneralButton'),
        testButton: document.getElementById('testButton'),
        apiKeyInput: document.getElementById('apiKey'),
        revealApiKey: document.getElementById('revealApiKey'),
        modelSelect: document.getElementById('modelSelect'),
        responseToneSelect: document.getElementById('responseToneSelect'),
        autoHighlightToggle: document.getElementById('autoHighlightToggle'),
        preSubmissionCheckToggle: document.getElementById('preSubmissionCheckToggle'),
        temperatureSlider: document.getElementById('temperatureSlider'),
        temperatureValue: document.getElementById('temperatureValue'),
        
        // Riwayat
        historyListContainer: document.getElementById('history-list-container'),
        clearHistoryButton: document.getElementById('clearHistoryButton'),
        exportHistoryButton: document.getElementById('exportHistoryButton'),
        
        // Data
        resetSettingsButton: document.getElementById('resetSettingsButton'),

        // Prompts & Profil
        profileSelect: document.getElementById('profileSelect'),
        newProfileBtn: document.getElementById('newProfileBtn'),
        renameProfileBtn: document.getElementById('renameProfileBtn'),
        deleteProfileBtn: document.getElementById('deleteProfileBtn'),
        savePromptsButton: document.getElementById('savePromptsButton'),
        promptResetButtons: document.querySelectorAll('.prompt-reset-btn')
    };

    // Peta Textarea Prompt
    const PROMPT_TEXTAREAS = {
        cleaning: document.getElementById('cleaningPrompt'),
        answer: document.getElementById('answerPrompt'),
        explanation: document.getElementById('explanationPrompt'),
        summarize: document.getElementById('summarizePrompt'),
        translate: document.getElementById('translatePrompt'),
        rephrase: document.getElementById('rephrasePrompt')
    };

    // Peta Slider Temperatur Prompt
    const PROMPT_TEMP_SLIDERS = {
        answer: document.getElementById('answer_temp_slider'),
        explanation: document.getElementById('explanation_temp_slider'),
        summarize: document.getElementById('summarize_temp_slider'),
        translate: document.getElementById('translate_temp_slider'),
        rephrase: document.getElementById('rephrase_temp_slider')
    };

    const REPHRASE_LANGUAGES_INPUT = document.getElementById('rephraseLanguages');
    
    // Inisialisasi semua modul
    NavModule.initialize(ELS);
    HistoryModule.initialize(ELS);
    SettingsModule.initialize(ELS, PROMPT_TEXTAREAS, PROMPT_TEMP_SLIDERS, REPHRASE_LANGUAGES_INPUT);
});