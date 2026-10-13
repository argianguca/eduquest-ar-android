@echo off
setlocal enabledelayedexpansion
title EduQuest AR - Peluncur Game Edukasi Interaktif Kelas
color 0B

:: 1. Pastikan direktori kerja adalah folder letak berkas start.bat ini
cd /d "%~dp0"

echo ==============================================================================
echo                      EDUQUEST AR - UNIVERSAL CLASSROOM LAUNCHER
echo              Game Edukasi Berbasis Gestur Tangan & Layar Sentuh Interaktif
echo                       (Untuk SD Kelas 1 - 6 & Layar IFP Android)
echo ==============================================================================
echo [INFO] Direktori Kerja: %CD%
echo.

:: 2. Cek apakah folder 'dist' siap pakai tersedia
if exist "dist\index.html" (
    set DIST_AVAILABLE=1
) else (
    set DIST_AVAILABLE=0
)

:: 3. Cek ketersediaan Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    goto NO_NODE_MODE
)

:: --- JIKA NODE.JS TERSEDIA ---
echo [OK] Node.js terdeteksi:
node -v
call npm -v
echo.

if %DIST_AVAILABLE% equ 1 (
    echo Pilih metode peluncuran:
    echo   [1] Mode Cepat Siap Pakai (Dist Mandiri - Langsung jalan dalam 1 detik)
    echo   [2] Mode Pengembang (Node.js dev server dengan vite)
    echo.
    set /p USER_CHOICE="Pilihan Anda (tekan Enter untuk default [1]): "
    if "!USER_CHOICE!"=="2" goto RUN_NODE_DEV
    goto RUN_POWERSHELL_SERVER
)

:RUN_NODE_DEV
echo.
echo [INFO] Menyiapkan Server Node.js Dev...
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Membuat salinan .env dari .env.example...
        copy .env.example .env >nul
    )
)

if not exist "node_modules\" (
    echo [INFO] Dependensi belum terpasang. Menjalankan 'npm install --legacy-peer-deps'...
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Gagal memasang dependensi npm.
        pause
        exit /b 1
    )
)

echo [INFO] Memulai Vite dev server pada http://localhost:3000...
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"
call npm run dev
goto END

:: --- JIKA NODE.JS TIDAK ADA (OFFLINE STANDALONE WINDOWS) ---
:NO_NODE_MODE
echo ==============================================================================
echo [MODE MANDIRI TANPA NODE.JS TERDETEKSI]
echo Node.js tidak terpasang di komputer ini.
echo Mengalihkan otomatis ke Server Offline Mandiri (Windows PowerShell)...
echo ==============================================================================
echo.

if %DIST_AVAILABLE% equ 0 (
    color 0C
    echo [ERROR] Folder 'dist' belum ditemukan di direktori ini!
    echo Silakan jalankan 'buka_game.html' atau hubungi pembuat untuk paket dist lengkap.
    echo.
    pause
    exit /b 1
)

:RUN_POWERSHELL_SERVER
echo [INFO] Menjalankan server static offline pada port 3000...
echo [PETUNJUK KELAS]:
echo - Browser akan otomatis terbuka ke: http://localhost:3000
echo - Untuk Interactive Flat Panel (IFP), hubungkan kabel HDMI dan USB Touch dari PC ke layar.
echo - Atau buka alamat IP komputer ini dari browser Android IFP yang satu jaringan Wi-Fi.
echo - JANGAN TUTUP jendela terminal ini selama bermain!
echo ==============================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve_dist.ps1"

:END
if %errorlevel% neq 0 (
    echo.
    echo [INFO] Server ditutup.
    pause
)
