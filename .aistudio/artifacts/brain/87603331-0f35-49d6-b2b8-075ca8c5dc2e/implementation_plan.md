# Rencana Implementasi: Dukungan Interactive Flat Panel (IFP) Android & Peluncur Offline Mandiri

Rencana ini menyediakan dukungan komprehensif agar EduQuest AR dapat dimainkan secara optimal pada **Interactive Flat Panel (IFP) berbasis Android** (layar sentuh interaktif kelas 65"–86" seperti ViewSonic ViewBoard, BenQ, MAXHUB, Promethean) melalui PWA mandiri (*Progressive Web App*) dan peramban Android, dengan interaksi **multi-touch langsung** (beberapa siswa menyentuh layar bersamaan) serta pelacakan gestur kamera ganda, ditambah paket unduhan offline mandiri (*pre-built* `dist/` dan server Windows PowerShell tanpa Node.js).

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan tanya jawab dan preferensi yang dikonfirmasi:
> 1. **Metode Akses IFP Android**: Melalui browser bawaan Android (Chrome / Chromium IFP) atau **Aplikasi PWA terpasang (*Add to Home Screen*)**. Begitu terpasang atau diakses, seluruh aset (WASM, model AI MediaPipe, audio, UI) tersimpan di *Cache Storage* Service Worker sehingga dapat dimainkan 100% offline di IFP tanpa perlu internet aktif.
> 2. **Interaksi Utama di IFP Android**: **Sentuhan multi-touch langsung di layar DAN pelacakan gestur kamera**. Siswa dapat langsung menyentuh kartu jawaban atau target di layar secara serentak, atau melambaikan tangan di depan kamera USB yang tersambung ke IFP. Jika kamera tidak dipasang pada IFP, game otomatis berjalan mulus dalam mode sentuh tanpa pesan error.
> 3. **Paket Unduhan PC/Laptop**: Mempertahankan solusi peluncur mandiri `start.bat` (menggunakan server HTTP bawaan PowerShell Windows), folder `dist/` siap pakai (*pre-built*), dan `buka_game.html` sehingga jika game dijalankan dari laptop yang dihubungkan ke IFP via kabel HDMI + USB Touch, game dapat langsung jalan tanpa instalasi Node.js.

---

## 1. Overview & Core Concept

- **What It Does**: Menghadirkan pengalaman belajar interaktif yang dirancang khusus untuk layar sentuh besar (*Interactive Flat Panel*) berbasis Android di ruang kelas sekolah dasar.
- **Target Audience / Persona**: Guru kelas dan siswa SD yang menggunakan papan tulis interaktif Android di ruang kelas (baik terhubung ke internet maupun terputus/offline).
- **Key Value**:
  - **Zero Install Dependency di Android**: Cukup buka tautan di browser IFP atau ketuk "Pasang Aplikasi" (PWA), game langsung tersimpan ke memori IFP dan terbuka dalam mode *Fullscreen Kiosk*.
  - **Multi-Touch Simultaneous Interaction**: Di layar IFP 65"–86", 2 hingga 4 siswa dapat maju ke depan papan tulis dan menekan jawaban atau menangkap objek secara serentak tanpa saling mengunci (*multi-touch pointer tracking*).
  - **Touch & Gesture Coexistence**: Sensor sentuh IFP dan deteksi kamera AI berjalan berdampingan secara harmonis.
  - **Android Touch Ergonomics**: Mencegah *pull-to-refresh*, *pinch zoom* yang tidak sengaja, dan *long-press context menu* yang sering mengganggu permainan di papan sentuh Android.

---

## 2. User Experience & Visual Design

### Alur Guru & Siswa di IFP Android

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ GURU MEMBUKA EDUQUEST AR DI IFP ANDROID (BROWSER / PWA)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Tampilan otomatis menyesuaikan layar lebar landscape 16:9 / 4K.          │
│ 2. Muncul tombol "Layar Penuh" (Kiosk Mode) untuk menyembunyikan navigasi.  │
│ 3. PWA Install Banner: Sekali klik "Pasang ke Beranda", icon muncul di IFP. │
│ 4. Seluruh aset MediaPipe & audio di-cache otomatis untuk main offline.     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
         [ Mode Sentuh Multi-Siswa ]       [ Mode Gestur Kamera (Jika Ada) ]
                      │                                 │
                      ▼                                 ▼
             Siswa menyentuh kartu             Siswa mengacungkan tangan /
             jawaban langsung di IFP.          mengarahkan telapak tangan.
             Respon sentuhan instan            Deteksi real-time dengan
             tanpa delay tap 300ms.            umpan balik visual kursor AR.
