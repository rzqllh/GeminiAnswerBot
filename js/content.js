if (typeof window.pageReaderContentScriptLoaded === 'undefined') {
  window.pageReaderContentScriptLoaded = true;

  // Fungsi untuk menghapus highlight lama
  function removePreviousHighlights() {
    const highlights = document.querySelectorAll('span.page-reader-highlight');
    highlights.forEach(span => {
      const parent = span.parentNode;
      parent.replaceChild(document.createTextNode(span.textContent), span);
      parent.normalize(); // Menggabungkan node teks yang terpisah
    });
  }

  // Fungsi highlight yang lebih sederhana
  function highlightText(textToFind) {
    if (!textToFind) return;
    
    const mainContentElement = document.body; // Kita cari di seluruh body agar pasti ketemu
    const searchText = textToFind.trim();
    const walker = document.createTreeWalker(mainContentElement, NodeFilter.SHOW_TEXT, null, false);
    
    let node;
    const nodesToReplace = [];
    while (node = walker.nextNode()) {
      const index = node.nodeValue.indexOf(searchText);
      if (index !== -1) {
        nodesToReplace.push({ node, index });
      }
    }

    // Lakukan penggantian setelah selesai mencari untuk menghindari masalah iterasi
    nodesToReplace.forEach(({ node, index }) => {
      const parent = node.parentNode;
      if (!parent || parent.closest('.page-reader-highlight')) return; // Hindari highlight di dalam highlight

      const before = document.createTextNode(node.nodeValue.substring(0, index));
      const highlighted = document.createElement('span');
      highlighted.className = 'page-reader-highlight';
      highlighted.textContent = searchText;
      const after = document.createTextNode(node.nodeValue.substring(index + searchText.length));

      parent.replaceChild(after, node);
      parent.insertBefore(highlighted, after);
      parent.insertBefore(before, highlighted);
      parent.normalize();
    });
  }

  // Listener utama
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "highlight-answer") {
      removePreviousHighlights();
      // Memberi sedikit jeda agar DOM sempat 'tenang'
      setTimeout(() => {
        highlightText(request.text);
      }, 100);
      sendResponse({ success: true });
    } else if (request.action === "get_page_content") {
      const selectedText = window.getSelection().toString().trim();
      let pageContent = '';

      console.log("Content Script: get_page_content request received."); // Debugging
      console.log("Content Script: Selected text length:", selectedText.length); // Debugging

      if (selectedText.length > 20) { // Jika ada seleksi yang cukup panjang, gunakan itu
        pageContent = selectedText;
        console.log("Content Script: Using selected text."); // Debugging
      } else { 
        // Coba cari elemen konten utama yang umum
        const articleElement = document.querySelector('article') || document.querySelector('main');
        console.log("Content Script: article/main element found?", !!articleElement); // Debugging
        if (articleElement && articleElement.innerText.length > 100) { // Hanya jika cukup banyak konten
            pageContent = articleElement.innerText;
            console.log("Content Script: Using article/main innerText."); // Debugging
        } else {
            // Fallback ke innerText body jika tidak ada atau artikel terlalu pendek
            pageContent = document.body.innerText;
            console.log("Content Script: Falling back to document.body.innerText."); // Debugging
        }
        
        // Pembersihan awal: Mengurangi baris kosong berlebihan
        pageContent = pageContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
      }
      console.log("Content Script: Final pageContent length:", pageContent.length); // Debugging
      // Potong pageContent untuk logging agar tidak terlalu panjang di konsol
      console.log("Content Script: Final pageContent (first 500 chars):", pageContent.substring(0, 500) + (pageContent.length > 500 ? '...' : '')); 

      sendResponse({ content: pageContent, source: selectedText.length > 20 ? 'selection' : 'auto' });
    }
    return true; // Penting untuk asynchronous sendResponse
  });
}