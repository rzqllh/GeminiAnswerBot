# GeminiAnswerBot - Technical Documentation
# Dokumentasi Teknis

> Developer guide for contributing to and understanding the codebase
> 
> Panduan developer untuk berkontribusi dan memahami struktur kode

---

## 📁 Project Structure / Struktur Proyek

```
GeminiAnswerBot/
├── manifest.json           # Chrome extension manifest (MV3)
├── README.md               # User documentation (bilingual)
├── README_TECH.md          # This file / File ini
│
├── ui/                     # HTML entry points
│   ├── popup.html          # Main popup interface
│   └── options.html        # Settings page (6 tabs)
│
├── assets/                 # Static assets
│   ├── popup.css           # Popup styles (iOS Liquid Glass design)
│   ├── content.css         # Injected page styles
│   ├── options.css         # Settings page styles (Apple HIG)
│   └── icon.png            # Extension icon
│
├── js/
│   ├── background.js       # Service worker (MV3)
│   ├── content.js          # Content script (page extraction)
│   ├── popup.js            # Popup controller & state management
│   ├── prompts.js          # Default AI prompt templates
│   ├── autoclick.js        # v4.0: Auto-click answer functionality
│   │
│   ├── core/               # Core modules
│   │   ├── Store.js        # Reactive state management
│   │   └── EventBus.js     # Pub/sub event system
│   │
│   ├── services/           # Business logic layer
│   │   ├── GeminiService.js      # Gemini API + streaming
│   │   ├── StorageService.js     # Chrome storage wrapper
│   │   ├── MessagingService.js   # Inter-script communication
│   │   └── NotificationService.js # Toast notifications
│   │
│   ├── ui/                 # UI components
│   │   ├── UIManager.js    # Main UI controller
│   │   └── ViewRenderer.js # DOM manipulation helpers
│   │
│   ├── options/            # Settings page modules
│   │   ├── options.js      # Main controller
│   │   ├── settings.js     # General settings tab
│   │   ├── features.js     # v4.0: Features & Appearance tabs
│   │   ├── prompts.js      # Custom prompts management
│   │   ├── history.js      # History display & export
│   │   ├── data.js         # Backup/restore functionality
│   │   └── nav.js          # Tab navigation system
│   │
│   ├── utils/              # Utilities
│   │   ├── storage.js      # StorageManager singleton
│   │   └── helpers.js      # _escapeHtml, _cleanMarkdown, etc.
│   │
│   └── vendor/             # Third-party libraries
│       ├── mark.min.js     # Text highlighting
│       ├── marked.min.js   # Markdown parsing
│       ├── dompurify.min.js # HTML sanitization
│       └── lucide.js       # Icon library
│
└── docs/                   # Additional documentation
    ├── Changelog.md
    ├── SECURITY.md
    └── SUPPORT.md
```

---

## 🏗️ Architecture / Arsitektur

### Manifest V3 Compliance
- Background runs as **service worker** (non-persistent)
- Uses `chrome.scripting` for dynamic script injection
- Event-driven message passing between contexts

### State Management / Manajemen State
```javascript
// Store.js - Simple reactive store
// Store.js - Store reaktif sederhana
const store = new Store({ view: 'loading', answer: null, confidenceScore: null });
store.subscribe(state => render(state));
store.setState({ answer: 'New answer', confidenceScore: 'High' });
```

### Event System / Sistem Event
```javascript
// EventBus.js - Pub/sub pattern
eventBus.on('ui:rescan', () => { /* handle rescan */ });
eventBus.emit('stream:update', { purpose: 'answer', fullText });
eventBus.emit('stream:done', { purpose: 'answer', finalText, confidenceScore: 'High' });
```

### Message Flow / Alur Pesan
```
┌─────────┐    ┌────────────┐    ┌────────────────┐
│  Popup  │◄──►│ Background │◄──►│ Content Script │
└─────────┘    └──────┬─────┘    └────────────────┘
                      │
               ┌──────▼──────┐
               │ Gemini API  │
               └─────────────┘
```

---

## 🆕 v4.0 New Components / Komponen Baru v4.0

### autoclick.js
Handles automatic answer selection on quiz pages:
```javascript
// Score-based matching for special characters like /, <, >
function _matchScore(text1, text2) {
  // Compares normalized text for answer matching
}

// Finds and clicks the best matching radio button
function findAndClickAnswer(answer, options) {
  // Iterates through form inputs to find match
}
```

### features.js
Manages v4.0 feature settings UI:
- Auto-click toggle, Context memory, Display mode
- Theme presets (Ocean, Sunset, Neon, Midnight)
- Dark/Light/Auto color modes
- Accent color picker

### Enhanced GeminiService.js
- **Multi-language support**: Injects language preference into prompts
- **Context memory**: Includes previous Q&A pairs for better accuracy
- **Confidence extraction**: Parses High/Medium/Low from responses

---

## 🔧 Key Components / Komponen Utama

### GeminiService
Handles API communication with streaming:
```javascript
// Call with streaming response / Panggil dengan streaming response
await geminiService.call('answer', content, null, tabId);

// Events emitted / Event yang dipancarkan:
// - stream:update { purpose, fullText }
// - stream:done { purpose, finalText, confidenceScore }
```

