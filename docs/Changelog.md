Berikut versi changelog Anda yang sudah diperbaiki agar terlihat lebih profesional, konsisten, dan terstruktur:

---

# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

* **Interactive Slider Tooltips** – All temperature sliders now display a tooltip with the current value on hover, providing clearer feedback and aligning with modern UI standards.

### Changed

* **UI/UX Refinement** – Restyled form controls, especially sliders, to comply with Apple’s Human Interface Guidelines (HIG) for a cleaner and more professional appearance.
* **Error Handling Architecture** – Centralized error handling into a dedicated `errorHandler.js` module to ensure consistent error processing and simplify maintenance.

### Fixed

* **Password Visibility Toggle** – Fixed a bug where the "Show/Hide API Key" button was non-functional. It now properly toggles input field visibility.
* **Options Page Blank** – Resolved an issue where the options page displayed as blank due to missing HTML structure. All setting panes (`General`, `Prompts`, `History`, `Data`) are now correctly implemented in `ui/options.html`.

---

## \[3.0.0] - 2024-05-22

Major architectural and UI/UX overhaul focusing on reliability, accuracy, and professional design.

### Added

* **Viewport-Aware Quiz Detection** – Implemented an on-demand viewport calculation to accurately detect which quiz block is currently visible, improving precision on pages with multiple questions.
* **Skeleton Loaders** – Replaced generic spinners with content-aware skeleton loaders in the popup, enhancing perceived performance during API calls.
* **Centralized UI Components** – Introduced a `ui.js` module to manage reusable UI elements (toasts, modals), improving code reusability and maintainability.
* **Git Tagging for Backups** – Integrated a workflow to automatically create version tags as safe checkpoints before major refactoring.

### Changed

* **Core Architecture (Options Page)** – Split the monolithic `js/options.js` into smaller single-responsibility modules (`nav.js`, `history.js`, `settings.js`, `ui.js`), significantly improving scalability and maintainability.
* **Quiz Extraction Algorithm** – Redesigned detection logic to analyze complete quiz blocks (question + options) based on viewport visibility, replacing the older proximity-scoring method.
* **Popup UI/UX** – Revamped layout using a modern flexbox structure with consistent spacing and centralized typography for a polished appearance.
* **Context Menu Reliability** – Improved background–popup communication with a real-time message-passing system, resolving race condition issues.

### Fixed

* **Critical Accuracy Bug** – Corrected behavior where the extension always targeted the first quiz on long pages, regardless of scroll position.
* **Option Extraction Failure** – Enhanced detection to handle quizzes using unconventional HTML structures (e.g., missing `<label>` tags).
* **Unresponsive UI Feedback** – Removed abrupt content loading by adding contextual skeleton loaders for smoother user feedback.
* **Unreadable History Page** – History page now correctly renders past interactions into clean, consistently formatted cards.
* **Code Formatting Issues** – Inline `<code>` tags in markdown are now displayed correctly.

---

## \[2.0.0] - 2024-05-21

* Initial stable release after reverting a problematic feature branch. Established a reliable foundation for further development.

---

Mau saya rapikan lagi supaya setiap versi punya subjudul **“Highlights”** di atas daftar *Added/Changed/Fixed* agar pembaca bisa langsung menangkap perubahan penting?
