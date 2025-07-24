# GeminiAnswerBot

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-20.0-brightgreen)

**GeminiAnswerBot** adalah ekstensi Chrome cerdas yang mengutamakan privasi, didukung oleh Google Gemini API. Ekstensi ini menganalisis konten pada halaman untuk secara cerdas menyelesaikan kuis, menyempurnakan teks yang dipilih, dan menyediakan alat konteks bertenaga AI—semuanya langsung di browser Anda.

---

## Fitur Utama

- **Penyelesai Kuis Cerdas**: Mendeteksi dan menyelesaikan soal kuis secara otomatis pada halaman yang didukung.
- **Penyorotan Jawaban**: Menyorot jawaban yang benar secara langsung di dalam halaman web (DOM).
- **Tindakan Teks Kontekstual**: Klik kanan pada teks yang dipilih untuk:
  - Meringkas
  - Menjelaskan
  - Menerjemahkan
  - Memparafrasekan
- **Dasbor Pengaturan Modern**: Antarmuka opsi yang terinspirasi dari antarmuka modern dengan tab yang jelas.
- **AI yang Dapat Disesuaikan**: Atur kunci API Gemini Anda, pilih model (misalnya, 1.5 Flash, 1.5 Pro), sesuaikan prompt sistem, dan ubah perilaku ekstensi.
- **Panel Riwayat Lokal**: Lihat semua interaksi AI sebelumnya di dalam dasbor, disimpan dengan aman di penyimpanan lokal browser Anda.

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