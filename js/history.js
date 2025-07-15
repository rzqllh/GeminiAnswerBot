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

            itemElement.innerHTML = `
                <div class="history-item-header">
                    <div class="history-item-title">
                        <a href="${item.url}" target="_blank" title="${item.title}">${item.title}</a>
                    </div>
                    <div class="history-item-meta">${formattedDate}</div>
                </div>
                <div class="history-item-content">
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
    if (confirm('Are you sure you want to delete all history? This cannot be undone.')) { // Kembali ke teks biasa
        await chrome.storage.local.remove('history');
        loadHistory();
    }
});

    loadHistory();
});