
# Gemini Answer Bot ✨🧠 (Chrome Extension)

**Gemini Answer Bot** adalah ekstensi Chrome yang dirancang untuk membantu Anda membaca, memahami, dan mengekstrak informasi dari halaman web dengan lebih efisien. Dengan memanfaatkan Gemini API, ekstensi ini memungkinkan Anda untuk mendapatkan rangkuman, penjelasan, hingga insight AI dari konten halaman web langsung dari popup di browser Anda.

---

## 🚀 Fitur Utama

- 🔍 **Baca halaman secara cerdas**: Ekstensi men-scan konten aktif dari halaman web.
- 💬 **Tanya Jawab AI langsung**: Ajukan pertanyaan dan dapatkan jawaban instan berbasis Gemini.
- 📜 **Riwayat Chat**: Akses kembali percakapan sebelumnya.
- ⚙️ **Opsi Kustomisasi**: Atur API key, preferensi tampilan, dan lainnya.

---

## 🛠️ Cara Instalasi Manual

> Karena ekstensi ini belum dipublikasikan di Chrome Web Store, Anda dapat memasangnya secara manual untuk pengujian.

1. **Clone / unduh** project ini, lalu ekstrak jika berupa zip.
2. Buka `chrome://extensions/` di browser Chrome Anda.
3. Aktifkan **Developer Mode** di kanan atas.
4. Klik **"Load unpacked"** dan pilih folder hasil ekstrak (`GeminiAnswerBot`).
5. Ekstensi akan muncul dan siap digunakan.

---

## 🧪 Cara Menggunakan

1.  Buka halaman web apa pun.
2.  Klik ikon ekstensi **Gemini Answer** Bot di toolbar Chrome.
3.  Gemini Answer Bot akan otomatis memindai halaman dan menjawab soal yang tertera pada tab yang sedang dibuka.
4.  Jawaban AI akan muncul langsung di popup.
5.  Anda juga bisa melihat riwayat percakapan sebelumnya melalui tab **Riwayat**.

💡 Anda juga bisa melihat riwayat percakapan sebelumnya melalui tab **Riwayat**.

---

## 🔐 Konfigurasi API Key

Agar ekstensi dapat berfungsi, Anda memerlukan **API key Gemini dari Google AI**. Ikuti langkah-langkah berikut untuk mendapatkannya:

1.  **Akses Google AI Studio:** Buka [Google AI Studio](https://aistudio.google.com/).
2.  **Masuk dengan Akun Google Anda:** Gunakan akun Google yang biasa Anda gunakan.
3.  **Buat atau Pilih Proyek Google Cloud:**
    *   Jika Anda belum memiliki proyek, Anda perlu membuatnya. Di Google AI Studio, Anda akan diarahkan untuk membuat proyek baru atau memilih proyek yang sudah ada.
    *   **Untuk membuat proyek baru:**
        a. Cari opsi "New Project" di konsol Google Cloud (Anda mungkin perlu membuat akun Google Cloud jika belum punya).
        b. Berikan **Nama Proyek** yang deskriptif (misalnya, `Quiz Assistant Project`).
        c. Tentukan **Project ID** yang unik (misalnya, `quiz-assistant-gemini-xyz`). ID ini tidak bisa diubah setelah dibuat.
        d. Jika Anda bagian dari organisasi, pilih organisasi Anda.
        e. Anda **perlu menghubungkan akun penagihan (billing account)**. Jika belum punya, Anda akan diminta untuk membuatnya. Google Cloud menawarkan kredit gratis untuk pengguna baru, yang sangat berguna untuk mencoba.
        f. Klik "Create" untuk menyelesaikan pembuatan proyek.
4.  **Hasilkan API Key:**
    *   Setelah proyek Anda siap, kembali ke Google AI Studio (atau navigasikan ke "APIs & Services" > "Credentials" di Google Cloud Console).
    *   Cari tombol "Get API key" atau "Create API key".
    *   Pilih proyek yang baru saja Anda buat.
    *   Klik "Create" untuk menghasilkan kunci API.
    *   **Salin dan simpan API key Anda dengan aman.** Perlakukan kunci ini seperti kata sandi.
5.  **Masukkan API Key ke Ekstensi:**
    *   Buka halaman **Opsi** ekstensi (biasanya dengan mengklik kanan ikon ekstensi di toolbar Chrome lalu pilih "Options").
    *   Masukkan API key Gemini Anda ke dalam kolom yang tersedia.
    *   Klik **"Save"**, lalu **refresh popup** ekstensi (jika ada tombol refresh) atau refresh tab tempat Anda menggunakan ekstensi.

---

## 📁 Struktur Proyek

```
GeminiAnswerBot/
├── manifest.json         # Konfigurasi utama ekstensi
├── src/                  # Logika utama (background.js, content.js, prompts.js)
├── ui/                   # Tampilan pengguna (popup, options, history)
├── assets/               # Ikon & CSS
└── README.md             # Dokumentasi ini
```

---

## 🧩 Teknologi yang Digunakan

- HTML, CSS, JavaScript (Vanilla)
- Chrome Extension API
- Gemini AI API

---

## 🤝 Kontribusi

Pull request sangat diterima! Jika Anda memiliki ide peningkatan, perbaikan bug, atau fitur baru, silakan buat issue atau PR.

---

## 📃 Lisensi

Project ini berada di bawah lisensi [MIT License](LICENSE). Silakan gunakan dan modifikasi sesuai kebutuhan Anda.

---
