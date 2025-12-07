<div align="center">

# 🤖 GeminiAnswerBot

**AI-Powered Quiz Assistant | Asisten Quiz Berbasis AI**

[![Version](https://img.shields.io/badge/version-5.0.0-0a84ff?style=for-the-badge)](https://github.com/rzqllh/GeminiAnswerBot)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285f4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/rzqllh/GeminiAnswerBot)
[![Gemini](https://img.shields.io/badge/Powered_by-Gemini_AI-8e44ad?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

<img src="assets/icon.png" width="120" alt="GeminiAnswerBot Logo"/>

*A Chrome extension that uses Google Gemini AI to analyze quiz questions and provide intelligent answers with explanations.*

*Ekstensi Chrome yang menggunakan Google Gemini AI untuk menganalisis soal quiz dan memberikan jawaban cerdas beserta penjelasannya.*

[🚀 Get Started](#-installation) · [✨ Features](#-features) · [📖 Usage](#-how-to-use) · [🛠️ For Developers](#-for-developers)

</div>

---

## 🌟 What's New in v5.0

| Feature | Description |
|---------|-------------|
| **📚 Study Mode** | Save questions for later review with practice quiz functionality |
| **🤖 AI Personas** | Choose from 6 preset personas or create custom response styles |
| **🔄 Batch Mode** | Process multiple quiz tabs simultaneously with progress tracking |
| **🏷️ Tag System** | Categorize history items with predefined or custom tags |
| **📱 Floating Widget** | Draggable on-page widget with glassmorphism design (Alt+W) |
| **🧪 Answer Verification** | Cross-check AI answers with independent verification |

### Previous Features (v4.0)
- 🎯 Auto-Click Answer
- 📊 Confidence Score (High/Medium/Low)
- 🧠 Context Memory  
- 🌐 Multi-Language Support
- 🎨 Theme Customization
- 📄 PDF Export

---

## 💡 Why Use This?

**English:**  
Ever been stuck on an online quiz wishing someone could help? This extension does exactly that — it reads the question, understands the context, analyzes all options, and gives you a confident answer with clear reasoning. Unlike simple search tools, GeminiAnswerBot actually *comprehends* what's being asked using Google's advanced AI.

**Bahasa Indonesia:**  
Pernah stuck saat mengerjakan quiz online dan berharap ada yang bisa bantu? Ekstensi ini melakukan hal itu — membaca soal, memahami konteks, menganalisis semua pilihan, dan memberikan jawaban yang akurat dengan penjelasan yang jelas. Berbeda dengan tools pencarian biasa, GeminiAnswerBot benar-benar *memahami* pertanyaan menggunakan AI canggih dari Google.

---

## ✨ Features

| Feature | EN | ID |
|---------|----|----| 
| **Smart Detection** | Auto-detects quiz questions on any webpage | Deteksi otomatis soal quiz di website apapun |
| **AI Analysis** | Sends to Gemini AI for context-aware answers | Analisis menggunakan Gemini AI untuk jawaban kontekstual |
| **Visual Solve** | Screenshot mode for image-based questions | Mode screenshot untuk soal berbasis gambar |
| **Live Highlighting** | Highlights correct answer directly on page | Highlight jawaban benar langsung di halaman |
| **Streaming Response** | Watch AI think in real-time | Lihat AI berpikir secara real-time |
| **Explain Mode** | Detailed explanations to help you learn | Penjelasan detail untuk membantu belajar |
| **Study Mode** | Save & review questions with practice quiz | Simpan & review soal dengan quiz latihan |
| **AI Personas** | 6 preset + custom AI response styles | 6 preset + gaya respons AI custom |
| **Batch Processing** | Solve quizzes across multiple tabs | Selesaikan quiz di banyak tab sekaligus |
| **Custom Prompts** | Create your own AI instruction profiles | Buat profil instruksi AI custom |
| **History & Export** | Review past Q&A, export as JSON/PDF | Lihat riwayat Q&A, ekspor ke JSON/PDF |

---

## 🚀 Installation

### Prerequisites / Prasyarat
- Google Chrome (v88+)
- Gemini API Key (free tier available / tersedia gratis)

### Step-by-Step / Langkah-langkah

1. **Download the extension / Unduh ekstensi**
   ```bash
   git clone https://github.com/rzqllh/GeminiAnswerBot.git
   ```

2. **Open Chrome Extensions / Buka Chrome Extensions**
   - Navigate to `chrome://extensions`
   - Enable **Developer mode** (toggle top-right)
   - Aktifkan **Developer mode** (toggle di kanan atas)

3. **Load the extension / Muat ekstensi**
   - Click **Load unpacked**
   - Select the `GeminiAnswerBot` folder
   - Klik **Load unpacked**
   - Pilih folder `GeminiAnswerBot`

4. **Configure API Key / Konfigurasi API Key**
   - Click extension icon → ⚙️ Settings
   - Get your free key from [Google AI Studio](https://aistudio.google.com/apikey)
   - Paste and save
   - Klik ikon ekstensi → ⚙️ Settings
   - Ambil key gratis dari [Google AI Studio](https://aistudio.google.com/apikey)
   - Paste dan simpan

**Done! You're ready to go. / Selesai! Siap digunakan.**

---

## 📖 How to Use

### Basic Usage / Penggunaan Dasar

1. Go to any quiz page / Buka halaman quiz apapun
2. Click extension icon or press `Alt+Q` / Klik ikon ekstensi atau tekan `Alt+Q`
3. The AI automatically detects and answers / AI otomatis mendeteksi dan menjawab

### Study Mode (v5.0)

1. After getting an answer, click **Save to Study**
2. Go to Settings → Study Mode tab
3. Review saved questions or start **Practice Quiz**

### Batch Mode (v5.0)

1. Open multiple quiz tabs in Chrome
2. Go to Settings → Batch Mode tab
3. Click **Scan Tabs** → Select tabs → **Start Batch**

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Alt + Q` | Open popup / Buka popup |
| `Alt + W` | Toggle floating widget (v5.0) |

Configure at `chrome://extensions/shortcuts`

---

## ⚙️ Settings Overview

Access via extension icon → ⚙️ Settings

| Tab | Description |
|-----|-------------|
| **General** | API key, model selection, temperature |
| **Features** | Auto-click, context memory, display mode, language |
| **Appearance** | Theme presets, color mode (dark/light/auto), accent color |
| **Prompts** | Customize AI instructions for different scenarios |
| **History** | View, export, or clear past interactions |
| **Data** | Backup/restore settings, clear all data |
| **Study Mode** | Review saved questions, practice quiz (v5.0) |
| **AI Personas** | Select or create custom AI response styles (v5.0) |
| **Batch Mode** | Configure multi-tab processing (v5.0) |

---

## 🛠️ For Developers

### Project Structure

```
GeminiAnswerBot/
├── manifest.json          # Extension manifest (v3)
├── ui/
│   ├── popup.html         # Main popup interface
│   └── options.html       # Settings page (9 tabs)
├── js/
│   ├── popup.js           # Popup logic & state management
│   ├── content.js         # Page content extraction
│   ├── autoclick.js       # Auto-click answer functionality
│   ├── widget.js          # v5.0: Floating widget controller
│   ├── batch.js           # v5.0: Multi-tab batch processing
│   ├── prompts.js         # Default AI prompts
│   ├── services/
│   │   ├── GeminiService.js      # Gemini API handler
│   │   ├── StorageService.js     # Chrome storage wrapper
│   │   ├── MessagingService.js   # Inter-script communication
│   │   └── VerificationService.js # v5.0: Answer verification
│   └── options/
│       ├── options.js     # Settings page controller
│       ├── features.js    # v4.0 features UI
│       ├── history.js     # History management
│       ├── tags.js        # v5.0: Tag management
│       ├── personas.js    # v5.0: AI personas
│       ├── study.js       # v5.0: Study mode
│       └── nav.js         # Tab navigation
├── assets/
│   ├── popup.css          # Popup styles
│   ├── options.css        # Settings page styles
│   ├── widget.css         # v5.0: Floating widget styles
│   ├── content.css        # Page injection styles
│   └── icon.png           # Extension icon
└── docs/
    ├── Changelog.md
    └── SECURITY.md
```

### Key Technologies

- **Manifest V3** - Latest Chrome extension API
- **Gemini API** - Google's generative AI models
- **Chrome Storage API** - Persistent settings storage
- **CSS Variables** - Dynamic theming system
- **EventBus Pattern** - Internal state communication

### Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 🔒 Privacy

| Data | Storage |
|------|---------|
| API Key | Local Chrome encrypted storage only |
| Quiz Content | Sent only to official Gemini API |
| User Data | Never collected or transmitted |
| Source Code | Fully open source for audit |

---

## 📬 Contact

- **GitHub Issues:** [Report bugs / Request features](https://github.com/rzqllh/GeminiAnswerBot/issues)
- **Email:** rzqllh18@gmail.com

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

<div align="center">

**Built with ☕ by [Hafizh Rizqullah](https://github.com/rzqllh)**

*If this helped you, consider giving a ⭐*

*Kalau ini membantu, pertimbangkan untuk kasih ⭐*

</div>
