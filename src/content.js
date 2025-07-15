// This script is injected to extract the main content of the page.
(() => {
    // Check if the script has already run on this page to avoid re-injection.
    if (window.hasRunContentScript) {
        return;
    }
    window.hasRunContentScript = true;

    // --- Message Listener for highlighting ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'highlight-answer') {
            removePreviousHighlights();
            highlightText(request.text);
            sendResponse({ success: true });
        }
    });

    function removePreviousHighlights() {
        document.querySelectorAll('.page-reader-highlight').forEach(el => {
            const parent = el.parentNode;
            if (parent) {
                while (el.firstChild) {
                    parent.insertBefore(el.firstChild, el);
                }
                parent.removeChild(el);
                parent.normalize();
            }
        });
    }

    function highlightText(textToFind) {
        if (!textToFind) return;
        const cleanedText = textToFind.trim().replace(/\s+/g, ' ');
        const searchRegex = new RegExp(cleanedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split(/\s+/).join('\\s*'), 'gi');
        
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const nodesToProcess = [];
        while (node = walker.nextNode()) {
            if (searchRegex.test(node.nodeValue)) {
                nodesToProcess.push(node);
            }
        }

        nodesToProcess.forEach(textNode => {
            const matches = textNode.nodeValue.matchAll(searchRegex);
            let lastIndex = 0;
            const newNodes = [];
            const parent = textNode.parentNode;

            for (const match of matches) {
                const matchIndex = match.index;
                const matchedText = match[0];
                if (matchIndex > lastIndex) {
                    newNodes.push(document.createTextNode(textNode.nodeValue.slice(lastIndex, matchIndex)));
                }
                const highlightSpan = document.createElement('span');
                highlightSpan.className = 'page-reader-highlight';
                highlightSpan.textContent = matchedText;
                newNodes.push(highlightSpan);
                lastIndex = matchIndex + matchedText.length;
            }

            if (lastIndex < textNode.nodeValue.length) {
                newNodes.push(document.createTextNode(textNode.nodeValue.slice(lastIndex)));
            }

            newNodes.forEach(newNode => parent.insertBefore(newNode, textNode));
            parent.removeChild(textNode);
        });
    }

    // --- Main Logic to Extract Content ---
    function findBestContentElement() {
        const selectors = [
            'main', 'article', '#main', '#content', '#main-content', 
            '.post-content', '.article-content', '.quiz-container', '.question-container',
            '[role="main"]'
        ];
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }
        return document.body;
    }
    
    function extractContent() {
        const contentElement = findBestContentElement();
        if (!contentElement) return "";

        const tempDiv = document.createElement('div');
        const contentClone = contentElement.cloneNode(true);
        contentClone.querySelectorAll('script, style, nav, footer, header, aside, form, button, input, [role="navigation"], [role="banner"], [role="contentinfo"]').forEach(el => el.remove());
        
        tempDiv.innerHTML = contentClone.innerHTML
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, '\n');
            
        const extractedText = tempDiv.innerText;

        if (extractedText && extractedText.trim().length > 50) {
            return extractedText;
        }
        
        return "";
    }

    // Delay extraction slightly to allow dynamic content to render
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(extractContent());
        }, 4000); // Wait 500ms before trying to read the page
    });
})();