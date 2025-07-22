# ✨ GeminiAnswerBot

**GeminiAnswerBot** adalah sebuah ekstensi Chrome cerdas yang didesain untuk meningkatkan produktivitas dan pemahaman Anda saat menjelajahi web. Dengan memanfaatkan kekuatan Google Gemini API, ekstensi ini mampu menganalisis konten halaman, menjawab kuis secara otomatis, dan menyediakan berbagai aksi kontekstual langsung dari browser Anda.

![Screenshot of Options Page](https://i.imgur.com/your-screenshot-url.png)
*(Tips: Ganti URL di atas dengan link screenshot halaman Opsi Anda yang sudah jadi untuk tampilan yang lebih menarik)*

---

## 🚀 Fitur Utama

-   **🧠 Penjawab Kuis Otomatis**: Secara cerdas mendeteksi, mengekstrak, dan menjawab pertanyaan kuis di halaman web.
-   ** HIGHLIGHT Jawaban**: Secara otomatis menyorot jawaban yang benar langsung di halaman untuk visibilitas maksimal.
-   ** Menu Konteks Cerdas**: Pilih teks apa pun di halaman, lalu klik kanan untuk:
    -   **Summarize**: Membuat ringkasan.
    -   **Explain**: Mendapatkan penjelasan.
    -   **Translate**: Menerjemahkan teks.
    -   **Rephrase**: Mengubah gaya bahasa teks.
-   ** UI Dashboard Modern**: Halaman Opsi dengan desain modern ala macOS, lengkap dengan efek *transparent blur*, untuk mengelola semua pengaturan.
-   ** Kustomisasi Penuh**: Atur API Key, pilih model AI (1.5 Flash, 1.5 Pro, dll.), sesuaikan *prompt* sistem, dan atur preferensi lainnya.
-   **📜 Riwayat Terintegrasi**: Akses kembali semua aktivitas dan jawaban AI sebelumnya langsung dari panel riwayat di halaman Opsi.

## 🛠️ Instalasi (Mode Developer)

Karena ekstensi ini belum dipublikasikan, ikuti langkah berikut untuk instalasi manual:

1.  **Unduh atau Clone:** Unduh proyek ini sebagai file ZIP dan ekstrak, atau `git clone` repositori ini.
2.  **Buka Halaman Ekstensi:** Buka `chrome://extensions/` di browser Chrome Anda.
3.  **Aktifkan Mode Developer:** Aktifkan sakelar **"Developer mode"** di pojok kanan atas.
4.  **Muat Ekstensi:** Klik tombol **"Load unpacked"** dan pilih folder proyek yang telah Anda ekstrak.
5.  **Selesai!** Ikon GeminiAnswerBot akan muncul di *toolbar* Anda dan siap digunakan.

## 🔐 Konfigurasi API Key

Ekstensi ini memerlukan **Gemini API Key** Anda untuk berfungsi.

1.  Buka [**Google AI Studio**](https://aistudio.google.com/) dan masuk dengan akun Google Anda.
2.  Klik tombol **"Get API key"** lalu **"Create API key in new project"**.
3.  Salin API key yang dihasilkan.
4.  Buka halaman **Opsi** GeminiAnswerBot (klik kanan ikon ekstensi > Opsi).
5.  Masuk ke tab **General**, tempel API key Anda, lalu klik **"Save General Settings"**.
6.  Gunakan tombol **"Test Connection"** untuk memastikan kunci API Anda valid.

## 📁 Struktur Proyek

Struktur proyek ini dirancang untuk keterbacaan dan skalabilitas.

```
GeminiAnswerBot/
├── assets/
│   ├── libs/
│   │   ├── toastify.css      # Library notifikasi
│   │   └── (dihapus)
│   ├── options.css         # Gaya untuk halaman Opsi
│   ├── popup.css           # Gaya untuk popup utama
│   └── ...
├── js/
│   ├── background.js       # Service worker (event & API calls)
│   ├── content.js          # Skrip yang diinjeksi ke halaman
│   ├── options.js          # Logika untuk halaman Opsi & Riwayat
│   └── prompts.js          # Kumpulan prompt default untuk AI
├── ui/
│   ├── options.html        # Halaman Opsi, Data, dan Riwayat
│   └── popup.html          # Halaman popup utama
├── manifest.json           # File konfigurasi inti ekstensi
└── README.md               # Dokumentasi ini
```

## 🧩 Teknologi yang Digunakan

-   **HTML5**
-   **CSS3** (Flexbox, Variables, Backdrop Filter)
-   **JavaScript (Vanilla JS)**
-   **Chrome Extension Manifest V3 API**
-   **Google Gemini API**

---

## 🤝 Berkontribusi

Kontribusi, isu, dan permintaan fitur sangat diterima! Jangan ragu untuk membuat *fork*, *issue*, atau *pull request*.

## 📃 Lisensi

Proyek ini dilisensikan di bawah **MIT License**.