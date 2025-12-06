// ES Module adapter for StorageManager
// This file re-exports StorageManager for ES module consumers (like background.js)

// First load the global script
import './storage.js';

// Then export from globalThis
export const StorageManager = globalThis.StorageManager;
