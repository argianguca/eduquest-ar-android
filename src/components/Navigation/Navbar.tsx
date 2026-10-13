import React from 'react';
import { Language, InputMode } from '../../types/question';
import {
  Sparkles,
  Gamepad2,
  BookOpen,
  PenTool,
  Settings,
  Activity,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
  Hand,
  Touchpad,
  MousePointer,
  Camera,
} from 'lucide-react';
import { PWAInstallButton } from '../PWA/PWAInstallButton';

interface NavbarProps {
  currentView: 'play' | 'bank' | 'maker';
  onSelectView: (view: 'play' | 'bank' | 'maker') => void;
  language: Language;
  onToggleLanguage: () => void;
  inputMode: InputMode;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
  onOpenCameraTest?: () => void;
  onOpenTouchTest?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  language,
  onToggleLanguage,
  inputMode,
  onOpenSettings,
  onOpenDiagnostics,
  onOpenCameraTest,
  onOpenTouchTest,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const isEn = language === 'en';
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return (
    <nav className="w-full bg-slate-950/90 backdrop-blur-md border-b border-cyan-500/20 px-4 py-3 select-none z-30 sticky top-0">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand Identity */}
        <div
          onClick={() => onSelectView('play')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 p-0.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-cyan-400">
              <Hand className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold font-mono tracking-wider bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                EduQuest AR
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold hidden sm:inline">
                SD 1–6
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block font-sans">
              Universal Gesture Educational Game
            </span>
          </div>
        </div>

        {/* Center: View Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-1 font-mono text-xs font-semibold">
          <button
            onClick={() => onSelectView('play')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              currentView === 'play'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)] font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>{isEn ? 'Play Game' : 'Arena Misi AR'}</span>
          </button>

          <button
            onClick={() => onSelectView('bank')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              currentView === 'bank'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)] font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{isEn ? 'Question Bank' : 'Bank Soal'}</span>
          </button>

          <button
            onClick={() => onSelectView('maker')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              currentView === 'maker'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)] font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{isEn ? 'AI Question Maker' : 'Pembuat Soal AI'}</span>
          </button>
        </div>

        {/* Right: Quick Status & Utility Controls */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton variant="navbar" />

          {/* Offline / Online Badge */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-mono ${
              isOnline
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
            title={
              isOnline
                ? 'Terhubung ke internet'
                : 'Mode Mandiri: Semua game & bank soal tetap berjalan lancar'
            }
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Online' : 'Mode Offline'}</span>
          </div>

          {/* Current Control Mode Icon */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
            title="Mode Kontrol Aktif"
          >
            {inputMode === 'gesture' && <Hand className="w-3.5 h-3.5 text-cyan-400" />}
            {inputMode === 'touch' && <Touchpad className="w-3.5 h-3.5 text-emerald-400" />}
            {inputMode === 'mouse' && <MousePointer className="w-3.5 h-3.5 text-amber-400" />}
            <span className="capitalize hidden sm:inline">
              {inputMode === 'gesture' ? 'AR' : inputMode === 'touch' ? 'IFP' : 'Mouse'}
            </span>
          </div>

          {/* IFP Camera Test Screen */}
          {onOpenCameraTest && (
            <button
              onClick={onOpenCameraTest}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Uji Kamera & MediaPipe (Hisense IFP)"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
            </button>
          )}

          {/* IFP Multi-Touch Test Screen */}
          {onOpenTouchTest && (
            <button
              onClick={onOpenTouchTest}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-teal-300 transition-colors cursor-pointer"
              title="Uji Layar Sentuh Multi-Touch (Hisense IFP)"
            >
              <Touchpad className="w-4 h-4 text-teal-400" />
            </button>
          )}

          {/* Diagnostics Button */}
          <button
            onClick={onOpenDiagnostics}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Diagnostik Perangkat Kelas"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Pengaturan Game"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="px-2 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-bold text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Ganti Bahasa Antarmuka"
          >
            {language.toUpperCase()}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </nav>
  );
};
