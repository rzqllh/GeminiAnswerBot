# GeminiAnswerBot

![Version](https://img.shields.io/badge/version-1.9.8-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

**GeminiAnswerBot** is a smart, privacy-first Chrome extension that leverages the Google Gemini API to supercharge your browsing experience. It intelligently analyzes web page content to solve quizzes, summarize articles, and provides a suite of contextual AI tools directly in your browser.

---

## Core Features

-   **Intelligent Quiz Solver**: Automatically detects and solves quiz questions from page content, whether text-based or within images.
-   **Full Page Analysis**: Get a comprehensive, structured summary of any webpage with a single click, including a TL;DR, key takeaways, and mentioned entities.
-   **Multimodal Image Actions**: Right-click any image to:
    -   **Answer a Quiz**: Transcribes and solves questions embedded in images.
    -   **Describe Image**: Provides a detailed description of the image's content.
    -   **Translate Text**: Extracts and translates any text found within the image.
-   **Floating Action Toolbar**: Select any text on a page to instantly bring up a sleek, floating toolbar for quick actions like summarizing, explaining, or translating.
-   **Persistent State UI**: The popup remembers its last state on a per-tab basis. If you get an answer or a summary, it will be there when you reopen the popup without needing to rescan.
-   **Interactive Feedback Loop**: Correct the AI's answers and instantly receive a new, updated explanation based on the correct information.
-   **Robust Error Handling**: Intelligently detects specific API errors (e.g., `INVALID_API_KEY`, `QUOTA_EXCEEDED`) and provides clear, actionable feedback to the user.
-   **Advanced Customization**: A full-featured options page allows you to:
    -   Manage your API Key and select your preferred Gemini model.
    -   Create and switch between multiple custom prompt profiles.
    -   Fine-tune AI creativity with granular temperature controls for each specific task.
-   **Pre-Submission Safety Check**: Optionally warns you if you're about to submit a quiz answer that differs from the AI's suggestion.

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

This extension is built using Manifest V3 and follows a modern, modular architecture.

### Key Scripts

-   `js/background.js`: The service worker. It acts as the central router and orchestrator. It manages context menus, handles all communication with the Google Gemini API, and routes events between different parts of the extension.
-   `js/content.js`: The content script. It is the only part of the extension with direct access to the webpage's DOM. Its responsibilities include:
    -   Extracting text content (either for quizzes or full-page analysis).
    -   Highlighting answers on the page using `Mark.js`.
    -   Implementing the floating action toolbar for text selection.
    -   Displaying the "Pre-Submission Check" confirmation modal.
-   `js/popup.js`: Manages the entire UI and state of the default popup window. It is built as a self-contained class (`PopupApp`) that handles rendering different views (loading, quiz, summary, error), managing user interactions, and orchestrating communication with the content and background scripts.
-   `js/options.js`: Contains all the logic for the feature-rich options page, including saving settings, managing prompt profiles, and displaying interaction history.

### Core Concepts

-   **Dynamic Script Injection**: To keep the extension lightweight, `content.js` and its dependencies are not persistently injected into every page via the manifest. Instead, they are programmatically injected by `popup.js` using the `chrome.scripting.executeScript` API only when the user opens the popup. A handshake mechanism ensures the content script is ready before communication begins.
-   **Per-Tab State Persistence**: The popup's state is saved to `chrome.storage.local` keyed by the tab's ID. This allows the UI to be restored to its last known state (e.g., showing a previous answer) when the user reopens the popup on the same page, providing a seamless experience.

### Project Structure

```
GeminiAnswerBot/
├── assets/
│ ├── options.css
│ ├── popup.css
│ ├── dialog.css
│ └── ... (icons, images)
├── js/
│ ├── vendor/
│ │ └── marked.min.js
│ │ └── mark.min.js
│ ├── background.js # Service Worker, API calls, routing
│ ├── content.js # DOM interaction, text extraction
│ ├── popup.js # UI logic for the main popup
│ ├── options.js # UI logic for the settings page
│ └── prompts.js # Default system prompts for the AI
├── ui/
│ ├── options.html
│ └── popup.html
├── .gitignore
├── manifest.json
└── README.md
```


---

## Privacy & Security

GeminiAnswerBot is designed with privacy as a priority.

-   **No Data Collection**: The extension does not collect, store, or transmit any personal data or browsing history to any external servers.
-   **Local Storage**: Your Gemini API key and interaction history are stored exclusively in your browser's local storage (`chrome.storage.sync` and `chrome.storage.local`). They are never sent anywhere except directly to the Google Gemini API from your browser.

---

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.