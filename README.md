
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

1. Buka halaman web apa pun.
2. Klik ikon ekstensi **Gemini Answer Bot** di toolbar Chrome.
3. Ketik pertanyaan Anda di kolom chat. Misalnya:
   > “Apa poin utama dari artikel ini?”  
   > “Jelaskan bagian ketiga dari halaman ini.”
4. Jawaban AI akan muncul langsung di popup.

💡 Anda juga bisa melihat riwayat percakapan sebelumnya melalui tab **Riwayat**.

---

## 🔐 Konfigurasi API Key

Agar ekstensi dapat berfungsi, Anda memerlukan **API key Gemini** dari Google AI.

1. Buka halaman **Opsi** pada ekstensi (klik kanan > Options).
2. Masukkan API key Gemini Anda.
3. Klik **Save**, lalu refresh popup.

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

> Dibuat dengan semangat untuk membuat AI lebih mudah diakses semua orang. 🚀
