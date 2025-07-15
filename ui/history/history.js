document.addEventListener('DOMContentLoaded', async () => {
    const historyList = document.getElementById('history-list');
    const clearHistoryButton = document.getElementById('clearHistory');
    const exportMarkdownButton = document.getElementById('exportMarkdown');
    let recentHistory = [];

    function htmlToTextForExport(html) {
        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.querySelectorAll('.confidence-wrapper').forEach(el => {
            const confidence = el.querySelector('.confidence-badge')?.textContent || 'N/A';
            const reason = el.querySelector('.confidence-reason')?.textContent || 'N/A';
            el.innerHTML = `\n\n**Confidence:** ${confidence}\n\n**Reason:** ${reason}`;
        });
        return tempDiv.innerText.trim();
    }
    
    function formatForDisplay(text) {
        let processedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return processedText.replace(/\n/g, '<br>');
    }

    function renderHistory(items) {
        historyList.innerHTML = ''; 
        if (items.length === 0) {
            historyList.innerHTML = `<div class="empty-state">No history found from the last 3 days.</div>`;
            return;
        }

        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'history-item';
            const formattedDate = new Date(item.timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short'});

            itemElement.innerHTML = `
                <div class="history-item-header">
                    <div class="history-item-title">
                        <a href="${item.url}" target="_blank" title="${item.title}">${item.title || 'Untitled Page'}</a>
                    </div>
                    <div class="history-item-meta">${formattedDate}</div>
                </div>
                <div class="history-item-content">
                    <h3>Quick Answer</h3>
                    <div class="answer-block">${item.answer ? formatForDisplay(item.answer) : 'Not available.'}</div>
                    ${item.explanation ? `<h3>Detailed Explanation</h3><div class="explanation-block">${formatForDisplay(item.explanation)}</div>` : ''}
                    ${item.cleanedContent ? `<h3>Analyzed Content</h3><div class="cleaned-content-block"><pre><code>${item.cleanedContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre></div>` : ''}
                </div>
            `;
            historyList.appendChild(itemElement);
        });
    }

    async function loadHistory() {
        const { history = [] } = await chrome.storage.local.get('history');
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        recentHistory = history.filter(item => new Date(item.timestamp) >= threeDaysAgo);
        renderHistory(recentHistory);
    }
    
    clearHistoryButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete all history? This cannot be undone.')) {
            await chrome.storage.local.set({ history: [] });
            loadHistory();
        }
    });

    exportMarkdownButton.addEventListener('click', () => {
        if (recentHistory.length === 0) {
            alert('No history to export.');
            return;
        }

        let markdownContent = `# GeminiAnswerBot History\n\n*Exported on: ${new Date().toLocaleString()}*\n\n---\n\n`;

        recentHistory.forEach(item => {
            markdownContent += `## ❓ Question from: [${item.title || 'Untitled'}](${item.url})\n`;
            markdownContent += `*Saved on: ${new Date(item.timestamp).toLocaleString()}*\n\n`;
            markdownContent += "### Quick Answer\n\n";
            markdownContent += `${htmlToTextForExport(item.answer)}\n\n`;
            if (item.explanation) {
                markdownContent += "### Detailed Explanation\n\n";
                markdownContent += `${item.explanation}\n\n`;
            }
            markdownContent += "---\n\n";
        });

        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GeminiAnswerBot_History_${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    loadHistory();
});