// === Hafizh Signature Code ===
// Author: Hafizh Rizqullah — GeminiAnswerBot
// File: js/utils/helpers.js
// Created: 2025-08-08 16:42:03

if (typeof _escapeHtml === 'undefined') {
  /**
   * Escapes HTML special characters in a string to prevent XSS attacks.
   * This is a centralized utility function to be used across the extension.
   * @param {string} unsafe The string to escape.
   * @returns {string} The escaped, safe string.
   */
  function _escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}