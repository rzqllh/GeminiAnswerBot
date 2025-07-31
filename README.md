# GeminiAnswerBot

![Version](https://img.shields.io/badge/version-2.2.0-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

**GeminiAnswerBot** is a powerful, privacy-first Chrome extension that leverages the Google Gemini API to supercharge your browsing experience. It intelligently analyzes web page content to solve quizzes, summarize articles, and provides a suite of contextual AI tools directly in your browser.

---

## Core Features

-   **Single & Multi-Question Solver**: Automatically detects and solves either a single targeted quiz or all questions on a page in one session.
-   **Robust Content Detection**: Uses a heuristic-based algorithm to find questions on a wide variety of websites, instead of relying on specific site structures.
-   **Smart Page Analysis**: Get a comprehensive, structured summary of any webpage's *main content*, intelligently ignoring sidebars and promotional material.
-   **Redesigned UI**: A clean, modern, and intuitive user interface aligned with Apple's Human Interface Guidelines (HIG) for both the popup and options page.
-   **High Performance**: Built with a performance-first approach, using programmatic script injection to ensure the extension has zero impact on page load times until it's actively used.
-   **Advanced Customization**: A full-featured options page with HIG-aligned controls allows you to manage your API Key, select models, and fine-tune AI prompts and creativity.

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

This extension is built using Manifest V3 and follows a modern, modular, and performance-aware architecture.

### Key Scripts
-   `js/background.js`: The service worker; acts as the central router for API calls and context menus.
-   `js/content.js`: Injected on-demand; handles all direct DOM interaction like text extraction and highlighting using a robust heuristic algorithm.
-   `js/popup.js`: Manages the entire UI and state of the popup window, including logic for single and multi-question modes.
-   `js/options.js`: Manages the UI and logic for the settings page, including prompt customization and interaction history.

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

## Privacy & Security

GeminiAnswerBot is designed with privacy as a priority. Your API key and interaction history are stored exclusively in your browser's local storage. They are never sent anywhere except directly to the Google Gemini API from your browser.

---

## License

This project is licensed under the MIT License.