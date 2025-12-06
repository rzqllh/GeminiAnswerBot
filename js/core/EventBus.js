/**
 * @file js/core/EventBus.js
 * @description Simple Event Bus for decoupled communication between components.
 */

export class EventBus {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to an event.
     * @param {string} event - Event name.
     * @param {Function} callback - Callback function.
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * Unsubscribe from an event.
     * @param {string} event - Event name.
     * @param {Function} callback - Callback function to remove.
     */
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * Emit an event.
     * @param {string} event - Event name.
     * @param {any} data - Data to pass to listeners.
     */
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    }
}

// Singleton instance
export const eventBus = new EventBus();
