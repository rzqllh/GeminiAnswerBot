# Changelog

All notable changes to GeminiAnswerBot will be documented in this file.

## [5.0.0] - 2024-12-07

### Added
- **📚 Study Mode**: Save questions for later review with practice quiz functionality
  - Stats dashboard (Total, To Review, Learned)
  - Practice quiz with reveal/feedback flow
  - Mark as learned/need review
  - Personal notes per question
  
- **🤖 AI Personas**: Choose or create custom AI response styles
  - 6 default personas (Default, Strict Teacher, Friendly Tutor, Exam Coach, Deep Explainer, Quick Answer)
  - Custom persona creation with icon, name, description
  - System prompt customization per persona
  
- **🔄 Multi-Tab Batch Mode**: Process quizzes across multiple tabs
  - Tab scanning and selection
  - Concurrent processing with configurable limits
  - Progress tracking per tab
  - Rate limiting for API calls
  
- **🏷️ Tag System**: Categorize history items
  - Default tags (Programming, Math, Science, Language, General)
  - Custom tag creation
  - Filter history by tags

- **📱 Floating Widget**: Draggable on-page assistant
  - Glassmorphism design
  - Minimize/maximize toggle
  - Position memory
  - Keyboard shortcut (Alt+W)

- **🧪 Answer Verification**: Cross-check AI answers
  - Independent verification prompt
  - Status badges (Confirmed/Uncertain/Wrong)
  - Confidence assessment

### Changed
- Settings page expanded from 6 to 9 tabs
- `options.js` initialization reordered for dynamic panes
- All modules now use unified button classes (`button button-primary`)
- Nav module now dispatches events for all tabs

### Technical
- New files: `widget.js`, `batch.js`, `tags.js`, `personas.js`, `study.js`, `VerificationService.js`, `widget.css`
- Added 300+ lines of CSS for new UI components
- Enhanced EventBus with new events (`ui:saveToStudy`, `ui:verifyAnswer`)

---

## [4.0.0] - 2024-12-05

### Added
- **🎯 Auto-Click Answer**: Automatically selects the correct answer on the quiz page
- **📊 Confidence Score**: Shows AI confidence level (High/Medium/Low) for each answer
- **🧠 Context Memory**: Remembers previous Q&A to improve multi-question accuracy
- **🌐 Multi-Language**: Responds in your preferred language (auto-detect or manual)
- **🎨 Theme Customization**: Choose from preset themes (Ocean, Sunset, Neon, Midnight) with dark/light modes
- **📄 PDF Export**: Export your quiz history as a formatted PDF document

### Technical
- Added `autoclick.js` for answer selection
- Added `features.js` for Features & Appearance tabs
- Enhanced `GeminiService.js` with multi-language and context memory
- Added `_parseConfidence()` for extracting confidence levels

---

## [3.4.2] - 2024-12-06

### Fixed
- Presubmission check modal now displays correctly
- Added `_escapeHtml` helper to content script injection
- Console errors for "Receiving end does not exist" resolved
- Explanation button now validates answer before calling

### Changed
- Highlight color changed from yellow to blue (#8aa9fe)
- Removed spinner icon from analyzing status bar
- iOS 26 Liquid Glass styling with Samsung accents

### Known Issues
- ⚠️ **Pre-submission check** may block the Next button on some sites. Recommended to disable in Settings until fixed.

---

## [3.4.1] - 2024-12-05

### Fixed
- Markdown formatting now properly renders bold, italic, and code
- Options display with proper newlines using `white-space: pre-wrap`
- History page now loads correctly with `StorageManager.local` accessor
- Auto-highlight extracts only the correct answer (not all backticks)

### Added
- `_parseMarkdown()` method in UIManager for safe markdown rendering
- `_saveToHistory()` method for automatic history saving
- Shimmer animation for analyzing status

---

## [3.4.0] - 2024-12-01

### Added
- Comprehensive settings page with prompt profiles
- Custom prompt editing and profile management
- History page with export/clear functionality
- Data management (export/import/reset)

### Changed
- Refactored to modular ES6 architecture
- Settings now use `chrome.storage.sync` for cross-device sync
- Improved error handling and user notifications

---

## [3.3.0] - 2024-11-15

### Added
- Pre-submission answer verification
- Confirmation dialog when user selects wrong answer
- Visual Solve (screenshot-based) mode
- Full page analysis feature

### Fixed
- Quiz block detection improved for various websites
- Better option extraction from radio/checkbox inputs

---

## [3.2.0] - 2024-11-01

### Added
- Streaming AI responses with real-time updates
- Auto-highlight answer on page using Mark.js
- Context menu integration (right-click actions)
- Keyboard shortcut (Alt+Q)

### Changed
- Switched to Gemini 1.5 Flash as default model
- Improved prompt templates for better accuracy

---

## [3.1.0] - 2024-10-15

### Added
- Multiple Gemini model support (Flash, Pro, etc.)
- Response caching with session storage
- Collapsible question/answer cards

### Fixed
- API error handling improvements
- Content script injection reliability

---

## [3.0.0] - 2024-10-01

### Changed
- **Breaking:** Migrated to Manifest V3
- Complete architecture rewrite
- New modern glassmorphism UI

### Added
- Background service worker
- Modular service-based architecture
- Professional popup interface

### Removed
- Deprecated Manifest V2 features
- Legacy content script approach

---

## [2.5.0] - 2024-09-15

### Added
- Image-based quiz solving (OCR)
- Screenshot capture for visual questions
- Multi-language support

---

## [2.0.0] - 2024-09-01

### Changed
- Migrated from OpenAI to Google Gemini API
- New API key configuration system
- Improved response formatting

### Added
- Explanation feature for answers
- Confidence level indicators

---

## [1.5.0] - 2024-08-15

### Added
- Auto-detection of quiz questions
- Support for multiple choice and checkbox questions
- Basic highlighting of answers

---

## [1.0.0] - 2024-08-01

### Added
- Initial release
- Basic quiz question extraction
- AI-powered answer generation
- Simple popup interface
- API key configuration

---

## Legend
- **Added** - New features
- **Changed** - Changes in existing functionality
- **Fixed** - Bug fixes
- **Removed** - Removed features
- **Security** - Security improvements
- **Technical** - Developer-facing changes