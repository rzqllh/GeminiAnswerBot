<!-- OG IMAGE PREVIEW HACK -->
<!-- https://github.com/rzqllh/GeminiAnswerBot -->
<!-- OG:image:https://raw.githubusercontent.com/rzqllh/GeminiAnswerBot/main/assets/icon.png -->



<div align="center">
  <a href="#">
    <img src="https://raw.githubusercontent.com/rzqllh/GeminiAnswerBot/main/assets/icon.png" alt="GeminiAnswerBot Logo" width="128" height="128">
  </a>

  <h1><strong>GeminiAnswerBot</strong></h1>

  <p><strong>Context-Aware AI Copilot for Seamless Quiz & Content Assistance</strong></p>
  <p>Engineered for precision, privacy, and an exceptional in-browser experience.</p>

  <p>
    <img src="https://img.shields.io/badge/version-3.0.0-blue?style=for-the-badge" alt="Version">
    <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License">
    <img src="https://img.shields.io/badge/status-actively--maintained-brightgreen?style=for-the-badge" alt="Maintained">
  </p>
</div>

---

> “Well-architected code is invisible to the user — they just feel it works.”

---

## Overview

**GeminiAnswerBot** is a modular Chrome Extension built to enhance how you solve quizzes, extract insights, and interact with content — all powered by Google Gemini. Unlike typical AI plugins, it's engineered from the ground up to prioritize context-awareness, performance, and user privacy.

---

## Quick Preview

- ✅ Right-click any quiz or text → AI-powered actions appear instantly
- ✅ Choose from: Solve, Summarize, Explain, Translate
- ✅ Visual quizzes? Just right-click the image to extract insights
- ✅ Results appear within context via a refined popup interface

---

## Why GeminiAnswerBot?

| Feature                | Typical AI Tools                          | GeminiAnswerBot's Approach                                                                 |
|------------------------|-------------------------------------------|--------------------------------------------------------------------------------------------|
| Quiz Handling          | Full-page scraping, often inaccurate      | Context-aware: Only analyzes visible content for precise targeting                        |
| UI/UX                  | Generic interfaces, jarring transitions   | Built with Apple HIG principles: clean layout, smooth loaders, consistent interactions    |
| Architecture           | Monolithic scripts, hard to maintain      | Fully modular: Each feature lives in its own logical boundary, adhering to SOLID principles |
| Image Support          | Usually unsupported                      | Native image-based quiz solving via Gemini Vision Pro                                     |
| Privacy                | Sends data to unknown servers             | 100% local processing, with direct API call to Gemini — no third-party server involved     |

---

## Core Features

- **Precision Quiz Solving**  
  Viewport-aware engine that intelligently detects the active quiz in view.

- **Inline AI Toolkit**  
  Right-click selected text for instant:
  - Summarization
  - Concept explanation
  - Translation

- **Advanced Image Analysis**  
  Right-click images to solve embedded questions, translate, or get structured descriptions.

- **Modular Codebase**  
  Engineered with separation of concerns:
  - `background.js`: Handles context menu & service workers
  - `popup.js`: UI state, loaders, result rendering
  - `content.js`: DOM parsing, floating UI
  - `options/*.js`: Micro-modules for settings, history, UI

- **Zero Backend, Full Privacy**  
  API key is stored only in local browser storage. Nothing is sent to external servers.

---

## Designed For

- Teams using quiz-based learning tools
- Engineers exploring Chrome Extension architecture best practices
- Researchers working with Gemini APIs & prompt customization

---

## Installation

### Prerequisites

- Chromium-based browser (Chrome, Edge, Brave, etc.)
- A valid Google Gemini API Key

### Steps

1. **Download** this repo and unzip it
2. Open `chrome://extensions/` and enable Developer Mode
3. Click **Load unpacked** and select the project folder
4. Right-click the GeminiAnswerBot icon → **Options**
5. Paste your Gemini API Key in the “General” tab → click Save
6. Use the **Test Connection** button to verify you're set

---

## Under the Hood

GeminiAnswerBot is built with the following principles:

- **Single Responsibility (SOLID)**  
  Each module handles one job: no cross-dependency or shared global state

- **On-Demand Injection**  
  Scripts are loaded only when needed for zero memory overhead

- **Robust Message Passing**  
  Background, content, and popup scripts communicate via a structured protocol

- **Context-Aware DOM Parsing**  
  DOM scanning adapts to what user sees on screen, not the full page

---

## Technology Stack

- **Platform**: Chrome Manifest V3
- **Core Language**: JavaScript (ES6+)
- **Rendering**: DOMPurify + Marked.js (secure Markdown to HTML)
- **Styling**: Plain CSS (with custom properties + BEM convention)
- **Design Guideline**: Apple Human Interface Guidelines (HIG)

---

## What's Next

- Firefox support
- User-defined AI prompt profiles
- Gemini 1.5 Pro integration toggle
- Export/import configuration presets

---

## FAQ

> **Does this extension send any data to a server?**  
No. Everything runs locally. Only Gemini’s API is called directly using your key.

> **Can I use this without an API Key?**  
No. You must bring your own key from Google AI Studio.

> **Does it work with long articles or dynamic content?**  
Yes. Parsing engine adapts to dynamic layouts and supports scroll-aware rendering.

---

## License

This project is licensed under the MIT License.

---

<p align="center">
  <em>Built with care and craftsmanship by Hafizh Rizqullah — refined for seamless use.</em>
</p>
