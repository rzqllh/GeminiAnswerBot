// js/utils.js

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