// === Hafizh Signature Code ===
// Author: Hafizh Rizqullah — GeminiAnswerBot Specialist
// File: js/stealth.js
// Purpose: Intercepts and blocks visibility/focus events to prevent "focus lost" detection.

(function() {
    console.log("🥷 GeminiAnswerBot: Stealth Mode Activated.");

    // 1. Mock document.hidden and document.visibilityState
    // We use Object.defineProperty to overwrite these read-only properties.
    Object.defineProperty(document, 'hidden', {
        get: function() { return false; }, // Always visible
        configurable: true
    });

    Object.defineProperty(document, 'visibilityState', {
        get: function() { return 'visible'; }, // Always visible
        configurable: true
    });

    // 2. Intercept Event Listeners
    // We wrap EventTarget.prototype.addEventListener to filter out unwanted events.
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const blockedEvents = ['blur', 'focusout', 'visibilitychange', 'mouseleave', 'pagehide'];

    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (blockedEvents.includes(type)) {
            // console.debug(`🥷 GeminiAnswerBot: Blocked listener for event '${type}'`);
            return; // Do nothing, effectively blocking the listener attachment
        }
        return originalAddEventListener.call(this, type, listener, options);
    };

    // 3. Clear existing on[event] handlers if they exist on window or document
    const eventsToClear = ['onblur', 'onfocusout', 'onvisibilitychange', 'onmouseleave', 'onpagehide'];
    
    eventsToClear.forEach(evt => {
        if (window[evt] !== undefined) window[evt] = null;
        if (document[evt] !== undefined) document[evt] = null;
    });

    // 4. Aggressive Event Stopping (Capture Phase)
    // Just in case some listeners were attached before this script ran, 
    // we add our own capture-phase listeners to stop propagation immediately.
    blockedEvents.forEach(eventType => {
        window.addEventListener(eventType, function(event) {
            event.stopImmediatePropagation();
            event.stopPropagation();
            // console.debug(`🥷 GeminiAnswerBot: Stopped propagation of '${eventType}'`);
        }, true); // true = capture phase (runs before bubbling)
    });

})();
