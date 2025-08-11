// === Hafizh Signature Code ===
// Author: Hafizh Rizqullah — GeminiAnswerBot
// File: js/googleScraper.js
// Created: 2025-08-08 16:42:03

/**
 * @fileoverview This script is injected into Google Search result pages
 * to scrape the main organic search results. It extracts the title and snippet
 * from each result and sends the data back to the background service worker.
 */

(function() {
  try {
    // A selector that targets the container for each individual search result.
    // This is subject to change if Google updates its layout.
    const resultContainers = document.querySelectorAll('div.g');
    
    const scrapedData = [];

    resultContainers.forEach(container => {
      const titleElement = container.querySelector('h3');
      // This selector targets the main descriptive snippet.
      const snippetElement = container.querySelector('div[data-sncf="1"]');

      if (titleElement && snippetElement) {
        scrapedData.push({
          title: titleElement.innerText,
          snippet: snippetElement.innerText,
        });
      }
    });

    // Limit to the top 5 results to keep the context concise and relevant.
    const topResults = scrapedData.slice(0, 5);

    if (topResults.length > 0) {
      chrome.runtime.sendMessage({ action: 'scrapedData', payload: topResults });
    } else {
      // Handle cases where no results were found with the current selectors.
      throw new Error('Could not find any valid search result snippets on the page.');
    }

  } catch (error) {
    console.error('GeminiAnswerBot Scraper Error:', error);
    chrome.runtime.sendMessage({
      action: 'scrapingFailed',
      error: error.message || 'An unknown error occurred during scraping.'
    });
  }
})();