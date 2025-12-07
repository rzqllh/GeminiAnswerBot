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
│   └── options.html        # Settings page (9 tabs)
│
├── assets/                 # Static assets
│   ├── popup.css           # Popup styles (iOS Liquid Glass design)
│   ├── content.css         # Injected page styles
│   ├── options.css         # Settings page styles (Apple HIG)
│   ├── widget.css          # v5.0: Floating widget styles
│   └── icon.png            # Extension icon
│
├── js/
│   ├── background.js       # Service worker (MV3)
│   ├── content.js          # Content script (page extraction)
│   ├── popup.js            # Popup controller & state management
│   ├── prompts.js          # Default AI prompt templates
│   ├── autoclick.js        # v4.0: Auto-click answer functionality
│   ├── widget.js           # v5.0: Floating widget controller
│   ├── batch.js            # v5.0: Multi-tab batch processing
│   │
│   ├── core/               # Core modules
│   │   ├── Store.js        # Reactive state management
│   │   └── EventBus.js     # Pub/sub event system
│   │
│   ├── services/           # Business logic layer
│   │   ├── GeminiService.js        # Gemini API + streaming
│   │   ├── StorageService.js       # Chrome storage wrapper
│   │   ├── MessagingService.js     # Inter-script communication
│   │   ├── NotificationService.js  # Toast notifications
│   │   └── VerificationService.js  # v5.0: Answer verification
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
│   │   ├── nav.js          # Tab navigation system
│   │   ├── tags.js         # v5.0: Tag management
│   │   ├── personas.js     # v5.0: AI personas
│   │   └── study.js        # v5.0: Study mode
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
const store = new Store({ view: 'loading', answer: null, confidenceScore: null });
store.subscribe(state => render(state));
store.setState({ answer: 'New answer', confidenceScore: 'High' });
```

### Event System / Sistem Event
```javascript
// EventBus.js - Pub/sub pattern
eventBus.on('ui:rescan', () => { /* handle rescan */ });
eventBus.on('ui:saveToStudy', () => { /* v5.0: save to study mode */ });
eventBus.on('ui:verifyAnswer', () => { /* v5.0: verify answer */ });
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

## 🆕 v5.0 New Components / Komponen Baru v5.0

### study.js
Study mode for saving and reviewing questions:
```javascript
// Add item to study list
await StudyModule.addToStudy({
  question: "What is...",
  correctAnswer: "Option A",
  confidence: "High"
});

// Start practice quiz
const items = StudyModule.startQuiz(shuffle = true);

// Mark as learned
await StudyModule.markAsLearned(itemId, true);
```

### personas.js
AI persona management:
```javascript
// Get active persona's system prompt
const persona = await PersonasModule.getActivePersona();
const systemPrompt = PersonasModule.buildSystemPrompt(basePrompt, persona);

// Create custom persona
await PersonasModule.createPersona({
  name: "My Tutor",
  icon: "🎓",
  description: "Friendly and encouraging",
  systemPrompt: "You are a friendly tutor..."
});
```

### batch.js
Multi-tab batch processing:
```javascript
// Scan for quiz tabs
const tabs = await BatchMode.scanForQuizTabs();

// Start batch processing
const result = await BatchMode.start(selectedTabIds);
// Returns: { success, total, successful, failed, results }

// Stop batch
BatchMode.stop();
```

### widget.js
Floating widget controller:
```javascript
// Inject widget into page
FloatingWidget.init();

// Toggle visibility
FloatingWidget.toggle();

// Save position preference
FloatingWidget.savePosition({ x: 100, y: 100 });
```

### VerificationService.js
Independent answer verification:
```javascript
// Verify an answer
const result = await VerificationService.verify(question, answer);
// Returns: { status: 'confirmed'|'uncertain'|'wrong', assessment, confidence }
```

---

## 🔧 Key Components / Komponen Utama

### GeminiService
Handles API communication with streaming:
```javascript
// Call with streaming response
await geminiService.call('answer', content, null, tabId);

// Events emitted:
// - stream:update { purpose, fullText }
// - stream:done { purpose, finalText, confidenceScore }
```

### MessagingService
Tab communication with auto-injection:
```javascript
// Ensure content script loaded
await MessagingService.ensureContentScript(tabId);

// Send message
await MessagingService.sendMessage(tabId, { 
  action: 'highlight-answer', 
  answer: 'Option A' 
});

// Auto-click answer
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
- [ ] Study Mode save/review (v5.0)
- [ ] Practice Quiz mode (v5.0)
- [ ] AI Personas selection (v5.0)
- [ ] Custom Persona creation (v5.0)
- [ ] Batch Mode tab scanning (v5.0)
- [ ] Batch Mode processing (v5.0)
- [ ] Floating Widget toggle (v5.0)
```

### Console Debugging
```javascript
// Popup console - Check storage
chrome.storage.sync.get(null, console.log);
chrome.storage.local.get('history', console.log);
chrome.storage.local.get('studyItems', console.log); // v5.0
chrome.storage.local.get('customPersonas', console.log); // v5.0

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
- Unified classes (`.button`, `.button-primary`, `.settings-card`)
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
zip -r gemini-answer-bot-v5.0.zip . \
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
| Personas not loading | Check `StorageManager` is defined |
| Study items not saving | Verify `chrome.storage.local` permissions |

---

**Maintainer:** Hafizh Rizqullah (@rzqllh)

**Last Updated:** v5.0 - December 2025
