# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2025-08-01

### Added
- **Resilient Storage System**: Implemented a new `StorageManager` wrapper around the `chrome.storage` API. This provides an automatic fallback from `sync` to `local` storage, ensuring the extension remains fully functional even if browser policies (like blocking third-party cookies) disable sync storage.
- **Sync Status Warning**: The options page now displays a clear warning message to the user if `storage.sync` is unavailable, informing them that settings are being saved locally to the current device only.
- **Interactive Slider Tooltips**: All temperature sliders on the options page now display a tooltip with the current value on hover, providing better visual feedback and aligning with modern UI standards.

### Changed
- **Storage Architecture**: Refactored the entire application (`background.js`, `popup.js`, `settings.js`, `history.js`) to use the new centralized `StorageManager`. This simplifies the codebase, removes redundant error handling, and improves overall stability.
- **UI/UX Refinement**: Overhauled the styling of form controls, particularly sliders, to better match Apple's Human Interface Guidelines (HIG) for a cleaner and more professional look.

### Fixed
- **Critical Save/Load Bug on macOS/Secure Browsers**: Resolved a major issue where the extension would fail to save settings or function correctly on browsers with stricter security settings. The new storage system ensures functionality is always preserved.
- **Password Visibility Toggle**: Corrected a JavaScript bug where the "Show/Hide API Key" button was not functioning. It now correctly toggles the input field's visibility.

---

### Changed
- **Error Handling Architecture**: Centralized all error handling logic into a new `errorHandler.js` module. This ensures consistent error processing and reporting across the extension, making the codebase more robust and easier to maintain.

## [3.0.0] - 2024-05-22

This is a major architectural and user experience overhaul, focusing on reliability, accuracy, and a professional user interface. The extension's core logic has been re-engineered for robustness and maintainability.

### Added
- **Viewport-Aware Quiz Detection**: Implemented a synchronous, on-demand viewport calculation to intelligently identify the quiz block currently visible to the user. This provides a massive accuracy boost on long pages with multiple questions.
- **Skeleton Loaders**: Replaced generic spinners with elegant, content-aware skeleton loaders in the popup UI. This enhances the user experience by improving perceived performance while waiting for API responses.
- **Centralized UI Components**: Created a dedicated `ui.js` module in the options page to handle reusable components like toasts and modals, adhering to the DRY principle.
- **Git Tagging for Backups**: Integrated a workflow step to create version tags in Git as safe checkpoints before major refactoring sprints.

### Changed
- **Core Architecture (Options Page)**: The monolithic `js/options.js` has been completely refactored into smaller, single-responsibility modules (`nav.js`, `history.js`, `settings.js`, `ui.js`), significantly improving maintainability and scalability.
- **Quiz Extraction Algorithm**: The entire quiz detection logic was re-architected. It now identifies self-contained "quiz blocks" (question + options) and analyzes the one most visible in the viewport, replacing the older, less reliable proximity-scoring method.
- **Popup UI/UX**: The popup layout has been revamped using a modern flexbox structure with consistent `gap` spacing, eliminating overlapping elements. A centralized typography system was also implemented for a consistent and polished look across all information cards.
- **Context Menu Reliability**: Re-architected the communication between the background script and the popup to use a robust, real-time message-passing system, fixing critical race conditions.

### Fixed
- **Critical Accuracy Bug**: Solved the core issue where the extension would inaccurately solve the first quiz on a long page, regardless of the user's scroll position. The extension is now fully context-aware.
- **Options Page Blank**: Resolved a critical bug where the options page was completely blank. The HTML structure for all settings panes (`General`, `Prompts`, `History`, `Data`) was missing and has now been correctly implemented in `ui/options.html`.
- **Option Extraction Failure**: Enhanced the option detection algorithm to correctly parse quizzes that use non-standard HTML layouts (e.g., text without `<label>` tags), making it more resilient.
- **Unresponsive UI Feedback**: Eliminated abrupt content loading by implementing contextual skeleton loaders, providing clear feedback to the user during API calls.
- **Unreadable History Page**: The history page now correctly parses and renders past interactions into clean, readable, and consistently formatted cards.
- **Code Formatting Issues**: Resolved a bug where inline `<code>` tags in rendered markdown were not displayed correctly.

---

## [2.0.0] - 2024-05-21
- Initial stable release after reverting a problematic feature branch. Established a reliable baseline for future development.