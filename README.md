# EduQuest AR — Universal Gesture-Controlled Educational Game
**Platform Pembelajaran & Game Edukasi Interaktif Berbasis Gerakan Tangan Kamera (AR) dan Layar Sentuh Kelas (Interactive Flat Panel) untuk SD Kelas 1–6.**

---

## 🌟 Tentang EduQuest AR

**EduQuest AR** adalah platform permainan edukatif interaktif masa depan yang dirancang khusus untuk guru dan peserta didik Sekolah Dasar (SD) di Indonesia. Pemain dapat melihat diri mereka melalui umpan kamera cermin (*mirrored live feed*), mengarahkan reticle futuristik menggunakan ujung jari telunjuk (*Landmark 8*), dan memilih jawaban dengan gestur mencubit (*pinch*) ibu jari dan telunjuk (*Landmark 4 & 8*).

Aplikasi ini bersifat **universal**:
- Mendukung seluruh jenjang **SD Kelas 1 sampai Kelas 6**.
- Mendukung semua mata pelajaran: **IPAS, Matematika, Bahasa Indonesia, Bahasa Inggris, Pendidikan Pancasila, Pendidikan Agama, Seni Budaya, PJOK**, dan mata pelajaran kustom.
- **100% Siap Offline**: Paket WASM MediaPipe dan model pelacakan tangan telah dibundel secara lokal di dalam proyek sehingga dapat dimainkan di kelas tanpa koneksi internet.
- **Kompatibel Penuh dengan Interactive Flat Panel (IFP)**: Mendukung layar sentuh kelas (SMART Board, Promethean, ViewSonic, Newline) dengan tombol sentuh berukuran besar tanpa dependensi kamera.

---

## 🚀 Cara Menjalankan Aplikasi di Windows Laptop

