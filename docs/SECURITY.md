# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.4.x   | ✅ Active support  |
| 3.3.x   | ⚠️ Security fixes only |
| < 3.3   | ❌ No longer supported |

## Security Principles

### Data Privacy

- **API Key Storage**: Your Gemini API key is stored locally using `chrome.storage.sync` and never transmitted to any server other than Google's official Gemini API endpoints.
- **No Data Collection**: We do not collect, store, or transmit any user data, quiz content, or browsing history to external servers.
- **Local Processing**: All content extraction and processing happens locally in your browser.

### Permissions

The extension requires these permissions:

| Permission | Purpose |
|------------|---------|
| `activeTab` | Access current tab content for quiz detection |
| `scripting` | Inject content scripts for highlighting |
| `storage` | Store settings and API key locally |
| `contextMenus` | Right-click menu integration |
| `tabs` | Tab communication for messaging |

### API Communication

- All API calls are made directly from your browser to `https://generativelanguage.googleapis.com`
- HTTPS encryption is enforced for all communications
- No proxy servers or intermediaries

## Content Security

- All HTML content is sanitized using DOMPurify before rendering
- Markdown is parsed safely with marked.js
- User inputs are escaped to prevent XSS attacks

## Reporting a Vulnerability

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. Email: security@example.com (replace with actual email)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **24 hours**: Initial acknowledgment
- **72 hours**: Preliminary assessment
- **7 days**: Detailed response and fix timeline
- **30 days**: Public disclosure (after fix is released)

## Best Practices for Users

1. **Protect your API key**: Never share your Gemini API key
2. **Use official sources**: Only install from Chrome Web Store or this repository
3. **Keep updated**: Always use the latest version
4. **Review permissions**: Understand what the extension can access

## Third-Party Dependencies

| Library | Version | Purpose | Security |
|---------|---------|---------|----------|
| Mark.js | Latest | Text highlighting | Safe |
| Marked.js | Latest | Markdown parsing | Safe with DOMPurify |
| DOMPurify | Latest | HTML sanitization | Security library |
| Lucide Icons | Latest | UI icons | Safe |

---

*Last updated: December 2024*
