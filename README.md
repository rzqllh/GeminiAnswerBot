# GeminiAnswerBot

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Maintained](https://img.shields.io/badge/Maintained-Yes-brightgreen)

**GeminiAnswerBot** is a powerful, privacy-first Chrome extension that leverages the Google Gemini API to supercharge your browsing experience. It intelligently analyzes web page content to solve quizzes, summarize articles, and provides a suite of contextual AI tools directly in your browser.

---

## Core Features

-   **Smart Quiz Solver**: Automatically detects and solves the currently visible quiz on a page. Built with a sophisticated, multi-question-aware algorithm that isolates the relevant quiz from complex page layouts.
-   **Contextual AI Toolkit**: Right-click or use the floating toolbar on any selected text to:
    -   **Summarize**: Get a concise summary of long articles or paragraphs.
    -   **Explain**: Understand complex topics with a detailed explanation.
    -   **Translate**: Translate text into multiple languages.
-   **Robust Content Detection**: Uses an advanced heuristic-based algorithm to find and parse quizzes on a wide variety of websites, rather than relying on site-specific structures.
-   **Image Analysis**: Right-click on any image to understand its content, solve quizzes within the image, or translate embedded text.
-   **Redesigned UI**: A clean, modern, and intuitive user interface aligned with Apple's Human Interface Guidelines (HIG) for both the popup and options page. Features distinct views for quiz-solving and general AI tasks.
-   **High Performance & Privacy**: Built with a performance-first approach using programmatic script injection. Your API key and interaction history are stored exclusively in your browser's local storage and are never sent anywhere except directly to the Google Gemini API.

---

## Getting Started

### Prerequisites

-   A Chromium-based browser (Chrome, Edge, Brave, etc.)
-   A valid Google Gemini API key.

### Installation

1.  Clone or download this repository and unzip it.
2.  Open your browser and navigate to `chrome://extensions/`.
3.  Enable **Developer Mode** using the toggle in the top-right corner.
4.  Click **Load Unpacked** and select the project folder you unzipped.
5.  The GeminiAnswerBot icon will now appear in your browser's toolbar.

### Configuration

1.  Visit [Google AI Studio](https://aistudio.google.com/) to get your API key.
2.  Right-click the extension icon in your toolbar and select **Options**.
3.  In the **General** tab, paste your API key and click **Save Settings**.
4.  Use the **Test Connection** button to validate your key.

---

## Development & Architecture

This extension is built using Manifest V3 and follows a modern, modular, and performance-aware architecture. It emphasizes a clear separation of concerns between its different components.

### Key Scripts & Responsibilities
-   `js/background.js`: The service worker. Manages all browser-level events, including context menus and reliable message passing between components. It acts as the central controller.
-   `js/content.js`: Injected on-demand. Handles all direct DOM interaction, including the sophisticated "Multi-Question Awareness" algorithm for quiz extraction and the floating toolbar logic.
-   `js/popup.js`: Manages the entire UI and state of the popup window. It contains distinct, decoupled logic for the "Quiz Mode" and the "General Task Mode" to ensure reliability.
-   `js/options.js`: Manages the UI and logic for the settings page, including API key management, prompt customization, and the history viewer.
-   `js/prompts.js`: A centralized repository for all system prompts sent to the Gemini API, allowing for easy tuning and customization.

### Project Structure

```
GeminiAnswerBot/
├── assets/
├── js/
│ ├── vendor/
│ ├── background.js
│ ├── content.js
│ ├── options.js
│ ├── popup.js
│ ├── prompts.js
│ └── utils.js
├── ui/
│ ├── options.html
│ └── popup.html
├── .gitignore
├── manifest.json
├── CHANGELOG.md
└── README.md
```


---

## License

This project is licensed under the MIT License.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-05-21

This is a major release focused on architectural stability, feature reliability, and user experience enhancements. It addresses critical bugs from previous versions and refactors core components for scalability.

### Added
- **Dedicated General Task View**: A new, separate UI panel has been created in the popup to handle and display results for general context menu actions like "Summarize" and "Explain".
- **Structured History View**: The history page now displays interactions in beautifully formatted cards, separating the question, options, and the AI's response for maximum readability.
- **Conditional Highlighting**: The answer highlighting feature is now intelligently disabled for image-based quizzes to prevent illogical behavior.

### Changed
- **Core Architecture**: Replaced the fragile, storage-based communication for context actions with a robust, real-time **message-passing system** between the background script and the popup. This significantly improves the reliability of all context-driven features.
- **Popup Logic**: Rearchitected `popup.js` to intelligently differentiate between a quiz-solving workflow and a general-task workflow, directing the user to the correct UI and logic path.
- **History Rendering Engine**: Replaced the previous raw text display with a smart parsing and rendering engine in `options.js` that builds a clean, semantic layout for each history item.

### Fixed
- **Unresponsive Context Menu/Toolbar**: Resolved a critical race condition that caused actions triggered from the context menu or selection toolbar to fail. The AI now reliably processes selected text every time.
- **Correction Feature Failure**: Rewrote the option extraction logic in `content.js` to be more universal, fixing a bug where the 'Select Correct Answer' panel would fail to find options on certain websites.
- **Unreadable History**: Resolved the core UX issue where history items were displayed as unformatted blocks of text.

## [1.0.0] - 2024-05-20

- Initial public release.
- Core features include single-question quiz solving, page analysis, and a full-featured options page.