```

### Visual & Touch Ergonomics untuk Layar Besar IFP
- **Ukuran Target Sentuh (Touch Targets)**: Tombol dan kartu jawaban memiliki ukuran minimal `h-16` hingga `h-24` (80px–120px) dengan tipografi tegas (`font-bold text-xl` hingga `text-3xl`), memudahkan siswa kelas 1–6 SD menekan dari posisi berdiri di depan papan tulis.
- **Pencegahan Interferensi Gestur Android**:
  - `touch-action: manipulation` dan `overscroll-behavior: none` disematkan di tingkat root CSS dan kontainer game.
  - Nonaktifkan `user-select: none` dan `-webkit-touch-callout: none` agar anak-anak yang menahan jarinya di layar tidak memicu menu "Salin Teks" browser.
- **AudioContext Auto-Unlock di Android**: Browser Android mensyaratkan interaksi sentuhan pengguna untuk memulai audio. Game menyediakan inisialisasi suara instan pada sentuhan pertama (`touchstart` / `pointerdown`).
- **Tombol Kiosk Layar Penuh (Fullscreen Toggle)**: Tombol khusus di bilah atas untuk mengaktifkan `requestFullscreen()` pada layar Android IFP.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Optimasi PWA Standalone untuk IFP Android
- **Pendekatan Terpilih**: Mengoptimalkan konfigurasi PWA di `vite.config.ts` dengan `display: 'standalone'`, orientasi `landscape`, kategori `education`, dan pre-caching lengkap di Workbox.
- **Alasan**: Hampir semua IFP Android modern (Android 9+) memiliki Google Chrome, Chromium, atau browser bawaan. PWA memberikan pengalaman layaknya aplikasi native Android (icon di home screen, tanpa address bar) tanpa perlu mengunggah ke Google Play Store atau membongkar pengaturan keamanan sistem (*sideloading APK*) yang sering dikunci oleh administrator sekolah.

### Decision 2: Multi-Touch Direct Pointer Events
- **Pendekatan Terpilih**: Menggunakan `pointerdown` dan `pointerup` berbasis `pointerId` untuk deteksi sentuhan langsung pada kartu jawaban di `GameContainer.tsx`, `TruthDashContainer.tsx`, dan `CatchQuestContainer.tsx`.
- **Alasan**: Memungkinkan banyak siswa menyentuh layar IFP secara bersamaan tanpa saling membatalkan sentuhan satu sama lain.

### Decision 3: Penanganan Kamera USB Bersifat Opsional (*Graceful Fallback*)
- **Pendekatan Terpilih**: Jika IFP tidak memiliki webcam atau guru menolak izin kamera, antarmuka tidak menampilkan error yang menghalangi, melainkan otomatis beralih 100% ke mode sentuh interaktif dengan panduan yang jelas.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EDUQUEST AR CLIENT CORE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────┐              ┌────────────────────────────────┐  │
│  │   INPUT ADAPTER       │              │       DISPLAY & KIOSK          │  │
│  │  • Multi-Touch Engine │              │  • Fullscreen Handler          │  │
│  │    (Multi-Finger IFP) │              │  • Landscape Lock Helper       │  │
│  │  • MediaPipe Vision   │              │  • Anti-Scroll / Anti-Zoom CSS │  │
│  │    (Hands & Pose AI)  │              │  • Large Touch Target Scaling  │  │
│  └───────────┬───────────┘              └────────────────┬───────────────┘  │
│              │                                           │                  │
│              ▼                                           ▼                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        GAME STATE ENGINE                              │  │
│  │  • Shooter Quest (Pinch / Tap) • Truth Dash (Dwell / Tap Kiri-Kanan)  │  │
│  │  • Catch Quest (Basket Gestur / Drag Sentuh Multi-Siswa)              │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       OFFLINE & PWA ENGINE                            │  │
│  │  • Service Worker (Workbox precache model .task & .wasm)              │  │
│  │  • Web App Manifest (standalone, landscape, icon 512x512)            │  │
│  │  • Windows Fallback: start.bat (PowerShell HttpListener port 3000)    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Rincian Perubahan Kode yang Direncanakan:
1. **`index.html` & CSS Touch Optimization**:
   - Menambahkan aturan CSS `-webkit-touch-callout: none`, `user-select: none`, dan `touch-action: manipulation` untuk mencegah menu konteks dan zoom di layar sentuh IFP.
2. **PWA Manifest (`vite.config.ts`)**:
   - Memastikan `orientation: 'landscape'`, `display: 'standalone'`, dan scope offline lengkap.
3. **Komponen Layar Penuh & Panduan IFP Android (`IFPKioskBar.tsx` / `App.tsx`)**:
   - Menambahkan tombol "Layar Penuh IFP" dengan ikon yang jelas dan status koneksi sentuh/kamera.
   - Menyediakan modal bantuan "Panduan IFP Android" yang mudah dipahami guru (cara instalasi di IFP dan opsi menghubungkan webcam).
4. **Sentuhan Multi-Touch di Game Containers**:
   - Memastikan event klik/sentuh kartu jawaban di `GameContainer`, `TruthDashContainer`, dan `CatchQuestContainer` merespons event `pointerdown` instan tanpa delay 300ms.
5. **Pre-built `dist/` & `start.bat`**:
   - Membangun bundel produksi lengkap (`npm run build`) ke folder `dist/` agar siap dimasukkan ke flashdisk.
   - Memperbarui `start.bat` dengan server HTTP mandiri PowerShell untuk PC Windows jika IFP menggunakan komputer mini OPS Windows.

---

## 5. Verification Plan

1. **Pengujian PWA & Manifest Android**:
   - Verifikasi manifest mendukung mode `standalone` dan `landscape` untuk layar panel interaktif.
   - Pengujian Service Worker caching offline.
2. **Pengujian Sentuhan Layar IFP**:
   - Memastikan target sentuh merespons seketika dengan `pointerdown`.
   - Menguji tidak adanya zoom yang tidak disengaja atau popup context menu saat layar ditahan/disentuh multi-jari.
3. **Pengujian Fallback Kamera & Sentuh**:
   - Menguji alur ketika kamera tidak tersedia di IFP sehingga game tetap 100% lancar dimainkan dengan sentuhan tangan.
4. **Kompilasi & Build Produksi**:
   - Menjalankan `compile_applet` untuk memastikan semua berkas TypeScript lolos build tanpa error.
