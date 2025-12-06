/**
 * @file js/core/Store.js
 * @description Centralized state management using the Observer pattern.
 */

export class Store {
    constructor(initialState = {}) {
        this.state = initialState;
        this.listeners = [];
    }

    /**
     * Get the current state.
     * @returns {Object} The current state.
     */
    getState() {
        return this.state;
    }

    /**
     * Update the state and notify listeners.
     * @param {Object} newState - Partial state update.
     */
    setState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };

        // Simple shallow comparison to avoid unnecessary updates
        const hasChanged = Object.keys(newState).some(
            key => newState[key] !== oldState[key]
        );

        if (hasChanged) {
            this.notify();
        }
    }

    /**
     * Subscribe to state changes.
     * @param {Function} listener - Callback function receiving the new state.
     * @returns {Function} Unsubscribe function.
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners of the current state.
     */
    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
}
