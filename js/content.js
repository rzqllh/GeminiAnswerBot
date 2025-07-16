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
      // Fungsi get_page_content tidak diubah, jadi tidak perlu disalin di sini
      // untuk menjaga respons tetap ringkas. Logika lama Anda masih berlaku.
      const mainContentElement = document.body;
      const selectedText = window.getSelection().toString().trim();
       if (selectedText.length > 20) { // Jika ada seleksi yang cukup panjang, gunakan itu
        sendResponse({ content: selectedText, source: 'selection' });
      } else { // Jika tidak ada atau terlalu pendek, ambil seluruh konten halaman
        sendResponse({ content: mainContentElement.innerText, source: 'auto' });
      }
    }
    return true; // Penting untuk asynchronous sendResponse
  });
}