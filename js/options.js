// === Hafizh Signature Code ===
// Author: Hafizh Rizqullah — GeminiAnswerBot
// File: js/options.js
// Updated: v5.0 with all new module initialization

document.addEventListener('DOMContentLoaded', async function () {
    // Peta Textarea Prompt
    const PROMPT_TEXTAREAS = {
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

    try {
        // IMPORTANT: Initialize FeaturesModule FIRST because it dynamically creates panes
        if (typeof FeaturesModule !== 'undefined') {
            await FeaturesModule.initialize();
        }

        // Now get all DOM elements AFTER FeaturesModule has added its panes
        const ELS = {
            // Navigasi & Konten - must be re-queried after FeaturesModule
            navLinks: document.querySelectorAll('.settings-sidebar a'),
            contentPanes: document.querySelectorAll('.content-pane'),

            // Pengaturan Umum
            saveGeneralButton: document.getElementById('saveGeneralButton'),
            testButton: document.getElementById('testButton'),
            apiKeyInput: document.getElementById('apiKey'),
            revealApiKey: document.getElementById('revealApiKey'),
            modelSelect: document.getElementById('modelSelect'),
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
            debugModeToggle: document.getElementById('debugModeToggle'),

            // Prompts & Profil
            profileSelect: document.getElementById('profileSelect'),
            newProfileBtn: document.getElementById('newProfileBtn'),
            renameProfileBtn: document.getElementById('renameProfileBtn'),
            deleteProfileBtn: document.getElementById('deleteProfileBtn'),
            savePromptsButton: document.getElementById('savePromptsButton'),
            promptResetButtons: document.querySelectorAll('.prompt-reset-btn'),

            // v5.0: Study containers
            studyContainer: document.getElementById('study-container'),
            personaSelectorContainer: document.getElementById('persona-selector-container'),
            personaEditorContainer: document.getElementById('persona-editor-container'),
            batchContainer: document.getElementById('batch-container')
        };

        // Initialize navigation (now has all panes including Features/Appearance)
        NavModule.initialize(ELS);

        // Initialize history module
        HistoryModule.initialize(ELS);

        // Initialize core settings
        await SettingsModule.initialize(ELS, PROMPT_TEXTAREAS, PROMPT_TEMP_SLIDERS, REPHRASE_LANGUAGES_INPUT);

        // v5.0: Initialize Tags module
        if (typeof TagsModule !== 'undefined') {
            await TagsModule.initialize();
        }

        // v5.0: Initialize Personas module
        if (typeof PersonasModule !== 'undefined') {
            await PersonasModule.initialize();
            if (ELS.personaSelectorContainer) {
                PersonasModule.renderPersonaSelector('persona-selector-container');
            }
            if (ELS.personaEditorContainer) {
                PersonasModule.renderPersonaEditor(ELS.personaEditorContainer);
            }
        }

        // v5.0: Initialize Study module
        if (typeof StudyModule !== 'undefined') {
            StudyModule.initialize(ELS);
            if (ELS.studyContainer) {
                StudyModule.renderStudyPage(ELS.studyContainer);
            }
        }

        // v5.0: Initialize Batch module
        if (typeof BatchMode !== 'undefined' && ELS.batchContainer) {
            BatchMode.renderBatchUI(ELS.batchContainer);
        }

        console.log('✅ All modules initialized successfully');

    } catch (error) {
        console.error("Failed to initialize settings:", error);
        if (typeof UIModule !== 'undefined') {
            UIModule.showToast('Initialization Error', 'Could not load settings. Check the console for details.', 'error');
        }
    }
});