# GeminiAnswerBot

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.9.3-brightgreen)

**GeminiAnswerBot** adalah ekstensi Chrome cerdas yang mengutamakan privasi, didukung oleh Google Gemini API. Ekstensi ini menganalisis konten pada halaman untuk secara cerdas menyelesaikan kuis, menyempurnakan teks yang dipilih, dan menyediakan alat konteks bertenaga AI—semuanya langsung di browser Anda.

---

## Fitur Utama

- **Analisis Halaman Penuh**: Dengan satu klik, dapatkan ringkasan komprehensif dari halaman web mana pun, termasuk TL;DR, poin-poin kunci, dan entitas penting yang disebutkan.
- **Penyelesai Kuis Cerdas**: Mendeteksi dan menyelesaikan soal kuis secara otomatis.
- **Feedback Loop Interaktif**: Koreksi jawaban AI yang salah dan dapatkan penjelasan baru secara instan.
- **Sistem Fallback Cerdas**: Mendeteksi error API spesifik dan memberikan umpan balik yang jelas.
- **Toolbar Aksi Mengambang (Inline Toolbar)**: Akses AI super cepat saat menyeleksi teks.
- **Tindakan Teks Kontekstual**: Klik kanan untuk meringkas, menjelaskan, menerjemahkan, atau memparafrasekan.
- **Dasbor Pengaturan Modern & Kustomisasi Penuh**: Atur kunci API, model, prompt, dan perilaku ekstensi.
- **Kontrol Suhu Granular**: Atur tingkat kreativitas AI secara spesifik untuk setiap jenis tugas.
- **Panel Riwayat Lokal**: Lihat semua interaksi AI sebelumnya di dalam dasbor.

---
## Skenario Penggunaan

- **Mendapatkan intisari artikel panjang dalam hitungan detik** sebelum memutuskan untuk membacanya.
- Secara instan menyelesaikan dan menyorot jawaban kuis di platform e-learning.
- **Memberikan koreksi jika AI salah menjawab**, dan secara instan mendapatkan penjelasan baru berdasarkan jawaban yang benar.
- Meringkas, menjelaskan, atau menerjemahkan teks dengan cepat menggunakan toolbar mengambang.
- Mendapat notifikasi yang jelas jika kunci API salah atau kuota habis.
- Menerjemahkan atau memparafrasekan teks yang dipilih secara real-time.
- Menyesuaikan perilaku AI untuk berbagai tugas dengan kontrol suhu.
- Membangun sistem prompt Anda sendiri melalui kustomisasi.

---
## Memulai

### Prasyarat

- Browser berbasis Chromium (Chrome, Edge, Brave, dll.)
- Kunci API Google Gemini yang valid

### Instalasi

1.  Unduh atau klon repositori ini.
2.  Buka `chrome://extensions/` di browser Anda.
3.  Aktifkan **Developer Mode**.
4.  Klik **Load Unpacked** dan pilih folder proyek yang telah diekstrak.
5.  Ikon ekstensi sekarang akan muncul di toolbar Anda.

---

## Konfigurasi

