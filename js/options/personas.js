// === Hafizh Rizqullah | GeminiAnswerBot ===
// 📄 js/options/personas.js
// 🕓 v5.0 - Custom AI Personas feature

const PersonasModule = (() => {
    // Default personas
    const DEFAULT_PERSONAS = [
        {
            id: 'default',
            name: 'Default Assistant',
            icon: '🤖',
            description: 'Balanced, helpful responses with clear explanations.',
            systemPrompt: 'You are a helpful assistant that provides accurate answers with clear, concise explanations.',
            tone: 'balanced',
            isDefault: true
        },
        {
            id: 'strict-teacher',
            name: 'Strict Teacher',
            icon: '👨‍🏫',
            description: 'Direct answers, formal tone, minimal explanation.',
            systemPrompt: 'You are a strict but fair teacher. Give direct answers with minimal explanation. Be formal and to the point. Do not add unnecessary commentary.',
            tone: 'formal',
            isDefault: true
        },
        {
            id: 'friendly-tutor',
            name: 'Friendly Tutor',
            icon: '🤗',
            description: 'Warm, encouraging, explains concepts simply.',
            systemPrompt: 'You are a friendly and patient tutor. Explain concepts clearly using simple language. Be encouraging and supportive. Use analogies when helpful.',
            tone: 'casual',
            isDefault: true
        },
        {
            id: 'exam-coach',
            name: 'Exam Coach',
            icon: '🎯',
            description: 'Speed-focused, answer first, brief reasoning.',
            systemPrompt: 'You are an exam preparation coach focused on speed and accuracy. Always give the answer first, then a brief one-sentence reason. No extra commentary. Be efficient.',
            tone: 'concise',
            isDefault: true
        },
        {
            id: 'deep-explainer',
            name: 'Deep Explainer',
            icon: '🔬',
            description: 'Thorough explanations with real-world examples.',
            systemPrompt: 'You are an educator who provides thorough, in-depth explanations. Connect concepts to real-world applications. Use examples and analogies. Help the learner truly understand.',
            tone: 'educational',
            isDefault: true
        },
        {
            id: 'quick-answer',
            name: 'Quick Answer',
            icon: '⚡',
            description: 'Just the answer, nothing else.',
            systemPrompt: 'Give only the answer. No explanation, no reasoning, just the direct answer. Be extremely brief.',
            tone: 'minimal',
            isDefault: true
        }
    ];

    let allPersonas = [];
    let activePersonaId = 'default';

    // Load personas from storage
    async function loadPersonas() {
        const data = await StorageManager.get(['customPersonas', 'activePersonaId']);
        const customPersonas = data.customPersonas || [];
        activePersonaId = data.activePersonaId || 'default';
        allPersonas = [...DEFAULT_PERSONAS, ...customPersonas];
        return allPersonas;
    }

    // Save custom personas
    async function savePersonas(customPersonas) {
        await StorageManager.set({ customPersonas });
        allPersonas = [...DEFAULT_PERSONAS, ...customPersonas];
    }

    // Get active persona
    async function getActivePersona() {
        if (allPersonas.length === 0) await loadPersonas();
        return allPersonas.find(p => p.id === activePersonaId) || DEFAULT_PERSONAS[0];
    }

    // Set active persona
    async function setActivePersona(personaId) {
        activePersonaId = personaId;
        await StorageManager.set({ activePersonaId });
    }

    // Get persona by ID
    function getPersona(personaId) {
        return allPersonas.find(p => p.id === personaId) || DEFAULT_PERSONAS[0];
    }

    // Get all personas
    function getAllPersonas() {
        return allPersonas;
    }

    // Create new custom persona
    async function createPersona({ name, icon, description, systemPrompt, tone }) {
        const id = 'custom_' + Date.now();
        const newPersona = {
            id,
            name,
            icon: icon || '🎭',
            description: description || 'Custom persona',
            systemPrompt,
            tone: tone || 'custom',
            isCustom: true
        };

        const data = await StorageManager.get('customPersonas');
        const customPersonas = data.customPersonas || [];
        customPersonas.push(newPersona);

        await savePersonas(customPersonas);
        return newPersona;
    }

    // Update custom persona
    async function updatePersona(personaId, updates) {
        if (!personaId.startsWith('custom_')) {
            return false; // Can't edit default personas
        }

        const data = await StorageManager.get('customPersonas');
        const customPersonas = data.customPersonas || [];
        const index = customPersonas.findIndex(p => p.id === personaId);

        if (index >= 0) {
            customPersonas[index] = { ...customPersonas[index], ...updates };
            await savePersonas(customPersonas);
            return true;
        }
        return false;
    }

    // Delete custom persona
    async function deletePersona(personaId) {
        if (!personaId.startsWith('custom_')) {
            return false; // Can't delete default personas
        }

        const data = await StorageManager.get('customPersonas');
        const customPersonas = (data.customPersonas || []).filter(p => p.id !== personaId);
        await savePersonas(customPersonas);

        // Reset to default if deleted persona was active
        if (activePersonaId === personaId) {
            await setActivePersona('default');
        }

        return true;
    }

    // Build system prompt for API call
    function buildSystemPrompt(basePrompt, persona) {
        const p = persona || getPersona(activePersonaId);
        return `${p.systemPrompt}\n\n${basePrompt}`;
    }

    // Render persona selector
    function renderPersonaSelector(containerId, onSelect) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
      <div class="persona-selector">
        <label>AI Persona</label>
        <div class="persona-grid">
          ${allPersonas.map(p => `
            <div class="persona-card ${p.id === activePersonaId ? 'active' : ''}" data-persona="${p.id}">
              <span class="persona-icon">${p.icon}</span>
              <span class="persona-name">${p.name}</span>
              <span class="persona-desc">${p.description}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

        container.innerHTML = html;

        container.querySelectorAll('.persona-card').forEach(card => {
            card.addEventListener('click', async (e) => {
                const personaId = card.dataset.persona;
                await setActivePersona(personaId);

                container.querySelectorAll('.persona-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                if (onSelect) onSelect(getPersona(personaId));
                UIModule.showToast('Persona Changed', `Now using ${getPersona(personaId).name}`, 'success');
            });
        });
    }

    // Render persona editor (for creating/editing custom personas)
    function renderPersonaEditor(container, persona = null) {
        const isEdit = persona && persona.isCustom;

        container.innerHTML = `
      <div class="persona-editor">
        <div class="form-row">
          <label for="personaIcon" class="form-row-label-static">Icon (emoji)</label>
          <div class="form-row-control">
            <input type="text" id="personaIcon" value="${persona?.icon || '🎭'}" maxlength="2" style="width: 60px; text-align: center; font-size: 24px;">
          </div>
        </div>
        <div class="form-row">
          <label for="personaName" class="form-row-label-static">Name</label>
          <div class="form-row-control">
            <input type="text" id="personaName" value="${persona?.name || ''}" placeholder="My Persona" maxlength="30">
          </div>
        </div>
        <div class="form-row">
          <label for="personaDesc" class="form-row-label-static">Description</label>
          <div class="form-row-control">
            <input type="text" id="personaDesc" value="${persona?.description || ''}" placeholder="Brief description..." maxlength="60">
          </div>
        </div>
        <div class="form-group">
          <label for="personaPrompt">System Prompt</label>
          <textarea id="personaPrompt" rows="4" placeholder="You are a...">${persona?.systemPrompt || ''}</textarea>
        </div>
        <div class="form-actions">
          <button id="savePersonaBtn" class="button button-primary">${isEdit ? 'Save Changes' : 'Create Persona'}</button>
          ${isEdit ? `<button id="deletePersonaBtn" class="button button-danger">Delete</button>` : ''}
        </div>
      </div>
    `;

        container.querySelector('#savePersonaBtn').addEventListener('click', async () => {
            const data = {
                name: container.querySelector('#personaName').value.trim(),
                icon: container.querySelector('#personaIcon').value.trim() || '🎭',
                description: container.querySelector('#personaDesc').value.trim(),
                systemPrompt: container.querySelector('#personaPrompt').value.trim()
            };

            if (!data.name || !data.systemPrompt) {
                UIModule.showToast('Error', 'Name and System Prompt are required.', 'error');
                return;
            }

            if (isEdit) {
                await updatePersona(persona.id, data);
                UIModule.showToast('Updated', 'Persona updated successfully.', 'success');
            } else {
                await createPersona(data);
                UIModule.showToast('Created', 'Custom persona created!', 'success');
            }

            await loadPersonas();
        });

        if (isEdit) {
            container.querySelector('#deletePersonaBtn').addEventListener('click', async () => {
                const confirmed = await UIModule.showConfirm({
                    title: 'Delete Persona',
                    message: `Delete "${persona.name}"?`,
                    okLabel: 'Delete',
                    okClass: 'button-danger'
                });
                if (confirmed) {
                    await deletePersona(persona.id);
                    UIModule.showToast('Deleted', 'Persona removed.', 'success');
                    await loadPersonas();
                }
            });
        }
    }

    // Initialize
    async function initialize() {
        await loadPersonas();
    }

    return {
        initialize,
        loadPersonas,
        getAllPersonas,
        getPersona,
        getActivePersona,
        setActivePersona,
        createPersona,
        updatePersona,
        deletePersona,
        buildSystemPrompt,
        renderPersonaSelector,
        renderPersonaEditor,
        DEFAULT_PERSONAS
    };
})();

// Auto-initialize
if (typeof StorageManager !== 'undefined') {
    PersonasModule.initialize();
}
