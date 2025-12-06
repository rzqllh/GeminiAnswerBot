# GeminiAnswerBot 🤖

> AI-powered quiz assistant using Google Gemini

![Version](https://img.shields.io/badge/version-3.4.2-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Chrome](https://img.shields.io/badge/Chrome-Extension-yellow)

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **Auto Quiz Detection** | Automatically finds quiz questions on any webpage |
| 🤖 **AI-Powered Answers** | Uses Google Gemini for accurate responses |
| 📸 **Visual Solve** | Capture screenshots for image-based questions |
| 🔍 **Answer Highlighting** | Highlights the correct answer on the page |
| ⚡ **Real-time Streaming** | See responses as they're generated |
| 📝 **Custom Prompts** | Create your own prompt profiles |
| 📊 **History Tracking** | Review past interactions |
| 🛡️ **Pre-submission Check** | Warning when selecting wrong answer |

## 🚀 Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store](#) *(coming soon)*
2. Click "Add to Chrome"
3. Done!

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome → `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `GeminiAnswerBot` folder

## ⚙️ Setup

### Get Your API Key
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key

### Configure the Extension
1. Click the GeminiAnswerBot icon in Chrome
2. Click the ⚙️ Settings button
3. Paste your API key in the "Gemini API Key" field
4. Save!

## 📖 How to Use

### Basic Usage
1. Navigate to any quiz page
2. Click the GeminiAnswerBot icon (or press `Alt+Q`)
3. The extension automatically:
   - Detects the quiz question
   - Sends it to Gemini AI
   - Displays the answer
   - Highlights it on the page

### Visual Solve (for images)
1. Click the 📷 camera icon
2. The extension captures a screenshot
3. AI analyzes the image and extracts the question
4. Provides the answer

### Pre-submission Protection
When enabled, if you select a different answer than the AI suggests:
- A confirmation dialog appears
- You can choose to continue or reconsider

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Q` | Open GeminiAnswerBot |

## 🎨 UI Preview

The extension features a modern iOS 26-inspired liquid glass design with:
- Glassmorphism panels
- Gradient backgrounds
- Smooth animations
- Dark mode support

## 🔒 Privacy & Security

- ✅ API key stored locally (never sent to our servers)
- ✅ No data collection or tracking
- ✅ Direct communication with Google AI only
- ✅ Open source - verify the code yourself

[Read full Security Policy](./docs/SECURITY.md)

## 📋 Requirements

- Google Chrome (version 88+)
- A Gemini API key (free tier available)
- Internet connection

## ⚠️ Known Issues

> **Pre-submission Check Bug**: The pre-submission check feature currently has bugs that may block the Next button. It is recommended to **disable this feature** in Settings until we release a fix. We are working on it!

## ❓ FAQ

**Q: Is this free?**
A: The extension is free. Gemini API has a free tier with generous limits.

**Q: Does this work on all quiz sites?**
A: It works on most sites with radio/checkbox questions. Some sites may have custom implementations that aren't detected.

**Q: Is my API key safe?**
A: Yes! It's stored locally in Chrome's secure storage and only sent to Google's official API.

**Q: Can I customize the AI prompts?**
A: Yes! Go to Settings → Prompts to create custom prompt profiles.

## 🤝 Support

- 📝 [Report Issues](../../issues)
- 💬 [Discussions](../../discussions)
- 📧 Email: support@example.com

## 📜 License

MIT License - feel free to use, modify, and distribute.

---

**Made with ❤️ by Hafizh Rizqullah**

*If this helped you, consider giving it a ⭐!*