1.  Pergi ke [Google AI Studio](https://aistudio.google.com/).
2.  Klik **"Get API key"** → **"Create API key in new project"**.
3.  Salin kuncinya.
4.  Buka Opsi GeminiAnswerBot (klik kanan ikon > Opsi).
5.  Tempelkan kunci API Anda di tab **General**, lalu klik **Save**.
6.  Gunakan tombol **"Test Connection"** untuk memvalidasi kunci Anda.

---

## Troubleshooting

**Kunci API tidak berfungsi?**
- Pastikan kunci berasal dari AI Studio, bukan kredensial OAuth.
- Gunakan tombol "Test Connection" untuk memvalidasi kunci.
- Coba buat kunci baru dari proyek baru jika diperlukan.

**Deteksi kuis tidak berfungsi?**
- Halaman mungkin menggunakan shadow DOM atau iframe (dukungan terbatas).
- Segarkan halaman setelah menginstal atau mengaktifkan ekstensi.

---

## Struktur Proyek

Proyek ini diatur dengan pemisahan tugas yang jelas untuk skalabilitas dan pemeliharaan.
```
GeminiAnswerBot/
├── assets/
│ ├── options.css
│ ├── popup.css
│ ├── toolbar.css
│ └── icon.png
├── js/
│ ├── vendor/
│ │ └── marked.min.js
│ ├── background.js
│ ├── content.js
│ ├── options.js
│ ├── prompts.js
│ └── mark.min.js
├── ui/
│ ├── options.html
│ └── popup.html
├── .gitignore
├── LICENSE
├── manifest.json
└── README.md
```

---

## Privasi & Keamanan

GeminiAnswerBot **tidak mengumpulkan data pribadi apa pun**. Semua pemrosesan terjadi secara lokal di browser Anda. Kunci API Gemini Anda hanya disimpan di penyimpanan lokal browser Anda dan tidak pernah dikirim ke pihak eksternal.

## Masalah yang Diketahui

- Di beberapa situs web dinamis (misalnya, yang menggunakan React atau Shadow DOM), ekstraksi kuis mungkin tertunda.
- Google Gemini API dapat mengembalikan hasil yang sedikit tidak konsisten tergantung pada latensi model.

---

## Catatan Pengembangan

- `content.js` digunakan untuk logika pemindaian halaman, penyorotan, dan inline toolbar.
- `background.js` menangani komunikasi dengan Gemini API.
- Semua logika UI untuk pengaturan ditangani di `options.js`.
- Prompt dapat diedit langsung melalui `prompts.js` atau halaman Opsi.

Setelah melakukan perubahan, buka `chrome://extensions/` dan klik **Reload** pada GeminiAnswerBot.

---

## Changelog

### [1.9.7] - 2025-08-03
#### Added
- **Full Page Analysis:** Introduced a new "Analyze Page" feature, accessible from the popup header. This allows users to get a comprehensive, structured summary of the entire webpage content.
- **Structured JSON Output:** The analysis provides a TL;DR, key takeaways, and a list of mentioned entities (people, places, etc.), powered by a new, robust prompt designed to ensure the AI returns a valid JSON format.
- **Dynamic Summary UI:** The popup UI has been enhanced to beautifully render the structured analysis, making complex information easy to digest at a glance.

### [1.9.6] - 2025-08-02
#### Added
- **Interactive Feedback Loop:** Users can now provide feedback on the AI's answer by marking it as "Correct" (👍) or "Incorrect" (👎).
- **Answer Correction Flow:** If an answer is marked as incorrect, the user is prompted to select the correct option, which is then sent back to the API to generate a new, corrected explanation.

### [1.9.5] - 2025-08-01
#### Added
- **Protected Page Detection:** The extension now proactively detects when it's activated on a protected browser page (e.g., `chrome://extensions`, New Tab Page, Chrome Webstore).
- **Informational UI Panel:** Instead of showing a generic connection error on protected pages, the extension now displays a clear, user-friendly informational panel explaining why it cannot run, improving user trust and reducing confusion.

### [1.9.4] - 2025-07-31
#### Added
- **Smart Fallback System:** Implemented intelligent error handling for API calls. The extension now detects specific API failures (e.g., `INVALID_API_KEY`, `QUOTA_EXCEEDED`, `TIMEOUT`) and displays a user-friendly error panel in the popup.
- **Contextual Error Actions:** The new error panel includes relevant action buttons based on the error type, such as "Open Settings" for an invalid key, or "Search on Google" for a general failure, guiding the user toward a resolution.

### [1.9.3] - 2025-07-30
#### Added
- **Per-Action Temperature Control:** Users can now set the AI's creativity level (temperature) individually for each specific task (Answering, Explaining, Summarizing, etc.) in the "Prompts" tab of the options page.

### [1.9.2] - 2025-07-29
#### Added
- **Inline Action Toolbar:** Implemented a sleek, floating toolbar that appears on text selection. This provides instant access to AI actions (Summarize, Explain, Translate) without needing to right-click, significantly speeding up a user's workflow.
#### Fixed
- **Development Stability:** Added a defensive `try...catch` block around message passing in the content script to gracefully handle the "Extension context invalidated" error during development.
#### Changed
- **Code Refactoring:** Refactored the context action logic in `background.js` into a reusable function (`handleContextAction`) to be used by both the context menu and the new toolbar.

### [1.9.1] - 2025-07-28
#### Fixed
- **Critical Rendering Bug:** Fixed a major issue that caused the extension popup to break or hang when encountering quiz questions with HTML code in the answers.
- **Context Menu:** Corrected the right-click context menu to properly display all available actions.
- **Stability:** Improved stability by preventing the popup from freezing if the connection to the web page is lost.

### [1.9.0] - 2025-07-27
#### Fixed
- Resolved a critical error that caused the extension popup to crash when attempting to display AI-generated results due to a Markdown rendering library issue.
- Improved security by sanitizing all Markdown-rendered content.

... (Changelog lama lainnya)

---

## Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT — lihat file `LICENSE` untuk detailnya.

---

## Kontak & Kredit

Dibuat dengan 💡 oleh [Hafizh Rizqullah](https://github.com/rzqllh18)
Terinspirasi oleh alat seperti ChatGPT Sidebar, Gemini Studio, dan lainnya.

Untuk masukan, hubungi melalui GitHub Issues atau buka PR 🙌