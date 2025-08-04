# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **Option Extraction Failure**: Enhanced the option detection algorithm to correctly parse quizzes that use non-standard HTML layouts (e.g., text without `<label>` tags), making it more resilient.
- **Unresponsive UI Feedback**: Eliminated abrupt content loading by implementing contextual skeleton loaders, providing clear feedback to the user during API calls.
- **Unreadable History Page**: The history page now correctly parses and renders past interactions into clean, readable, and consistently formatted cards.
- **Code Formatting Issues**: Resolved a bug where inline `<code>` tags in rendered markdown were not displayed correctly.

---

## [2.0.0] - 2024-05-21
- Initial stable release after reverting a problematic feature branch. Established a reliable baseline for future development.