# GeminiAnswerBot

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-18.3-brightgreen)

**GeminiAnswerBot** is a smart, privacy-first Chrome extension powered by the Google Gemini API. It analyzes on-page content to intelligently solve quizzes, enhance selected text, and provide AI-powered context tools — all directly in your browser.

---

## Key Features

- **Smart Quiz Solver**: Detects and solves quiz questions automatically on supported pages.
- **Answer Highlighting**: Highlights the correct answers inline, directly in the DOM.
- **Contextual Text Actions**: Right-click on selected text to:
  - Summarize
  - Explain
  - Translate
  - Rephrase
- **Modern Settings Dashboard**: A macOS-inspired options interface with a blur-glass aesthetic.
- **Customizable AI**: Set your Gemini API key, select models (1.5 Flash, Pro, etc.), customize system prompts, and tweak behavior.
- **Local History Panel**: View all past AI interactions within the dashboard, stored securely in local storage.

---

## Use Case Scenarios

- Instantly solve and highlight quiz answers on e-learning platforms.
- Summarize or explain dense documentation while reading.
- Translate or rephrase selected text in real-time without leaving the page.
- Build your own prompt system and agent behaviors for Gemini through prompt injection.

---

## Getting Started

### Prerequisites

- A Chromium-based browser (Chrome, Edge, Brave, etc.)
- A valid Google Gemini API key

### Installation

1. Download or clone this repository.
2. Go to `chrome://extensions/` in your browser.
3. Enable **Developer Mode**.
4. Click **Load Unpacked** and select the extracted project folder.
5. The extension icon should now appear in your toolbar.

---

## Configuration

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **"Get API key"** → **"Create API key in new project"**.
3. Copy the key.
4. Open GeminiAnswerBot Options (right-click icon > Options).
5. Paste your API key in the **General** tab, then click **Save**.
6. Use the **"Test Connection"** button to validate your key.

---

## Advanced Configuration

GeminiAnswerBot includes an Advanced tab within the Options page, offering additional customization features:

- Define custom system prompts and templates.
- Adjust quiz tolerance level (strict vs lenient).
- Toggle logging, clipboard behavior, or auto-answer delay.
- UI theme preferences (light/dark/auto).

### UI Previews

| Advanced Settings Overview | Prompt Template Editor |
|----------------------------|------------------------|
| ![Advanced Tab](https://i.imgur.com/kcafLc9.png) | ![Prompt Editor](https://i.imgur.com/4KubPAL.png) |

---

## Troubleshooting

**API Key not working?**
- Ensure the key comes from AI Studio, not OAuth credentials.
- Use the "Test Connection" button to validate the key.
- Try regenerating a new key from a fresh project if needed.

**Quiz detection not working?**
- The page might use shadow DOM or iframes (partial support).
- Refresh the page after installing or enabling the extension.

---

## Project Structure

The project is organized with a clear separation of concerns for scalability and maintenance.
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

## Privacy & Security

GeminiAnswerBot **does not collect any personal data**. All processing happens locally in your browser. Your Gemini API key is stored only in your local browser storage and never transmitted externally.

## Known Issues

- On some dynamic websites (e.g., using React or Shadow DOM), quiz extraction may be delayed.
- Google Gemini API may return slightly inconsistent results depending on model latency.


---

## Development Notes

- Use `content.js` to inject quiz logic and page scanning.
- `background.js` handles Gemini API communication.
- All UI logic for settings is handled in `options.js`.
- Prompts can be edited directly via `prompts.js`.

After any changes, go to `chrome://extensions/` and click **Reload** on GeminiAnswerBot.

---

## Changelog

### [1.3.0] - 2025-07-22
This version focuses on reliability, feature integration, and final polishing by removing external dependencies and centralizing the user experience.

Added
- Custom Notification System: Implemented a dependency-free, native-style notification system from scratch to provide reliable user feedback.
- Integrated History Panel: Merged the full functionality of the History page directly into the options dashboard under a new "History" tab for a unified experience.
- Data Management Tab: Added a new "Data" tab to the options sidebar, creating a dedicated space for actions like clearing history.
- Sidebar Icons: Added SVG icons to each sidebar item ("General", "Prompts", etc.) to improve visual navigation.

Changed
- Improved History Formatting: "Question Content" in the history panel is now automatically parsed and formatted into a clean, readable question-and-list format.

Fixed
- Critical JavaScript Error: Permanently resolved the persistent `Toastify is not defined` error by completely removing the external library dependency.
- Missing Prompt Content: Fixed a regression bug where prompt textarea elements appeared empty due to missing variable declarations in `options.js`.

Removed
- **Toastify.js Library**: Removed the external `toastify.js` and `toastify.css` library files in favor of the new custom notification system.
- **Standalone History Page**: Removed the `ui/history.html` and `js/history.js` files, as their functionality is now fully integrated into the options page.

### [1.2.0]
This release focused on a complete visual overhaul of the settings experience, migrating from a basic page to a modern, professional dashboard.

Added
- Dashboard UI: Completely redesigned the options page into a two-column dashboard with sidebar navigation ("General", "Prompts").
- macOS-inspired Styling: Implemented a new CSS theme from the ground up to align with Apple's Human Interface Guidelines (HIG), featuring improved typography, spacing, and color palette.
- Transparent Blur Effect: Added a "frosted glass" effect to the sidebar using `backdrop-filter` for a native, modern feel.
- Separate Save Buttons: Implemented distinct "Save" buttons for the "General" and "Prompts" sections to improve user clarity.
- API Key Reveal Icon: Added an icon to the API key input field to show or hide the key.

Changed
- Button Consistency: Refactored all buttons to use a consistent base `.button` class with modifiers (`.button-primary`, `.button-secondary`, `.button-danger`) for a uniform look and feel.

### [1.1.0]
This update focused on refactoring the codebase for better maintainability and enhancing the core context menu features.

Added
- "Rephrase" Context Menu: Added a new "Rephrase this" action to the right-click context menu.
- Rephrase Language Setting: Added a setting in the options page to define target languages for the rephrase feature.

Changed
- Centralized Prompts (DRY): Refactored all default system prompts into a single source of truth, `js/prompts.js`, to eliminate code duplication.
- Improved History UI: Relocated the "Clear History" button to the header of the history page for better usability.

Fixed
- Corrected an invalid model name (`gemin-pro-latest`) in `options.html`.
- Fixed an invalid charset declaration in `history.html`.

Removed
- Removed the "Define this" action from the context menu to streamline options.

### [1.0.0]
Initial release of the GeminiAnswerBot extension.

Added
- Core quiz-solving functionality with automatic content extraction.
- On-page answer highlighting using Mark.js.
- Context menu actions: Summarize, Explain, Translate.
- Basic UI for the popup, options, and a standalone history page.
- State and history management using `chrome.storage`.

---

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

---

## Contributing

Pull requests are welcome! If you have suggestions or bug reports, please open an issue or fork and contribute.

---

## License

This project is licensed under the **MIT License**.

## Contact & Credits

Made with 💡 by [Hafizh Rizqullah](https://github.com/rzqllh18)  
Inspired by tools like ChatGPT Sidebar, Gemini Studio, and more.

For feedback, reach out via GitHub Issues or open a PR 🙌