// js/history.js
document.addEventListener('DOMContentLoaded', async () => {
    const historyList = document.getElementById('history-list');
    const clearHistoryButton = document.getElementById('clearHistory');

    function renderHistory(items) {
        historyList.innerHTML = ''; // Clear loading message

        if (items.length === 0) {
            historyList.innerHTML = `<div class="empty-state">${chrome.i18n.getMessage("historyEmpty")}</div>`;
            return;
        }

        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'history-item';

            const formattedDate = new Date(item.timestamp).toLocaleString();
            const actionLabel = item.actionType === 'quiz' ? 'Quiz Answer' : // Menambahkan label aksi
                                item.actionType === 'summarize' ? 'Summary' :
                                item.actionType === 'explain' ? 'Explanation (Context)' :
                                item.actionType === 'translate' ? 'Translation' :
                                item.actionType === 'define' ? 'Definition' : 'AI Response'; // Fallback
            
            // Tampilkan teks yang diproses (cleanedContent) jika ada dan bukan quiz biasa
            const contentSource = item.actionType === 'quiz' ? 'Question Content' : 'Selected Text';
            const contentDisplay = item.cleanedContent ? `
                <h3>${contentSource}</h3>
                <div class="answer-block" style="background:none; padding:0; border:none; margin-bottom:12px;">${item.cleanedContent.length > 200 ? escapeHtml(item.cleanedContent.substring(0,200)) + '...' : escapeHtml(item.cleanedContent)}</div>
            ` : '';


            itemElement.innerHTML = `
                <div class="history-item-header">
                    <div class="history-item-title">
                        <a href="${item.url}" target="_blank" title="${item.title}">${item.title}</a>
                        <span style="font-size:12px; color:var(--secondary-text-color); margin-left:8px;">(${actionLabel})</span>
                    </div>
                    <div class="history-item-meta">${formattedDate}</div>
                </div>
                <div class="history-item-content">
                    ${contentDisplay}
                    <div class="answer-block">${item.answerHTML}</div>
                    ${item.explanationHTML ? `
                        <h3>Explanation</h3>
                        <div class="explanation-block">${item.explanationHTML}</div>
                    ` : ''}
                </div>
            `;
            historyList.appendChild(itemElement);
        });
    }
    
    // Helper to escape HTML for display
    function escapeHtml(unsafe) {
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    async function loadHistory() {
        const { history = [] } = await chrome.storage.local.get('history');

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const recentHistory = history.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate >= threeDaysAgo;
        });

        renderHistory(recentHistory);
    }
    
 clearHistoryButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all history? This cannot be undone.')) {
        await chrome.storage.local.remove('history');
        loadHistory();
    }
});

    loadHistory();
});