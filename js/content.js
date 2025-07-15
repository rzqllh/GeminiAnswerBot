// Check if the script has been injected before to avoid redeclaration errors
if (typeof window.pageReaderContentScriptLoaded === 'undefined') {
  window.pageReaderContentScriptLoaded = true;

  let mainContentElement = null;

  function findBestContentElement() {
    const commonIds = ['main', 'content', 'main-content', 'article-body'];
    for (const id of commonIds) {
      const element = document.getElementById(id);
      if (element) return element;
    }
    const mainTag = document.querySelector('main');
    if (mainTag) return mainTag;
    const articleTag = document.querySelector('article');
    if (articleTag) return articleTag;
    const commonClasses = ['.post-content', '.article-content', '.quiz-container', '.question-container'];
    for (const className of commonClasses) {
      const element = document.querySelector(className);
      if (element) return element;
    }
    return document.body;
  }

  function sanitizeNode(node) {
    const forbiddenTags = ['script', 'style', 'noscript', 'iframe', 'button', 'input', 'svg', 'nav', 'footer'];
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) return null;
    if (node.nodeType === Node.ELEMENT_NODE && forbiddenTags.includes(node.tagName.toLowerCase())) return null;

    const sanitized = node.cloneNode(false);
    if (sanitized.nodeType === Node.ELEMENT_NODE) {
      const attributes = Array.from(sanitized.attributes);
      attributes.forEach(attr => {
        if (attr.name.toLowerCase() !== 'href' || sanitized.tagName.toLowerCase() !== 'a') {
          sanitized.removeAttribute(attr.name);
        }
      });
    }

    node.childNodes.forEach(child => {
      const sanitizedChild = sanitizeNode(child);
      if (sanitizedChild) sanitized.appendChild(sanitizedChild);
    });
    return sanitized;
  }

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
    console.log("Looking for text to highlight:", textToFind);

    if (!textToFind || !mainContentElement) return;
    const cleanedText = textToFind.trim().replace(/\s+/g, ' ');
    const searchRegex = new RegExp(cleanedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split(/\s+/).join('\\s+'), 'gi');
    const walker = document.createTreeWalker(mainContentElement, NodeFilter.SHOW_TEXT, null, false);
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

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "get_page_content") {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText.length > 20) {
        sendResponse({ content: selectedText, source: 'selection' });
        return true;
      }
      mainContentElement = findBestContentElement();
      let finalHTML = 'Failed to read content from this page.';
      if (mainContentElement) {
        const sanitizedContent = sanitizeNode(mainContentElement);
        if (sanitizedContent) finalHTML = sanitizedContent.innerHTML;
      }
      sendResponse({ content: finalHTML, source: 'auto' });
    }
    else if (request.action === "highlight-answer") {
      if (!mainContentElement) mainContentElement = findBestContentElement();
      removePreviousHighlights();
      highlightText(request.text);
      sendResponse({ success: true });
    }
    return true;
  });
}