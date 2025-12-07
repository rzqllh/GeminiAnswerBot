// === Hafizh Rizqullah | GeminiAnswerBot ===
// 📄 js/options/tags.js
// 🕓 v5.0 - Tag & Categorize feature

const TagsModule = (() => {
    // Default tags with colors
    const DEFAULT_TAGS = [
        { id: 'programming', name: 'Programming', color: '#3b82f6', keywords: ['code', 'function', 'variable', 'html', 'css', 'javascript', 'python', 'java', 'php', 'sql', 'array', 'loop', 'class'] },
        { id: 'math', name: 'Math', color: '#8b5cf6', keywords: ['calculate', 'equation', 'formula', 'number', 'algebra', 'geometry', 'calculus', 'sum', 'divide', 'multiply'] },
        { id: 'science', name: 'Science', color: '#10b981', keywords: ['element', 'molecule', 'physics', 'chemistry', 'biology', 'atom', 'cell', 'energy', 'force', 'reaction'] },
        { id: 'language', name: 'Language', color: '#f59e0b', keywords: ['grammar', 'sentence', 'vocabulary', 'verb', 'noun', 'adjective', 'tense', 'word', 'phrase'] },
        { id: 'history', name: 'History', color: '#ef4444', keywords: ['war', 'century', 'king', 'empire', 'revolution', 'ancient', 'medieval', 'civilization'] },
        { id: 'general', name: 'General', color: '#6b7280', keywords: [] }
    ];

    let allTags = [];
    let ELS = {};

    // Initialize tags from storage
    async function loadTags() {
        const data = await StorageManager.get('customTags');
        const customTags = data.customTags || [];
        allTags = [...DEFAULT_TAGS, ...customTags];
        return allTags;
    }

    // Save custom tags
    async function saveTags(customTags) {
        await StorageManager.set({ customTags });
        allTags = [...DEFAULT_TAGS, ...customTags];
    }

    // Auto-detect tag from question text
    function detectTag(questionText) {
        if (!questionText) return 'general';
        const lowerText = questionText.toLowerCase();

        for (const tag of allTags) {
            if (tag.keywords && tag.keywords.length > 0) {
                for (const keyword of tag.keywords) {
                    if (lowerText.includes(keyword.toLowerCase())) {
                        return tag.id;
                    }
                }
            }
        }
        return 'general';
    }

    // Get tag by ID
    function getTag(tagId) {
        return allTags.find(t => t.id === tagId) || allTags.find(t => t.id === 'general');
    }

    // Get all tags
    function getAllTags() {
        return allTags;
    }

    // Create tag badge HTML
    function createTagBadge(tagId, removable = false) {
        const tag = getTag(tagId);
        const removeBtn = removable ? `<button class="tag-remove" data-tag="${tagId}">&times;</button>` : '';
        return `<span class="tag-badge" style="background-color: ${tag.color}20; color: ${tag.color}; border: 1px solid ${tag.color}40;">
      ${tag.name}${removeBtn}
    </span>`;
    }

    // Create tag selector dropdown
    function createTagSelector(currentTagId, itemId) {
        const options = allTags.map(tag =>
            `<option value="${tag.id}" ${tag.id === currentTagId ? 'selected' : ''}>${tag.name}</option>`
        ).join('');

        return `<select class="tag-selector" data-item-id="${itemId}">
      ${options}
    </select>`;
    }

    // Assign tag to history item
    async function assignTagToItem(itemId, tagId) {
        const data = await StorageManager.local.get('history');
        const history = data.history || [];

        const itemIndex = history.findIndex(item => item.timestamp === itemId || item.id === itemId);
        if (itemIndex >= 0) {
            history[itemIndex].tagId = tagId;
            await StorageManager.local.set({ history });
            return true;
        }
        return false;
    }

    // Get history items filtered by tag
    async function getHistoryByTag(tagId) {
        const data = await StorageManager.local.get('history');
        const history = data.history || [];

        if (!tagId || tagId === 'all') {
            return history;
        }
        return history.filter(item => item.tagId === tagId);
    }

    // Create new custom tag
    async function createTag(name, color) {
        const id = 'custom_' + Date.now();
        const newTag = { id, name, color, keywords: [], isCustom: true };

        const data = await StorageManager.get('customTags');
        const customTags = data.customTags || [];
        customTags.push(newTag);

        await saveTags(customTags);
        return newTag;
    }

    // Delete custom tag
    async function deleteTag(tagId) {
        if (!tagId.startsWith('custom_')) {
            return false; // Can't delete default tags
        }

        const data = await StorageManager.get('customTags');
        const customTags = (data.customTags || []).filter(t => t.id !== tagId);
        await saveTags(customTags);

        // Reset items with this tag to 'general'
        const histData = await StorageManager.local.get('history');
        const history = (histData.history || []).map(item => {
            if (item.tagId === tagId) item.tagId = 'general';
            return item;
        });
        await StorageManager.local.set({ history });

        return true;
    }

    // Render tag management UI
    function renderTagManager(container) {
        container.innerHTML = `
      <div class="tag-manager">
        <h4>Manage Tags</h4>
        <div class="tag-list">
          ${allTags.map(tag => `
            <div class="tag-item" data-tag-id="${tag.id}">
              <span class="tag-color" style="background: ${tag.color}"></span>
              <span class="tag-name">${tag.name}</span>
              ${tag.isCustom ? `<button class="tag-delete" data-tag="${tag.id}">🗑️</button>` : '<span class="tag-default">Default</span>'}
            </div>
          `).join('')}
        </div>
        <div class="tag-create">
          <input type="text" id="newTagName" placeholder="New tag name..." maxlength="20">
          <input type="color" id="newTagColor" value="#6366f1">
          <button id="createTagBtn" class="btn-small">Add Tag</button>
        </div>
      </div>
    `;

        // Event listeners
        container.querySelector('#createTagBtn')?.addEventListener('click', async () => {
            const name = container.querySelector('#newTagName').value.trim();
            const color = container.querySelector('#newTagColor').value;
            if (name) {
                await createTag(name, color);
                renderTagManager(container);
                UIModule.showToast('Success', `Tag "${name}" created!`, 'success');
            }
        });

        container.querySelectorAll('.tag-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tagId = e.target.dataset.tag;
                await deleteTag(tagId);
                renderTagManager(container);
                UIModule.showToast('Deleted', 'Tag removed.', 'success');
            });
        });
    }

    // Initialize module
    async function initialize() {
        await loadTags();
    }

    return {
        initialize,
        loadTags,
        getAllTags,
        getTag,
        detectTag,
        createTagBadge,
        createTagSelector,
        assignTagToItem,
        getHistoryByTag,
        createTag,
        deleteTag,
        renderTagManager,
        DEFAULT_TAGS
    };
})();

// Auto-initialize if StorageManager exists
if (typeof StorageManager !== 'undefined') {
    TagsModule.initialize();
}
