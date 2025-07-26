# GeminiAnswerBot

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.5.0-brightgreen)

**GeminiAnswerBot** adalah ekstensi Chrome cerdas yang mengutamakan privasi, didukung oleh Google Gemini API. Ekstensi ini menganalisis konten pada halaman untuk secara cerdas menyelesaikan kuis, menyempurnakan teks yang dipilih, dan menyediakan alat konteks bertenaga AI—semuanya langsung di browser Anda.

---

## Fitur Utama

- **Penyelesai Kuis Cerdas**: Mendeteksi dan menyelesaikan soal kuis secara otomatis pada halaman yang didukung.
- **Penyorotan Jawaban**: Menyorot jawaban yang benar secara langsung di dalam halaman web (DOM) dengan gaya yang konsisten dengan tema.
- **Tindakan Teks Kontekstual**: Klik kanan pada teks yang dipilih untuk:
  - Meringkas
  - Menjelaskan
  - Menerjemahkan
  - Memparafrasekan
- **Dasbor Pengaturan Modern**: Antarmuka opsi yang terinspirasi dari antarmuka modern dengan tab yang jelas.
- **AI yang Dapat Disesuaikan**: Atur kunci API Gemini Anda, pilih model, sesuaikan prompt sistem, dan ubah perilaku ekstensi.
- **Panel Riwayat Lokal**: Lihat semua interaksi AI sebelumnya di dalam dasbor, yang sekarang menampilkan format Markdown dengan benar untuk keterbacaan yang lebih baik.

---

## Skenario Penggunaan

- Secara instan menyelesaikan dan menyorot jawaban kuis di platform e-learning.
- Meringkas atau menjelaskan dokumentasi yang padat saat membaca.
- Menerjemahkan atau memparafrasekan teks yang dipilih secara real-time tanpa meninggalkan halaman.
- Membangun sistem prompt dan perilaku agen Anda sendiri untuk Gemini melalui kustomisasi prompt.

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
│   ├── options.css
│   └── popup.css
│   └── icon.png
├── js/
│   ├── vendor/
│   │   └── marked.min.js   # Library untuk render Markdown
│   ├── background.js       # Service worker untuk event & panggilan API
│   ├── content.js          # Script konten yang diinjeksi
│   ├── options.js          # Logika untuk dasbor opsi
│   ├── prompts.js          # Prompt default untuk AI
│   └── mark.min.js         # Library untuk menyorot teks
├── ui/
│   ├── options.html        # UI untuk Opsi, Riwayat, dan Data
│   └── popup.html          # UI popup utama ekstensi
├── .gitignore              # File yang diabaikan oleh Git
├── LICENSE                 # Lisensi proyek
├── manifest.json           # File konfigurasi inti ekstensi
└── README.md               # Dokumentasi ini
```
---

## Privasi & Keamanan

GeminiAnswerBot **tidak mengumpulkan data pribadi apa pun**. Semua pemrosesan terjadi secara lokal di browser Anda. Kunci API Gemini Anda hanya disimpan di penyimpanan lokal browser Anda dan tidak pernah dikirim ke pihak eksternal.

## Masalah yang Diketahui

- Di beberapa situs web dinamis (misalnya, yang menggunakan React atau Shadow DOM), ekstraksi kuis mungkin tertunda.
- Google Gemini API dapat mengembalikan hasil yang sedikit tidak konsisten tergantung pada latensi model.

---

## Catatan Pengembangan

- `content.js` digunakan untuk logika pemindaian halaman dan penyorotan.
- `background.js` menangani komunikasi dengan Gemini API.
- Semua logika UI untuk pengaturan ditangani di `options.js`.
- Prompt dapat diedit langsung melalui `prompts.js` atau halaman Opsi.

Setelah melakukan perubahan, buka `chrome://extensions/` dan klik **Reload** pada GeminiAnswerBot.

---

## Changelog

### [1.8.0] - 2025-07-26
#### Added
- **Pre-Submission Check:** Added a new feature that displays a custom confirmation dialog to warn the user if their selected quiz answer is different from the AI's suggestion. This feature can be toggled on or off in the General settings tab.

### [1.7.0] - 2025-07-26
#### Added
- **Smart Caching:** The extension now caches quiz results locally. If the same quiz is encountered again, the answer is provided instantly without using the Gemini API, saving API quota and speeding up response time.

### [1.6.0] - 2025-07-26
#### Changed
- **UI Standardization:** The layout of the "General" and "Data" tabs in the options page has been refactored to use fieldsets, creating a consistent, card-based design across all sections.
- **History UI:** The appearance of history entries has been updated to match the overall visual theme, incorporating a blurred background effect.

### [1.5.0] - 2025-07-25
#### Added
- **Markdown Rendering**: AI responses in the history tab now render full Markdown formatting, including lists, bold/italics, and code blocks, for improved readability.
#### Changed
- **UI Consistency**: The on-page answer highlighter style has been updated to use the blue accent color, matching the overall theme of the extension.
- **Icon Format**: The extension icon has been converted from JPG to PNG to support transparency and improve its appearance in the browser toolbar.

---

## Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT — lihat file `LICENSE` untuk detailnya.

---

## Kontak & Kredit

Dibuat dengan 💡 oleh [Hafizh Rizqullah](https://github.com/rzqllh18)
Terinspirasi oleh alat seperti ChatGPT Sidebar, Gemini Studio, dan lainnya.

Untuk masukan, hubungi melalui GitHub Issues atau buka PR 🙌