### 1. Prasyarat
- Sistem Operasi: Windows 10 / 11, macOS, atau Linux
- Web Browser: **Google Chrome** atau **Microsoft Edge** terbaru
- Node.js versi 18 atau lebih baru ([Unduh di sini](https://nodejs.org/))

### 2. Memulai dengan Peluncur Otomatis Windows (`start.bat`)
Cukup klik dua kali berkas **`start.bat`** di dalam folder proyek. Skrip ini akan secara otomatis:
1. Memeriksa ketersediaan Node.js di komputer Anda.
2. Memeriksa dan membuat salinan konfigurasi `.env`.
3. Memasang dependensi npm jika belum terpasang (`npm install`).
4. Membuka peramban Google Chrome di `http://localhost:3000`.
5. Menjalankan server aplikasi lokal.

### 3. Memulai Manual via Terminal (Command Prompt / PowerShell)
```bash
# 1. Pasang dependensi
npm install

# 2. Salin file contoh environment
cp .env.example .env

# 3. Jalankan server lokal
npm run dev
```
Buka peramban pada alamat: **`http://localhost:3000`**

---

## 🖥️ Panduan Penggunaan di Layar Sentuh Interaktif (IFP / Smart Board)

EduQuest AR dirancang untuk ruang kelas modern yang menggunakan Interactive Flat Panel:

1. **Koneksi Laptop ke Panel Interaktif**:
   - Hubungkan kabel **HDMI** dari laptop ke port HDMI pada panel interaktif (untuk tampilan gambar dan suara).
   - Hubungkan kabel **USB Touch** (biasanya port USB Type-B atau Type-C) dari panel interaktif ke laptop agar fungsi sentuhan layar aktif di Windows.
2. **Memilih Mode Input**:
   - **Mode Layar Sentuh (Touch Mode)**: Jika guru/murid ingin berinteraksi langsung dengan menyentuh layar flat panel. Tombol jawaban memiliki target sentuh berukuran besar (>80px) dengan perlindungan anti-duplikasi sentuhan (*touch deduplication*).
   - **Mode Gestur Kamera (Gesture AR Mode)**: Jika IFP memiliki webcam USB yang dipasang di atas panel, pilih webcam eksternal tersebut melalui menu **Pengaturan > Kamera Eksternal IFP**. Murid dapat berdiri 1–2 meter di depan layar dan menjawab secara nirkabel dengan gestur cubitan tangan.
   - **Mode Mouse**: Jika menggunakan kursor laptop biasa.
3. **Mengatur Ukuran Huruf Kelas**:
   - Masuk ke menu **Pengaturan**, lalu pilih **Ukuran Huruf: Sangat Besar**. Teks soal dan opsi jawaban akan diperbesar sehingga terbaca dengan jelas oleh seluruh murid di barisan belakang kelas (jarak 5–10 meter).
4. **Layar Penuh (Fullscreen)**:
   - Tekan tombol ikon kotak di pojok kanan atas untuk memasuki mode layar penuh agar bilah peramban tidak mengganggu peserta didik.

---

## 🔒 Konfigurasi AI Question Maker (Gemini API)

Fitur pembuatan soal otomatis ditenagai oleh model mutakhir **Gemini 3.8 Flash** melalui rute server aman (`/api/generate-questions`).

1. Kunci API **tidak pernah diekspos** ke kode JavaScript peramban atau bundle frontend.
2. Atur kunci API di dalam file `.env`:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   ```
3. Dapatkan kunci API secara gratis di [Google AI Studio](https://aistudio.google.com/).
4. **Kemandirian Offline**: Jika internet tidak tersedia atau kunci API belum diisi, seluruh gameplay AR, Bank Soal lokal, penyimpanan IndexedDB, sintesis audio, dan pembuatan soal manual tetap berfungsi normal 100%.

> **Catatan Guru**: Setiap soal yang dihasilkan oleh AI wajib ditinjau dan disetujui oleh bapak/ibu guru sebelum disimpan ke Bank Soal.

---

## 💾 Manajemen Bank Soal & Cadangan Data (Backup / Restore)

Semua data soal dan paket kuis disimpan secara lokal di dalam peramban menggunakan **IndexedDB**.
- **Ekspor JSON**: Klik ikon berkas kode di menu Bank Soal untuk mencadangkan seluruh bank soal ke file `.json`.
- **Ekspor CSV**: Klik ikon spreadsheet untuk mengunduh data soal dalam format CSV yang dapat dibuka di Microsoft Excel atau Google Spreadsheet.
- **Impor Data**: Gunakan tombol unggah untuk memulihkan atau menyalin paket soal dari laptop guru lain tanpa memerlukan akun atau server cloud.
- **Pulihkan Soal Contoh**: Klik tombol putar ulang (*reset*) untuk mengembalikan paket soal bawaan SD (IPAS, Matematika, Bahasa Indonesia, Pendidikan Pancasila, Bahasa Inggris).

---

## 🔧 Diagnostik & Pemecahan Masalah (Troubleshooting)

Buka **Panel Diagnostik Kelas** (ikon detak jantung pada bilah atas) untuk mengecek:
1. **Kamera Tidak Muncul**:
   - Pastikan izin kamera telah disetujui di browser (klik ikon gembok di bilah URL Chrome).
   - Pastikan aplikasi lain (seperti Zoom, Google Meet, Teams) tidak sedang menggunakan webcam.
   - Jika webcam tidak tersedia, klik tombol **Beralih ke Mode Layar Sentuh** di panel diagnostik.
2. **Pelacakan Tangan Terasa Berat**:
   - Atur **Transparansi Kamera** di HUD menjadi 40%–60%.
   - Turunkan nilai **Smoothing** menjadi 40%–50% di pengaturan.
3. **Model MediaPipe Offline**:
   - Model lokal tersimpan di folder `public/models/hand_landmarker.task` (7.5 MB) dan `public/wasm/`. Pastikan folder `public` tidak dihapus.

---

## 📜 Lisensi
EduQuest AR dilisensikan di bawah Apache License 2.0.
Dibuat dengan bangga untuk kemajuan pendidikan anak-anak Indonesia.
