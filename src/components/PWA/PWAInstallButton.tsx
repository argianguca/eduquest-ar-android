import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Sparkles, CheckCircle2, HelpCircle, X } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'banner' | 'card';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    }
  };

  // If running in standalone mode (already installed), show a small subtle offline-ready badge
  if (isInstalled) {
    if (variant === 'banner') {
      return (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Aplikasi Terinstal • Siap Main Offline</span>
        </div>
      );
    }
    return (
      <div
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono"
        title="EduQuest AR sudah terpasang dan berjalan dalam mode aplikasi mandiri (offline siap)"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span>Offline Ready</span>
      </div>
    );
  }

  // Variant: Large Banner (for Classroom Kiosk)
  if (variant === 'banner') {
    if (isInstallable) {
      return (
        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-indigo-950/80 border border-cyan-500/30 shadow-lg ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Pasang EduQuest ke Komputer / Tablet</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  100% Offline
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Bisa dibuka langsung tanpa buka browser, tanpa internet, dan tanpa perlu install Node.js!
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:brightness-110 text-slate-950 font-bold text-xs tracking-wider shadow-md hover:scale-[1.02] transition-transform cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>PASANG KE LAYAR UTAMA</span>
          </button>
        </div>
      );
    }

    if (isIOS) {
      return (
        <>
          <div
            className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 ${className}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">
                  Simpan EduQuest di Layar iPad / iPhone
                </span>
                <p className="text-xs text-slate-400">
                  Akses instan di kelas tanpa mengetik alamat situs web.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs cursor-pointer shrink-0"
            >
              Petunjuk Pemasangan iOS
            </button>
          </div>

          {showIOSGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">Pasang di iPhone / iPad</h3>
                  <button
                    onClick={() => setShowIOSGuide(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside">
                  <li>
                    Tekan tombol <strong className="text-cyan-300">Bagikan (Share)</strong> di bar Safari (ikon kotak bertanda panah ke atas).
                  </li>
                  <li>
                    Gulir ke bawah dan pilih <strong className="text-cyan-300">Tambah ke Layar Utama (Add to Home Screen)</strong>.
                  </li>
                  <li>
                    Tekan <strong className="text-emerald-400">Tambah (Add)</strong> di pojok kanan atas.
                  </li>
                </ol>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-5 w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
                >
                  Mengerti
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

    return null;
  }

  // Variant: Navbar Button
  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-teal-500/20 hover:from-cyan-500/30 hover:to-teal-500/30 border border-cyan-400/40 text-cyan-300 hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer ${className}`}
        title="Pasang aplikasi ke komputer/HP agar bisa dimainkan offline tanpa buka web browser"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Pasang Aplikasi</span>
        <span className="sm:hidden">Install</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Pasang (iOS)</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">Pasang di Safari iOS</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside">
                <li>
                  Tekan ikon <strong className="text-cyan-300">Bagikan (Share)</strong> di Safari.
                </li>
                <li>
                  Pilih <strong className="text-cyan-300">Tambah ke Layar Utama</strong>.
                </li>
                <li>
                  Selesai! EduQuest dapat dibuka langsung dari layar depan iPad/iPhone.
                </li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
