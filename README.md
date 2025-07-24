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

| Advanced Settings Overview                       | Prompt Template Editor                            |
| ------------------------------------------------ | ------------------------------------------------- |
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

### [1.4.1] - 2025-07-24

Fixed

- Resolved a startup error on the Options page (`TypeError: Cannot set properties of null`) caused by JavaScript logic referencing HTML elements that were removed in the recent UI rework.

### [1.4.0] - 2025-07-24

Added

- Automatic Dark Mode support for the popup UI, adapting to the user's system theme for enhanced visual comfort.

Changed

- **Major UI Rework**: Completely redesigned the popup interface to align with Apple's Human Interface Guidelines. The new design features significantly improved readability, color contrast, and a more spacious, modern layout.

### [1.3.1] - 2025-07-24

Fixed

- Improved API stability by adding robust error handling for empty or invalid streams from the Gemini API, preventing the extension from hanging and providing clearer error messages to the user.

### [1.3.0] - 2025-07-22

This version focuses on reliability, feature integration, and final polishing by removing external dependencies and centralizing the user experience.

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
