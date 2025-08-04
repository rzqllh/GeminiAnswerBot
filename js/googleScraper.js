// === Hafizh Rizqullah | GeminiAnswerBot ===
// 🔒 Created by Hafizh Rizqullah || Refine by AI Assistant
// 📄 js/googleScraper.js
// 🕓 Created: 2024-05-22 16:05:00
// 🧠 Modular | DRY | SOLID | Apple HIG Compliant

/**
 * This script is injected into a Google Search results page to extract
 * the titles and snippets of the top search results.
 */
(() => {
  console.log("GeminiAnswerBot Scraper: Injected and running.");

  function scrapeResults() {
    const results = [];
    // Google often changes its selectors. This combination is more robust.
    const resultNodes = document.querySelectorAll('div[data-sokoban-container], div.g');
    
    // Limit to the top 3-4 results for relevance and brevity.
    const limit = Math.min(resultNodes.length, 4);

    for (let i = 0; i < limit; i++) {
      const node = resultNodes[i];
      
      // Skip nodes that are not main search results (e.g., "People also ask")
      if (node.querySelector('g-scrolling-carousel')) continue;

      const titleElement = node.querySelector('h3');
      // Find the snippet text, which is often in a div with a specific data-sncf attribute
      const snippetElement = node.querySelector('div[data-sncf="1"]');

      if (titleElement && snippetElement) {
        const title = titleElement.innerText;
        const snippet = snippetElement.innerText;
        
        if (title && snippet) {
          results.push({ title, snippet });
        }
      }
    }
    return results;
  }

  try {
    const scrapedData = scrapeResults();
    if (scrapedData.length > 0) {
      console.log(`GeminiAnswerBot Scraper: Found ${scrapedData.length} results.`);
      chrome.runtime.sendMessage({
        action: 'scrapedData',
        payload: scrapedData
      });
    } else {
      console.warn("GeminiAnswerBot Scraper: Could not find any valid search results on the page.");
      chrome.runtime.sendMessage({
        action: 'scrapedData',
        payload: [] // Send empty array to signal completion
      });
    }
  } catch (error) {
    console.error("GeminiAnswerBot Scraper: An error occurred.", error);
    chrome.runtime.sendMessage({
      action: 'scrapingFailed',
      error: error.message
    });
  }
})();