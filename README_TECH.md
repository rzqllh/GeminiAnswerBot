# GeminiAnswerBot - Technical Documentation

> Developer guide for contributing to and understanding the codebase

## 📁 Project Structure

```
GeminiAnswerBot/
├── manifest.json           # Chrome extension manifest (MV3)
├── README.md               # User documentation
├── README_TECH.md          # This file
│
├── ui/                     # HTML entry points
│   ├── popup.html          # Main popup interface
│   └── options.html        # Settings page
│
├── assets/                 # Static assets
│   ├── popup.css           # Popup styles (iOS 26 Liquid Glass)
│   ├── content.css         # Injected page styles
│   ├── options.css         # Settings page styles
│   └── icon.png            # Extension icon
│
├── js/
│   ├── background.js       # Service worker (MV3)
│   ├── content.js          # Content script (injected)
│   ├── popup.js            # Popup entry point
│   ├── prompts.js          # Default prompt templates
│   ├── prompts.module.js   # Prompts ES module export
│   │
│   ├── core/               # Core modules
│   │   ├── Store.js        # State management
│   │   └── EventBus.js     # Pub/sub event system
│   │
│   ├── services/           # Business logic
│   │   ├── GeminiService.js      # API communication
│   │   ├── StorageService.js     # Settings management
│   │   ├── MessagingService.js   # Tab messaging
│   │   └── NotificationService.js # Toast notifications
│   │
│   ├── ui/                 # UI components
│   │   ├── UIManager.js    # Main UI controller
│   │   └── ViewRenderer.js # DOM manipulation
│   │
│   ├── options/            # Settings page modules
│   │   ├── settings.js     # General settings
│   │   ├── prompts.js      # Prompt management
│   │   ├── history.js      # History page
│   │   └── data.js         # Data management
│   │
│   ├── utils/              # Utilities
│   │   ├── storage.js      # StorageManager
│   │   └── helpers.js      # Helper functions
│   │
│   └── vendor/             # Third-party libraries
│       ├── mark.min.js     # Text highlighting
│       ├── marked.min.js   # Markdown parsing
│       ├── dompurify.min.js # HTML sanitization
│       └── lucide.js       # Icon library
│
└── docs/                   # Documentation
    ├── CHANGELOG.md
    ├── SECURITY.md
    └── index.md
```

## 🏗️ Architecture

### Manifest V3 Compliance
- Background runs as **service worker** (not persistent)
- Uses `chrome.scripting` for dynamic injection
- Event-driven message passing

### State Management
```javascript
// Store.js - Simple reactive store
const store = new Store({ view: 'loading', answer: null });
store.subscribe(state => render(state));
store.setState({ answer: 'New answer' });
```

### Event System
```javascript
// EventBus.js - Pub/sub pattern
eventBus.on('ui:rescan', () => { /* handle */ });
eventBus.emit('stream:update', { purpose: 'answer', fullText });
```

### Message Flow
```
Popup ←→ Background ←→ Content Script
         ↓
      Gemini API
```

## 🔧 Key Components

### GeminiService
Handles API communication with streaming:
```javascript
geminiService.call('answer', content, null, tabId);
// Emits: stream:update, stream:done
```

### MessagingService
Tab communication with timeout:
```javascript
await MessagingService.ensureContentScript(tabId);
await MessagingService.sendMessage(tabId, { action: 'highlight-answer' });
```

### Content Script Modules

| Module | Purpose |
|--------|---------|
| `MarkerModule` | Text highlighting with Mark.js |
| `QuizModule` | Question/option extraction |
| `PageModule` | Full page content extraction |
| `ContentController` | Message handling orchestrator |

## 🧪 Testing

### Manual Testing Checklist
- [ ] API key save/load
- [ ] Quiz detection on W3Schools
- [ ] Visual Solve capture
- [ ] Answer highlighting
- [ ] Pre-submission check dialog
- [ ] History saving/loading
- [ ] Export/import settings

### Console Debugging
```javascript
// In popup console
chrome.storage.sync.get(null, console.log);

// In content script console
window.geminiAnswerBotContentLoaded
```

## 📝 Code Conventions

### ES6 Modules
- Use `import/export` for popup/options
- Content script uses IIFE pattern (non-module)
- Background uses module service worker

### Naming
- Classes: `PascalCase`
- Functions: `camelCase`
- Private: `_prefixedWithUnderscore`
- Constants: `UPPER_SNAKE_CASE`

### CSS
- CSS Variables for theming
- BEM-like class naming
- Mobile-first responsive

## 🔌 API Integration

### Gemini API
```javascript
// Endpoint
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent

// Headers
x-goog-api-key: {API_KEY}
Content-Type: application/json

// Body
{
  "contents": [{ "parts": [{ "text": "..." }] }],
  "systemInstruction": { "parts": [{ "text": "..." }] }
}
```

### Streaming Response
```javascript
// NDJSON format
{"candidates":[{"content":{"parts":[{"text":"chunk"}]}}]}
{"candidates":[{"content":{"parts":[{"text":"more"}]}}]}
```

## 🔐 Security Considerations

- **DOMPurify**: Sanitize all HTML before `innerHTML`
- **_escapeHtml**: Escape user content in dialogs
- **CSP**: No inline scripts in HTML files
- **API Key**: Stored in `chrome.storage.sync` (encrypted)

## 📦 Building for Production

```bash
# Package for Chrome Web Store
zip -r gemini-answer-bot.zip . \
  -x "*.git*" \
  -x "*.md" \
  -x "docs/*" \
  -x ".gemini/*"
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing`
3. Make changes following code conventions
4. Test thoroughly
5. Submit PR with clear description

## 📋 Dependencies

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| Mark.js | 8.11.1 | MIT | Text highlighting |
| Marked | 9.x | MIT | Markdown parsing |
| DOMPurify | 3.x | Apache-2.0 | XSS prevention |
| Lucide | 0.x | ISC | Icons |

## 🐛 Common Issues

### "Receiving end does not exist"
Content script not injected. Fixed by `ensureContentScript()` before messaging.

### Modal not appearing
Missing `_escapeHtml` helper. Now injected via `helpers.js`.

### Highlight not working
Mark.js not loaded. Check `web_accessible_resources` in manifest.

---

**Maintainer:** Hafizh Rizqullah
