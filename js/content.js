// js/content.js

// Pencegahan deklarasi ganda: Pastikan seluruh script hanya dieksekusi sekali per konteks
if (typeof window.geminiAnswerBotContentScriptLoaded === 'undefined') {
  window.geminiAnswerBotContentScriptLoaded = true;
  console.log("Content Script: Initializing for the first time in this context.");

  // Inisialisasi Mark.js sekali di awal
  let markerInstance = null;
  let isMarkerInitialized = false; // Flag untuk melacak inisialisasi Mark.js

  function initializeMarker() {
      if (typeof Mark !== 'undefined' && !markerInstance) {
          markerInstance = new Mark(document.body);
          isMarkerInitialized = true;
          console.log("Content Script: Mark.js initialized.");
      } else if (!isMarkerInitialized) {
          console.error("Content Script: Mark.js library (window.Mark) not found. Highlighting may not work.");
      }
  }

  // Panggil inisialisasi saat script dimuat. Pastikan ini dipanggil.
  // Juga tambahkan listener untuk DOMContentLoaded jika script dimuat terlalu cepat
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initializeMarker();
  } else {
      document.addEventListener('DOMContentLoaded', initializeMarker);
  }


  function removePreviousHighlights() {
      if (markerInstance) {
          markerInstance.unmark({
              done: function() {
                  console.log("Content Script: Previous highlights removed.");
              }
          });
      } else {
          console.warn("Content Script: Marker instance not available to unmark for removal.");
      }
  }

  function highlightText(text) {
      if (!markerInstance) {
          console.error("Content Script: Mark.js not initialized. Cannot highlight.");
          return;
      }

      removePreviousHighlights(); // Hapus highlight sebelumnya

      // text di sini sudah array dari popup.js
      const textsToHighlight = Array.isArray(text) ? text : [text];

      if (textsToHighlight.length === 0 || textsToHighlight.every(t => !t || t.trim() === '')) {
          console.log("Content Script: No text provided for highlighting.");
          return;
      }

      textsToHighlight.forEach(t => {
          if (t && t.trim() !== '') {
              markerInstance.mark(t, {
                  "separateWordSearch": false, 
                  "accuracy": "partially", 
                  "caseSensitive": false, 
                  "acrossElements": true, 
                  "done": function(counter) {
                      console.log(`Content Script: Highlighted "${t}". Found ${counter} instances.`);
                  }
              });
          }
      });

      // Gulir ke highlight pertama setelah semua penandaan selesai
      const firstHighlight = document.querySelector('mark');
      if (firstHighlight) {
          firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }


  // Helper untuk membersihkan HTML dari string, hanya menyisakan teks murni
  function stripHtmlTags(html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || "";
  }

  // FUNGSI UTAMA YANG DIREVISI: DETEKSI KUIS ADAPTIF DAN EKSTRAKSI BERTINGKAT
  function getQuizContentFromPage() { // Nama fungsi dikembalikan
      let quizQuestion = '';
      let quizOptions = [];
      let extractedStructuredContent = '';
      
      // --- Level 1 (Targeted & Structured): Coba temukan kontainer kuis yang paling mungkin ---
      console.log("Content Script: Attempting Level 1: Targeted & Structured Quiz Extraction.");
      const quizContainerSelectors = [
          'div.w3-container.w3-panel',         // Umum di W3Schools, seringkali berisi kuis
          'div#mainLeaderboard > form',        // Form kuis utama di W3S Quiz
          'div[class*="quiz"], form[action*="quiz"]', // Generic quiz containers
          'div[class*="question-block"], div[id*="question"]' // Blok pertanyaan individu
      ];

      let potentialQuizRoot = null;
      for (const selector of quizContainerSelectors) {
          const container = document.querySelector(selector);
          if (container && (container.querySelector('input[type="radio"]') || container.querySelector('input[type="checkbox"]'))) {
              // Jika kontainer berisi radio/checkbox, kemungkinan besar ini adalah kuis.
              potentialQuizRoot = container;
              break;
          }
      }

      if (potentialQuizRoot) {
          // --- Ekstrak Pertanyaan dari kontainer yang ditemukan ---
          const questionCandidates = potentialQuizRoot.querySelectorAll('h3, h4, p:first-of-type, div.w3-large, div[class*="question"]');
          for (const qEl of questionCandidates) {
              let qText = qEl.textContent.trim();
              qText = qText.replace(/^Question\s+\d+\s+of\s+\d+\s*[:-]?\s*/i, '').trim(); // Hapus nomor soal
              if (qText.length > 10 && !qText.toLowerCase().includes('quiz') && !qText.toLowerCase().includes('html quiz')) {
                  quizQuestion = qText;
                  break;
              }
          }
          console.log("Content Script: Level 1 - Found Question:", quizQuestion.substring(0, Math.min(quizQuestion.length, 100)));

          // --- Ekstrak Opsi Jawaban dari kontainer yang ditemukan ---
          const rawOptionElements = potentialQuizRoot.querySelectorAll(
              'input[type="radio"] + label, ' +        // Radio buttons with labels (most common)
              'input[type="checkbox"] + label, ' +     // Checkboxes with labels
              'div[class*="option"], ' +               // Divs with "option" in class name
              'div.w3-code, ' +                        // W3Schools code blocks
              'div.w3-example, ' +                     // W3Schools example blocks
              'li, ' +                                 // List items
              'p'                                       // Paragraphs (fallback option text)
          );

          const seenOptions = new Set();
          rawOptionElements.forEach(el => {
              let optionContent = '';
              const codeOrPreEl = el.querySelector('code, pre');
              
              if (codeOrPreEl) { // Opsi berisi kode
                  optionContent = codeOrPreEl.textContent.trim();
                  optionContent = optionContent.includes('\n') ? `CODE_BLOCK_START\n${optionContent}\nCODE_BLOCK_END` : `\`${optionContent}\``;
              } else {
                  // Jika opsi adalah tag HTML literal (contoh: <p>) atau entitas HTML (&lt;p&gt;)
                  const innerText = el.textContent.trim();
                  const innerHTML = el.innerHTML.trim();

                  if ((innerText.startsWith('<') && innerText.endsWith('>') && innerText.length < 50) || // Literal HTML tag like "<table>"
                      (innerHTML.includes('&lt;') && innerHTML.includes('&gt;') && innerHTML.length < 100)) { // Escaped HTML tag like "&lt;table&gt;"
                      
                      // Coba ambil outerHTML yang paling bersih jika itu adalah tag HTML tunggal
                      const tempDiv = document.createElement('div');
                      tempDiv.innerHTML = innerHTML;
                      const parsedHtmlEl = tempDiv.firstElementChild; // Dapatkan elemen pertama yang diparse
                      
                      if (parsedHtmlEl && parsedHtmlEl.tagName && parsedHtmlEl.outerHTML === innerHTML) {
                           // Jika innerHTML adalah sebuah elemen HTML lengkap (misal: "<div>...</div>")
                           // Pertahankan outerHTML-nya untuk akurasi tertinggi
                           optionContent = `CODE_BLOCK_START\n${innerHTML}\nCODE_BLOCK_END`;
                      } else {
                           // Fallback jika tidak bisa diparse sebagai elemen tunggal, gunakan innerText biasa
                           // atau innerHTML jika ada entitas yang perlu dipertahankan AI
                           optionContent = innerText; // Mark.js akan mencocokkan ini
                      }
                  } else {
                      optionContent = innerText;
                  }
              }

              // Filter opsi yang sangat pendek (<2 char) atau noise umum
              if (optionContent.length > 1 && !optionContent.toLowerCase().includes('next') && !optionContent.toLowerCase().includes('submit') && !optionContent.toLowerCase().includes('previous') && !seenOptions.has(optionContent.toLowerCase())) {
                  quizOptions.push(optionContent);
                  seenOptions.add(optionContent.toLowerCase());
              }
          });
          console.log("Content Script: Level 1 - Found Options count:", quizOptions.length);
          
          // Finalisasi Level 1: Jika berhasil menemukan pertanyaan dan minimal 2 opsi
          if (quizQuestion.length > 10 && quizOptions.length >= 2) { 
              extractedStructuredContent = `Question: ${quizQuestion}\n\nOptions:\n`;
              quizOptions.forEach(opt => {
                  extractedStructuredContent += `- ${opt}\n`;
              });
              console.log("Content Script: Level 1 Extraction SUCCESS.");
              return extractedStructuredContent.trim();
          }
      }
      
      // --- Level 2 (Broader Main Content): Fallback jika Level 1 gagal ---
      console.log("Content Script: Level 1 failed. Attempting Level 2: Broader Main Content Extraction.");
      let content = '';
      const mainContentArea = document.querySelector('main') || 
                              document.querySelector('article') ||
                              document.querySelector('div.w3-main') || 
                              document.querySelector('#main') || 
                              document.querySelector('body > div.container'); 

      if (mainContentArea) {
          const clone = mainContentArea.cloneNode(true);
          const aggressiveSelectorsToRemove = [
              'script', 'style', 'noscript', 'iframe', '.ads', '.ad', '[id*="ad"]', '[class*="ad"]', 
              'nav', 'header', 'footer', 'aside', '.hidden', '[style*="display:none"]', '[aria-hidden="true"]', 
              '.w3-sidebar', '#mySidenav', '.w3-bar', '.w3-top', '.w3-bottom', 
              'input[type="hidden"]', 'button', 'textarea', 'select', 'img', // Tombol, gambar yang mungkin noise
              '.w3-example', '.w3-code', // W3Schools code/example blocks (jika tidak bagian dari kuis)
              '[class*="google-ads"]', '[id*="google_ads"]', '.w3-include-css', '.w3-include-html', 
              '.w3-hide-small', '.w3-hide-medium', '.w3-hide-large', '#google_translate_element', 
              'div[id*="at-svc"]', 'div[class*="at-svc"]', 'a[href*="#"]', '[role="button"]', 
              '.navbar', '.breadcrumb', '.footer', '#main-footer', '.sidebar', '.section-header', 
              '.course-info-card', '.progress-bar', '.user-profile-widget', '.activity-log', '.notification-area', '.leaderboard-widget',
              '[class*="ad-box"]', '[id*="ad-block"]', '[class*="ad-unit"]'
          ];
          clone.querySelectorAll(aggressiveSelectorsToRemove.join(', ')).forEach(el => el.remove());
          
          clone.childNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                  const tagName = node.tagName.toLowerCase();
                  if (['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe'].includes(tagName)) return;

                  let text = node.textContent.trim();
                  // Tangani kode/pre di Level 2 juga
                  if (tagName === 'pre' || tagName === 'code') {
                    text = `CODE_BLOCK_START\n${text}\nCODE_BLOCK_END`;
                  }

                  if (text.length > 1 && text.length < 1000 && 
                      !text.toLowerCase().includes('advertisement') && !text.toLowerCase().includes('cookie') && 
                      !text.toLowerCase().includes('login') && !text.toLowerCase().includes('sign up') &&
                      !text.toLowerCase().includes('next') && !text.toLowerCase().includes('previous') && 
                      !text.toLowerCase().includes('submit') && !text.toLowerCase().includes('test your skills')) { 
                      content += text + '\n\n'; 
                  }
              } else if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 1) { 
                  content += node.nodeValue.trim() + '\n\n';
              }
          });

          if (content.trim().length > 50) { 
              console.log("Content Script: Level 2 Extraction SUCCESS (Broader Main Content).");
              return content.trim().replace(/\n\s*\n\s*\n/g, '\n\n').trim();
          }
      }
      
      // --- Level 3 (Raw Body Fallback): Jika kedua level di atas gagal ---
      console.log("Content Script: Level 2 failed. Attempting Level 3: Raw Body Fallback.");
      const bodyCloneFinal = document.body.cloneNode(true);
      // Hapus yang paling fundamental saja
      bodyCloneFinal.querySelectorAll('script, style, noscript, iframe, .hidden, [style*="display:none"], [aria-hidden="true"]').forEach(el => el.remove());
      
      let finalContent = bodyCloneFinal.innerText;
      finalContent = finalContent.replace(/\s+/g, ' ').trim(); // Normalisasi semua spasi putih
      
      console.log("Content Script: Level 3 Extraction SUCCESS (Raw Body Fallback).");
      return finalContent;
  }


  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("Content Script: Received message:", request.action);
      
      // Handshake mechanism
      if (request.action === "ping_content_script") {
          console.log("Content Script: Responding to ping request.");
          sendResponse({ ready: isMarkerInitialized, success: true });
          return true; // Asynchronous response
      }

      if (request.action === "get_page_content") {
          const selectedText = window.getSelection().toString().trim();
          let pageContent = '';

          console.log("Content Script: get_page_content request received."); // Debugging
          console.log("Content Script: Selected text length:", selectedText.length); // Debugging

          if (selectedText.length > 20) { // Jika ada seleksi yang cukup panjang, gunakan itu
              pageContent = selectedText;
              console.log("Content Script: Using selected text."); // Debugging
          } else { 
              // Panggil fungsi untuk mendapatkan konten yang lebih terstruktur atau luas
              pageContent = getQuizContentFromPage();
          }
          
          console.log("Content Script: Final pageContent length:", pageContent.length); // Debugging
          // Potong pageContent untuk logging agar tidak terlalu panjang di konsol
          console.log("Content Script: Final pageContent (first 500 chars):", pageContent.substring(0, 500) + (pageContent.length > 500 ? '...' : '')); 

          sendResponse({ content: pageContent, source: selectedText.length > 20 ? 'selection' : 'auto' });
          return true; // Penting untuk asynchronous sendResponse
      } else if (request.action === "highlight-answer") {
          // text sekarang bisa berupa string tunggal atau array of strings
          highlightText(request.text);
          sendResponse({ success: true });
          return true; // Penting untuk asynchronous sendResponse
      }
  });
}