### MessagingService
Tab communication with auto-injection:
```javascript
// Ensure content script loaded / Pastikan content script termuat
await MessagingService.ensureContentScript(tabId);

// Send message / Kirim pesan
await MessagingService.sendMessage(tabId, { 
  action: 'highlight-answer', 
  answer: 'Option A' 
});

// v4.0: Auto-click answer
await MessagingService.autoClickAnswer(tabId, answer, options);
```

### Content Script Modules

| Module | EN | ID |
|--------|----|----|
| `MarkerModule` | Text highlighting with Mark.js | Highlighting teks dengan Mark.js |
| `QuizModule` | Question/option extraction | Ekstraksi soal/pilihan |
| `PageModule` | Full page content extraction | Ekstraksi konten halaman penuh |
| `ContentController` | Message handling orchestrator | Orkestrator penanganan pesan |

---

## 🧪 Testing / Pengujian

### Manual Testing Checklist
```
- [ ] API key save/load
- [ ] Quiz detection (W3Schools, etc.)
- [ ] Visual Solve capture
- [ ] Answer highlighting
- [ ] Auto-click answer (v4.0)
- [ ] Confidence score display (v4.0)
- [ ] Theme switching (v4.0)
- [ ] History saving with confidence
- [ ] PDF export
- [ ] Multi-language response
```

### Console Debugging
```javascript
// Popup console - Check storage
chrome.storage.sync.get(null, console.log);
chrome.storage.local.get('history', console.log);

// Content script - Check injection status
window.geminiAnswerBotContentLoaded

// Background - Check service worker logs
// See: chrome://extensions → Service Worker
```

---

## 📝 Code Conventions / Konvensi Kode

### ES6 Modules
- Popup/options use `import/export` (ES modules)
- Content script uses IIFE pattern (non-module for injection)
- Background uses module service worker

### Naming
```javascript
// Classes: PascalCase
class GeminiService {}

// Functions: camelCase
function handleResponse() {}

// Private methods: _prefixedWithUnderscore
_parseConfidence(text) {}

// Constants: UPPER_SNAKE_CASE
const CACHE_KEY = 'gemini_state';
```

### CSS
- CSS Variables for theming (`--accent-color`, `--bg-color`)
- BEM-like class naming (`.panel-header`, `.btn-primary`)
- Mobile-first responsive design

---

## 🔌 API Integration

### Gemini API
```javascript
// Endpoint
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent

// Headers
x-goog-api-key: {API_KEY}
Content-Type: application/json

// Body structure
{
  "contents": [{ 
    "parts": [{ "text": "Question content here" }] 
  }],
  "systemInstruction": { 
    "parts": [{ "text": "System prompt here" }] 
  },
  "generationConfig": {
    "temperature": 0.7
  }
}
```

### Streaming Response (NDJSON)
```json
{"candidates":[{"content":{"parts":[{"text":"**Answer:**"}]}}]}
{"candidates":[{"content":{"parts":[{"text":" Option A\n\n**Confidence:**"}]}}]}
{"candidates":[{"content":{"parts":[{"text":" High"}]}}]}
```

---

## 🔐 Security / Keamanan

| Aspect | Implementation |
|--------|----------------|
| HTML Sanitization | DOMPurify before any `innerHTML` |
| XSS Prevention | `_escapeHtml()` for all user content |
| CSP Compliance | No inline scripts in HTML files |
| API Key Storage | `chrome.storage.sync` (Chrome encrypted) |
| Content Security | Manifest `content_security_policy` |

---

## 📦 Building for Production

```bash
# Package for Chrome Web Store
zip -r gemini-answer-bot-v4.0.zip . \
  -x "*.git*" \
  -x "node_modules/*" \
  -x "docs/*" \
  -x ".gemini/*" \
  -x "*.md"
```

---

## 🤝 Contributing / Berkontribusi

1. Fork the repository / Fork repositori
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Follow code conventions above / Ikuti konvensi kode di atas
4. Test thoroughly / Uji dengan teliti
5. Submit PR with clear description / Submit PR dengan deskripsi jelas

---

## 📋 Dependencies

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| Mark.js | 8.11.1 | MIT | Text highlighting |
| Marked | 9.x | MIT | Markdown parsing |
| DOMPurify | 3.x | Apache-2.0 | XSS prevention |
| Lucide | 0.x | ISC | Icon library |

---

## 🐛 Common Issues / Masalah Umum

| Issue | Solution |
|-------|----------|
| "Receiving end does not exist" | Call `ensureContentScript()` before messaging |
| Modal not appearing | Check `_escapeHtml` helper is loaded |
| Highlight not working | Verify `mark.min.js` in `web_accessible_resources` |
| Confidence shows N/A | Check regex matches `**Confidence:** High` format |
| Auto-click wrong answer | Verify `_matchScore()` handles special chars |

---

**Maintainer:** Hafizh Rizqullah (@rzqllh)

**Last Updated:** v4.0 - December 2025
