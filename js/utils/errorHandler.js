// === Hafizh Signature Code ===
// Author: Hafizh Rizqullah — GeminiAnswerBot
// File: js/utils/errorHandler.js
// Dual-mode: Works in both ES modules and regular scripts

const ErrorHandler = (() => {
  function format(error, context = 'general') {
    if (error instanceof RangeError && error.message.includes('Maximum call stack size exceeded')) {
      return {
        type: 'STACK_OVERFLOW',
        title: 'An Error Occurred',
        message: 'Something went wrong. Please check the console.',
        technicalMessage: 'Maximum call stack size exceeded',
      };
    }

    const technicalMessage = error.message || 'An unknown error occurred.';
    let type = error.type || 'UNKNOWN_ERROR';

    if (technicalMessage.includes("API key not valid")) type = 'INVALID_API_KEY';
    else if (error.status === 'RESOURCE_EXHAUSTED' || technicalMessage.includes("quota")) type = 'QUOTA_EXCEEDED';
    else if (type === 'NETWORK_ERROR' || technicalMessage.includes('Failed to fetch')) type = 'NETWORK_ERROR';

    const msgs = {
      'INVALID_API_KEY': { title: 'Invalid API Key', message: 'Check your key in settings.' },
      'QUOTA_EXCEEDED': { title: 'API Quota Exceeded', message: 'You have exceeded your daily quota.' },
      'NETWORK_ERROR': { title: 'Network Error', message: 'Check your internet connection.' },
      'INTERNAL_ERROR': { title: 'Connection Failed', message: 'Could not connect to the page.' },
      'API_ERROR': { title: 'API Error', message: 'The API returned an error.' },
    };

    const { title, message } = msgs[type] || { title: 'Error', message: 'Something went wrong.' };
    return { type, title, message, technicalMessage };
  }

  return { format };
})();

// Make available globally
if (typeof globalThis !== 'undefined') globalThis.ErrorHandler = ErrorHandler;
else if (typeof window !== 'undefined') window.ErrorHandler = ErrorHandler;
else if (typeof self !== 'undefined') self.ErrorHandler = ErrorHandler;