

/**
 * @typedef {Object} FormattedError
 * @property {string} type - Tipe error yang sudah dinormalisasi (e.g., 'INVALID_API_KEY').
 * @property {string} title - Judul yang user-friendly untuk ditampilkan di UI.
 * @property {string} message - Pesan yang user-friendly untuk ditampilkan di UI.
 * @property {string} technicalMessage - Pesan error teknis asli.
 */

/**
 * Modul terpusat untuk menangani dan memformat error di seluruh ekstensi.
 */
const ErrorHandler = (() => {
  /**
   * Menganalisis objek error mentah dan mengembalikannya dalam format terstruktur.
   * @param {Error|Object} error - Objek error yang ditangkap.
   * @param {string} [context='general'] - Konteks di mana error terjadi (e.g., 'api', 'content_script').
   * @returns {FormattedError}
   */
  function format(error, context = 'general') {
    // SPECIAL HANDLING: Intercept stack overflow errors to prevent recursion inside the error handler itself.
    if (error instanceof RangeError && error.message.includes('Maximum call stack size exceeded')) {
      const { title, message } = _getErrorMessages('STACK_OVERFLOW', context);
      return {
        type: 'STACK_OVERFLOW',
        title,
        message,
        technicalMessage: 'Maximum call stack size exceeded', // Use a safe, hardcoded string
      };
    }

    const technicalMessage = error.message || 'An unknown error occurred.';
    let type = error.type || 'UNKNOWN_ERROR';

    // Normalisasi tipe error dari berbagai sumber
    if (technicalMessage.includes("API key not valid")) {
      type = 'INVALID_API_KEY';
    } else if (error.status === 'RESOURCE_EXHAUSTED' || technicalMessage.includes("quota")) {
      type = 'QUOTA_EXCEEDED';
    } else if (type === 'NETWORK_ERROR' || technicalMessage.includes('Failed to fetch')) {
      type = 'NETWORK_ERROR';
    }

    const { title, message } = _getErrorMessages(type, context);

    return {
      type,
      title,
      message,
      technicalMessage,
    };
  }

  /**
   * Mengembalikan judul dan pesan yang user-friendly berdasarkan tipe error.
   * @private
   * @param {string} type - Tipe error yang sudah dinormalisasi.
   * @param {string} context - Konteks error.
   * @returns {{title: string, message: string}}
   */
  function _getErrorMessages(type, context) {
    switch (type) {
      case 'INVALID_API_KEY':
        return {
          title: 'Invalid API Key',
          message: 'The provided API key is not valid. Please check your key in the settings.',
        };
      case 'QUOTA_EXCEEDED':
        return {
          title: 'API Quota Exceeded',
          message: 'You have exceeded your Google AI API quota for the day.',
        };
      case 'NETWORK_ERROR':
        return {
          title: 'Network Error',
          message: 'Could not connect to the API. Please check your internet connection.',
        };
      case 'INTERNAL_ERROR':
        return {
          title: 'Connection Failed',
          message: 'Could not establish a connection with the current page. Try reloading the page.',
        };
      case 'API_ERROR':
        return {
          title: 'API Error',
          message: 'The API returned an unexpected error. Please try again later.',
        };
      case 'STACK_OVERFLOW':
        return {
            title: 'An Unknown Error Occurred',
            message: 'Something went wrong. Please check the console for more details.',
        };
      default:
        return {
          title: 'An Unknown Error Occurred',
          message: 'Something went wrong. Please check the console for more details.',
        };
    }
  }

  return {
    format,
  };
})();