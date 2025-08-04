<div align="center">
  <a href="#">
    <img src="https://raw.githubusercontent.com/rzqllh/GeminiAnswerBot/main/assets/icon.png" alt="GeminiAnswerBot Logo" width="128" height="128">
  </a>

  <h1><strong>GeminiAnswerBot</strong></h1>

  <p><strong>Context-Aware AI Copilot for Quiz Solving and Instant Content Assistance</strong></p>
  <p>Engineered for accuracy, privacy, and seamless browser integration — powered by Google Gemini.</p>

  <p>
    <img src="https://img.shields.io/badge/version-3.0.0-blue?style=for-the-badge" alt="Version">
    <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License">
    <img src="https://img.shields.io/badge/status-actively--maintained-brightgreen?style=for-the-badge" alt="Maintained">
  </p>
</div>

<!-- OG:image:https://raw.githubusercontent.com/rzqllh/GeminiAnswerBot/main/assets/og-image.png -->

---

> “Well-architected tools disappear into your workflow — until you realize you can’t work without them.”

---

## 🔍 Overview

**GeminiAnswerBot** is a context-aware AI assistant designed to solve quizzes, summarize content, and assist with natural language understanding — right inside your browser. It leverages the Gemini API to deliver high-accuracy answers, with an interface crafted for speed and usability.

> No telemetry, no tracking. Everything runs locally.

---

## ⚡ Quick Capabilities

```
✔️ Solve visible quizzes with a single click
✔️ Summarize, explain, or translate selected text
✔️ Analyze image-based questions (Gemini Vision)
✔️ Refined UI with loading states and shortcuts
✔️ Modular architecture built for maintainability
```

---

## 🎯 Built for

- Teams using LMS platforms or internal quiz tools
- Engineers evaluating Chrome Extension architecture
- Researchers using Gemini for applied NLP tasks

---

## 📸 Preview

<p align="center">
  <img src="https://raw.githubusercontent.com/rzqllh/GeminiAnswerBot/main/assets/og-image.png" alt="GeminiAnswerBot OG Preview" width="80%">
</p>

---

## 🔧 Features

### ✅ Context-Aware Quiz Solving  
Intelligently detects and solves only the quiz elements in your current viewport.

### 📄 AI Toolkit for Text  
Right-click selected text to:
- Summarize
- Explain concepts
- Translate instantly

### 🖼 Image Intelligence  
Right-click any image to:
- Solve embedded questions
- Read or translate visual content

### 🧩 Modular Codebase  
Fully SOLID, readable, and maintainable with:
- `content.js` → DOM parsing & interaction
- `popup.js` → View logic & AI rendering
- `background.js` → Chrome API handler
- `options/*.js` → Micro-modules for settings & history

### 🔐 Privacy-First  
No tracking. Your API key and history are stored **locally only**.

---

## 🚀 Getting Started

### Requirements

- Chromium-based browser (Chrome, Edge, Brave)
- Google Gemini API key

### Install

1. Clone or download this repository
2. Go to `chrome://extensions/`
3. Enable **Developer Mode**
4. Click **Load Unpacked**, select this folder
5. Right-click the extension icon → **Options**
6. Paste your API Key → Save → Test Connection

---

## 🧠 Architecture

```
├── js/
│ ├── content.js # DOM observer, viewport scanner
│ ├── popup.js # UI logic, rendering, feedback
│ ├── background.js # Chrome events, messaging
│ └── options/
│ ├── ui.js
│ ├── nav.js
│ ├── history.js
│ └── settings.js
├── assets/ # CSS, icon, og-image
├── ui/ # popup.html, options.html
└── manifest.json
```


- Uses message-passing for clear separation of concerns
- Loads scripts on-demand for performance
- Uses CSS variables & BEM for styling

---

## 🔍 What's Next

- Gemini 1.5 Pro toggle support
- Firefox compatibility
- Prompt profile presets & config import/export

---

## ❓ FAQ

> **Does it send data to a backend?**  
No. Everything runs locally. API key calls only go to Google Gemini.

> **Is this production-ready?**  
Yes. This extension has been tested on Chrome v124+ with Gemini API 1.5.

> **Can I use this without a key?**  
No. You must bring your own Gemini API key.

---

## 👨‍💻 Contributing

While the repo is public, it is maintained primarily for internal usage. Forks are welcome. Feature requests via Issues are appreciated but not guaranteed.

---

## 📜 License

[MIT License](./LICENSE)

---

<p align="center">
  <em>Crafted by Hafizh Rizqullah — built for clarity, speed, and elegance in everyday tools.</em>
</p>
