// === Hafizh Rizqullah | GeminiAnswerBot ===
// 🔒 Created by Hafizh Rizqullah || Refine by AI Assistant
// 📄 README.md
// 🕓 Created: 2024-05-22 14:30:00
// 🧠 Modular | DRY | SOLID | Apple HIG Compliant

# GeminiAnswerBot

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Maintained](https://img.shields.io/badge/Maintained-Yes-brightgreen)

**GeminiAnswerBot** is an intelligent, privacy-first Chrome extension that leverages the Google Gemini API to supercharge your browsing experience. It features a sophisticated, context-aware engine to solve quizzes, summarize articles, and provide a suite of AI tools directly in your browser, all wrapped in a polished, professional user interface.

---

## Core Features

-   **🧠 Smart & Context-Aware Quiz Solver**: Unlike other tools, GeminiAnswerBot uses a **viewport-aware algorithm** to intelligently identify and solve the quiz question *you are currently looking at*. It excels on long pages with multiple questions, ensuring unparalleled accuracy.

-   **🛠️ Contextual AI Toolkit**: Right-click or use the floating toolbar on any selected text to:
    -   **Summarize**: Get a concise summary of long articles.
    -   **Explain**: Understand complex topics with detailed explanations.
    -   **Translate**: Instantly translate text into multiple languages.

-   **🖼️ Image Analysis**: Right-click on any image to understand its content, solve quizzes embedded within the image, or translate text found in the picture.

-   **✨ Professional & Intuitive UI**: A clean, modern, and intuitive user interface aligned with **Apple's Human Interface Guidelines (HIG)**. Features include:
    -   Elegant **skeleton loaders** for a premium user experience.
    -   Consistent typography and layout for maximum readability.
    -   A fully-featured, easy-to-navigate options page.

-   **🚀 High Performance & Privacy**: Built with a performance-first approach using Manifest V3. Your API key and interaction history are stored exclusively in your browser's local storage and are never sent anywhere except directly to the Google Gemini API.

-   **🔧 Robust & Resilient**: The extraction engine is designed to handle a wide variety of non-standard HTML layouts, ensuring it works reliably across many different websites.

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

This extension is built using Manifest V3 and follows a modern, modular, and performance-aware architecture that emphasizes a clear separation of concerns.

### Key Scripts & Responsibilities

-   `js/background.js`: The service worker. Manages browser-level events, context menus, and acts as the central controller for reliable message passing between components.
-   `js/content.js`: Injected on-demand. Handles all direct DOM interaction, including the sophisticated **synchronous viewport calculation** for quiz extraction and the floating toolbar logic.
-   `js/popup.js`: Manages the entire UI and state of the popup window, including rendering skeleton loaders and handling user interactions.
-   `js/options/`: A **modularized directory** where each file (`nav.js`, `history.js`, `settings.js`, `ui.js`) handles a single responsibility on the options page, adhering to SOLID principles.
-   `js/prompts.js`: A centralized repository for all system prompts sent to the Gemini API, allowing for easy tuning and customization.

### Project Structure

```Structure
GeminiAnswerBot/
├── assets/
├── js/
│ ├── options/
│ │ ├── history.js
│ │ ├── nav.js
│ │ ├── settings.js
│ │ └── ui.js
│ ├── vendor/
│ ├── background.js
│ ├── content.js
│ ├── options.js # (Main orchestrator)
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