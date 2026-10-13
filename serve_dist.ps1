# ==============================================================================
# EduQuest AR - Windows Standalone Offline HTTP Server (Tanpa Node.js)
# Melayani berkas folder dist/ pada http://localhost:3000
# ==============================================================================

$port = 3000
$root = Join-Path $PSScriptRoot "dist"

if (-not (Test-Path (Join-Path $root "index.html"))) {
    Write-Host "[ERROR] Berkas dist/index.html tidak ditemukan!" -ForegroundColor Red
    Write-Host "Pastikan folder 'dist' berada di dalam direktori game ini." -ForegroundColor Yellow
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "[WARNING] Gagal mengikat http://localhost:$port/. Mencoba http://127.0.0.1:$port/..." -ForegroundColor Yellow
    $listener = New-Object System.Net.HttpListener
    $prefix = "http://127.0.0.1:$port/"
    $listener.Prefixes.Add($prefix)
    $listener.Start()
}

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "                EDUQUEST AR - SERVER OFFLINE MANDIRI BERJALAN                " -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "Alamat Server : $prefix" -ForegroundColor Yellow
Write-Host "Folder Berkas : $root" -ForegroundColor Gray
Write-Host "Status        : Siap dimainkan di PC atau Interactive Flat Panel (IFP)" -ForegroundColor Green
Write-Host "Tekan Ctrl+C di jendela ini untuk mematikan server game." -ForegroundColor Gray
Write-Host "==============================================================================" -ForegroundColor Cyan

# Buka browser secara otomatis
Start-Process $prefix

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json"
    ".webmanifest" = "application/manifest+json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".wasm" = "application/wasm"
    ".task" = "application/octet-stream"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($path) -or $path -eq "/") {
            $path = "index.html"
        }

        $filePath = Join-Path $root $path

        # SPA Fallback: jika berkas tidak ada dan tidak memiliki ekstensi berkas, kirim index.html
        if (-not (Test-Path $filePath -PathType Leaf)) {
            $ext = [System.IO.Path]::GetExtension($path)
            if ([string]::IsNullOrWhiteSpace($ext)) {
                $filePath = Join-Path $root "index.html"
            }
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $mime = $mimeTypes[$ext]
            }

            $response.ContentType = $mime
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Cache-Control", "no-cache")

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
