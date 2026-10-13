import React, { useState, useEffect } from 'react';
import { GameConfig, Language } from '../../types/question';
import { cameraService } from '../../services/camera';
import { handTrackingEngine } from '../../services/handTracking';
import { audioService } from '../../services/audio';
import { geminiClient } from '../../services/gemini';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Camera,
  HardDrive,
  Cpu,
  Volume2,
  RefreshCw,
  X,
  Touchpad,
  MousePointer,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface DiagnosticModalProps {
  config: GameConfig;
  language: Language;
  onClose: () => void;
  onSwitchMode: (mode: 'gesture' | 'touch' | 'mouse') => void;
  onOpenCameraTest?: () => void;
  onOpenTouchTest?: () => void;
}

interface DiagnosticItem {
  id: string;
  name: string;
  status: 'checking' | 'passed' | 'warning' | 'failed';
  details: string;
  solution?: string;
}

export const DiagnosticModal: React.FC<DiagnosticModalProps> = ({
  config,
  language,
  onClose,
  onSwitchMode,
  onOpenCameraTest,
  onOpenTouchTest,
}) => {
  const isEn = language === 'en';
  const [isRunning, setIsRunning] = useState(true);
  const [results, setResults] = useState<DiagnosticItem[]>([]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const items: DiagnosticItem[] = [];

    // 1. IndexedDB Storage
    try {
      const isIDBSupported = typeof indexedDB !== 'undefined';
      if (isIDBSupported) {
        items.push({
          id: 'storage',
          name: 'Penyimpanan Data Lokal (IndexedDB)',
          status: 'passed',
          details: 'IndexedDB aktif dan siap menyimpan bank soal secara offline di browser.',
        });
      } else {
        items.push({
          id: 'storage',
          name: 'Penyimpanan Data Lokal (IndexedDB)',
          status: 'warning',
          details: 'IndexedDB tidak tersedia, aplikasi menggunakan fallback localStorage.',
        });
      }
    } catch {
      items.push({
        id: 'storage',
        name: 'Penyimpanan Data Lokal',
        status: 'failed',
        details: 'Gagal mengakses penyimpanan lokal browser.',
      });
    }

    // 2. MediaPipe Vision Local WASM Assets
    try {
      const res = await fetch('/wasm/vision_wasm_internal.js', { method: 'HEAD' });
      if (res.ok) {
        items.push({
          id: 'wasm',
          name: 'Runtime Vision WASM Lokal',
          status: 'passed',
          details: 'Berkas WASM MediaPipe (/wasm) tersedia secara lokal untuk penggunaan tanpa internet.',
        });
      } else {
        items.push({
          id: 'wasm',
          name: 'Runtime Vision WASM Lokal',
          status: 'warning',
          details: 'Berkas WASM lokal tidak merespons, aplikasi akan menggunakan fallback CDN jika terhubung ke internet.',
        });
      }
    } catch {
      items.push({
        id: 'wasm',
        name: 'Runtime Vision WASM Lokal',
        status: 'warning',
        details: 'Pemeriksaan WASM lokal dilewati atau gagal dibaca.',
      });
    }

    // 3. Hand Landmarker AI Model File
    try {
      const res = await fetch('/models/hand_landmarker.task', { method: 'HEAD' });
      if (res.ok) {
        items.push({
          id: 'model',
          name: 'Model Pelacakan Tangan (hand_landmarker.task)',
          status: 'passed',
          details: 'Model AI lokal (/models/hand_landmarker.task, 7.5 MB) siap di perangkat!',
        });
      } else {
        items.push({
          id: 'model',
          name: 'Model Pelacakan Tangan',
          status: 'warning',
          details: 'Berkas model lokal tidak ditemukan. Mode gesture memerlukan koneksi internet untuk mengunduh model pertama kali.',
        });
      }
    } catch {
      items.push({
        id: 'model',
        name: 'Model Pelacakan Tangan',
        status: 'warning',
        details: 'Tidak dapat memeriksa berkas model lokal.',
      });
    }

    // 4. Web Audio API Sound System
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        items.push({
          id: 'audio',
          name: 'Sintesis Efek Suara (Web Audio API)',
          status: 'passed',
          details: 'Audio synthesizer lokal aktif (100% offline tanpa unduhan file audio eksternal).',
        });
      } else {
        items.push({
          id: 'audio',
          name: 'Sistem Suara',
          status: 'failed',
          details: 'Web Audio API tidak didukung browser ini.',
        });
      }
    } catch {
      items.push({
        id: 'audio',
        name: 'Sistem Suara',
        status: 'warning',
        details: 'Gagal inisialisasi modul audio.',
      });
    }

    // 5. Camera Device & Permissions Check
    try {
      const cameras = await cameraService.getAvailableCameras();
      if (cameras.length > 0) {
        items.push({
          id: 'camera',
          name: `Kamera & Webcam Terdeteksi (${cameras.length} Perangkat)`,
          status: 'passed',
          details: cameras.map((c) => c.label).join(', '),
        });
      } else {
        items.push({
          id: 'camera',
          name: 'Perangkat Kamera / Webcam',
          status: 'warning',
          details: 'Tidak ada webcam terdeteksi atau izin belum diberikan.',
          solution: 'Gunakan Mode Layar Sentuh (IFP) atau Mode Mouse.',
        });
      }
    } catch {
      items.push({
        id: 'camera',
        name: 'Perangkat Kamera',
        status: 'failed',
        details: 'Kesalahan saat memeriksa perangkat video.',
        solution: 'Beralih ke Mode Layar Sentuh.',
      });
    }

    // 6. Network Connectivity State
    const isOnline = navigator.onLine;
    items.push({
      id: 'network',
      name: isOnline ? 'Koneksi Internet: Online' : 'Koneksi Internet: Mode Mandiri (Offline)',
      status: 'passed',
      details: isOnline
        ? 'Perangkat terhubung ke internet. Fitur pembuatan soal AI (Gemini) dapat digunakan.'
        : 'Perangkat offline. Seluruh gameplay AR, bank soal lokal, suara, dan mode sentuh tetap bekerja 100%!',
    });

    // 7. Gemini AI Question Generator Status
    try {
      const hasCustomKey = geminiClient.hasCustomApiKey();
      const health = await geminiClient.checkHealth();
      if (hasCustomKey) {
        items.push({
          id: 'gemini',
          name: 'Generator Soal AI (Gemini): Kunci Kustom Aktif',
          status: 'passed',
          details: `Kunci API kustom tersimpan (${geminiClient.getMaskedApiKey()}) dan siap menghasilkan butir soal SD.`,
        });
      } else if (health.geminiConfigured) {
        items.push({
          id: 'gemini',
          name: 'Generator Soal AI (Gemini): Kunci Server Aktif',
          status: 'passed',
          details: 'GEMINI_API_KEY terdeteksi di lingkungan server (.env / Secrets).',
        });
      } else {
        items.push({
          id: 'gemini',
          name: 'Generator Soal AI (Gemini): Belum Dikonfigurasi',
          status: 'warning',
          details: 'Kunci API Gemini belum diatur. Anda dapat memasukkan kunci API di Studio Pembuat Soal atau Pengaturan.',
          solution: 'Dapatkan kunci gratis di Google AI Studio dan simpan di Pengaturan atau Pembuat Soal.',
        });
      }
    } catch {
      items.push({
        id: 'gemini',
        name: 'Generator Soal AI (Gemini)',
        status: 'warning',
        details: 'Status koneksi Gemini AI tidak dapat diperiksa.',
      });
    }

    setResults(items);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const hasCameraIssue = results.some(
    (r) => (r.id === 'camera' || r.id === 'model') && (r.status === 'warning' || r.status === 'failed')
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="max-w-2xl w-full bg-slate-900 border-2 border-cyan-500 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
            <h3 className="text-xl font-bold font-mono text-cyan-300">
              {isEn ? 'Classroom Hardware & Offline Diagnostics' : 'Panel Diagnostik Kelas & Kesiapan Offline'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 font-mono leading-relaxed">
          Pemeriksaan menyeluruh komponen perangkat keras, webcam, modul MediaPipe lokal, penyimpanan offline, dan sintesis audio untuk menjamin kelancaran belajar di laptop maupun Layar Sentuh Interaktif (Interactive Flat Panel).
        </p>

        {/* Diagnostic Results List */}
        <div className="flex flex-col gap-3 font-mono text-xs">
          {isRunning ? (
            <div className="p-8 text-center flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="text-slate-300">Sedang memeriksa kesiapan perangkat...</span>
            </div>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3"
              >
                <div className="shrink-0 mt-0.5">
                  {item.status === 'passed' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                  {item.status === 'warning' && (
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                  )}
                  {item.status === 'failed' && <XCircle className="w-5 h-5 text-rose-400" />}
                </div>
                <div className="flex flex-col gap-0.5 grow">
                  <span className="font-bold text-slate-200">{item.name}</span>
                  <span className="text-slate-400 leading-normal">{item.details}</span>
                  {item.solution && (
                    <span className="text-amber-300 mt-1 font-semibold">
                      Saran: {item.solution}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Fallback Switch if Camera Has Issues */}
        {hasCameraIssue && (
          <div className="p-4 rounded-2xl bg-cyan-950/70 border border-cyan-500/50 flex flex-col gap-2 font-mono text-xs">
            <span className="font-bold text-cyan-300">
              REKOMENDASI PENGGUNAAN LAYAR SENTUH INTERAKTIF (IFP):
            </span>
            <p className="text-slate-300 leading-normal">
              Jika webcam di atas panel interaktif tidak tersedia, Anda dapat langsung mengaktifkan Mode Layar Sentuh. Murid cukup menekan tombol jawaban besar pada layar flat panel.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => {
                  onSwitchMode('touch');
                  onClose();
                  audioService.playButtonClick();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all cursor-pointer"
              >
                <Touchpad className="w-4 h-4" />
                <span>Aktifkan Mode Sentuh (IFP)</span>
              </button>
              <button
                onClick={() => {
                  onSwitchMode('mouse');
                  onClose();
                  audioService.playButtonClick();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all cursor-pointer"
              >
                <MousePointer className="w-4 h-4" />
                <span>Aktifkan Mode Mouse</span>
              </button>
            </div>
          </div>
        )}

        {/* IFP Live Tests */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2.5 font-mono text-xs">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>PENGUJIAN PANEL INTERAKTIF & APK (HISENSE 75WM61FE):</span>
          </div>
          <p className="text-slate-400 font-sans text-xs">
            Uji kamera live feed, deteksi gestur tangan MediaPipe lokal, dan responsivitas layar sentuh multi-touch secara terpisah.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onOpenCameraTest && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCameraTest();
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                <Camera className="w-4 h-4" />
                <span>Buka Uji Kamera & MediaPipe</span>
              </button>
            )}

            {onOpenTouchTest && (
              <button
                onClick={() => {
                  onClose();
                  onOpenTouchTest();
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(20,184,166,0.3)]"
              >
                <Touchpad className="w-4 h-4" />
                <span>Buka Uji Multi-Touch (20+ Jari)</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>Jalankan Ulang Diagnostik</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
