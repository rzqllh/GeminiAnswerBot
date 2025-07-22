# ✨ GeminiAnswerBot

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-18.3-brightgreen)

GeminiAnswerBot is an intelligent Chrome extension designed to enhance your web Browse experience. Powered by the Google Gemini API, it analyzes on-page content to automatically solve quizzes, provide contextual actions, and deliver AI-driven insights directly within your browser.

![Screenshot of the extension's options page.](https://i.imgur.com/your-screenshot-url.png)
*(**Note:** Replace the URL above with a link to a screenshot of your finished options page.)*

---

## 🚀 Key Features

-   **🧠 Smart Quiz Solver**: Intelligently detects, extracts, and solves quiz questions found on a webpage.
-   ** HIGHLIGHT On-Page Highlighting**: Automatically highlights the correct answer directly on the page for maximum visibility.
-   **🤖 Intelligent Context Menu**: Select any text on a page, then right-click to:
    -   **Summarize**: Get a concise summary.
    -   **Explain**: Receive a detailed explanation.
    -   **Translate**: Translate the text.
    -   **Rephrase**: Rephrase the text into different styles.
-   **🖥️ Modern Dashboard UI**: A sleek, macOS-inspired options page with a transparent blur effect to manage all settings.
-   **⚙️ Full Customization**: Set your API Key, choose your preferred AI model (1.5 Flash, 1.5 Pro, etc.), customize system prompts, and configure other preferences.
-   **📜 Integrated History**: Access all your previous AI interactions and answers directly from the history panel within the options dashboard.

## 🛠️ Getting Started

Follow these instructions to install and configure the extension for development and testing.

### Prerequisites

-   A Chromium-based browser (Google Chrome, Brave, Microsoft Edge).

### Installation

1.  **Download/Clone:** Download this project as a ZIP file and extract it, or clone the repository using `git clone`.
2.  **Open Extensions Page:** Navigate to `chrome://extensions/` in your browser.
3.  **Enable Developer Mode:** Toggle on the **"Developer mode"** switch, usually found in the top-right corner.
4.  **Load the Extension:** Click the **"Load unpacked"** button and select the extracted project folder.
5.  **Done!** The GeminiAnswerBot icon will now appear in your browser's toolbar.

### Configuration

This extension requires your personal Gemini API Key to function.

1.  Visit [**Google AI Studio**](https://aistudio.google.com/) and sign in.
2.  Click **"Get API key"** and then **"Create API key in new project"**.
3.  Copy the generated API key.
4.  Open the GeminiAnswerBot **Options** page (right-click the extension icon > Options).
5.  Navigate to the **General** tab, paste your API key into the designated field, and click **"Save General Settings"**.
6.  Use the **"Test Connection"** button to validate your key.

## 📂 Project Structure

The project is organized with a clear separation of concerns for scalability and maintenance.

```
GeminiAnswerBot/
├── assets/
│   ├── libs/
│   │   └── toastify.css
│   ├── options.css
│   └── popup.css
├── js/
│   ├── background.js       # Service worker for events & API calls
│   ├── content.js          # Injected content script
│   ├── options.js          # Logic for the options dashboard
│   └── prompts.js          # Default prompts for the AI
├── ui/
│   ├── options.html        # UI for Options, History, and Data
│   └── popup.html          # Main extension popup UI
├── .gitignore              # Files to be ignored by Git
├── manifest.json           # Core extension configuration file
└── README.md               # This documentation
```

## 💻 Tech Stack

-   **HTML5**
-   **CSS3** (Flexbox, CSS Variables, Backdrop Filter)
-   **Vanilla JavaScript**
-   **Chrome Extension APIs (Manifest V3)**
-   **Google Gemini API**

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to fork the repository, open an issue, or submit a pull request.

## 📃 License

This project is licensed under the **MIT License**.