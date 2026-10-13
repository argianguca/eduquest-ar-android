import React, { useState, useEffect } from 'react';
import { GameConfig, Language } from '../../types/question';
import { HandTrackingState } from '../../services/handTracking';
import { audioService } from '../../services/audio';
import {
  Sparkles,
  CheckCircle2,
  Sliders,
  Hand,
  MousePointer,
  Touchpad,
  Camera,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface GestureCalibrationModalProps {
  trackingState: HandTrackingState;
  config: GameConfig;
  language: Language;
  onUpdateConfig: (newConfig: Partial<GameConfig>) => void;
  onCompleteCalibration: () => void;
  onSwitchMode: (mode: 'gesture' | 'touch' | 'mouse') => void;
  onCancel: () => void;
}

export const GestureCalibrationModal: React.FC<GestureCalibrationModalProps> = ({
  trackingState,
  config,
  language,
  onUpdateConfig,
  onCompleteCalibration,
  onSwitchMode,
  onCancel,
}) => {
  const isEn = language === 'en';
  const [testPinchesCount, setTestPinchesCount] = useState(0);
  const [isDummyHit, setIsDummyHit] = useState(false);

  // Check if pointer is hovering over dummy target
  const dummyTargetX = typeof window !== 'undefined' ? window.innerWidth * 0.7 : 500;
  const dummyTargetY = typeof window !== 'undefined' ? window.innerHeight * 0.5 : 300;
  const dummyRadius = 80;

  const pointerX = trackingState.pointer?.screenX ?? -1;
  const pointerY = trackingState.pointer?.screenY ?? -1;

  const distToDummy = Math.hypot(pointerX - dummyTargetX, pointerY - dummyTargetY);
  const isHoveringDummy = distToDummy <= dummyRadius;

  // React to pinch trigger
  useEffect(() => {
    if (trackingState.isPinchTriggered) {
      if (isHoveringDummy) {
        setIsDummyHit(true);
        setTestPinchesCount((prev) => prev + 1);
        audioService.playCorrect();
        setTimeout(() => setIsDummyHit(false), 600);
      } else {
        audioService.playPinchSelect();
      }
    }
  }, [trackingState.isPinchTriggered, isHoveringDummy]);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex flex-col justify-between p-4 md:p-8 select-none">
      {/* Top Banner */}
      <header className="w-full flex items-center justify-between bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-500 text-cyan-400">
            <Hand className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold font-mono text-cyan-300">
              {isEn ? 'GESTURE CALIBRATION & TEST' : 'KALIBRASI & UJI GESTUR TANGAN'}
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              {isEn
                ? 'Point with index finger and pinch with thumb to select'
                : 'Arahkan jari telunjuk dan cubit (pinch) dengan jempol untuk memilih'}
            </p>
          </div>
        </div>

        {/* Alternative Modes */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            {isEn ? 'Prefer other controls?' : 'Ingin kontrol lain?'}
          </span>
          <button
            onClick={() => onSwitchMode('touch')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-950 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-emerald-300 text-xs font-mono transition-colors cursor-pointer"
          >
            <Touchpad className="w-4 h-4 text-emerald-400" />
            <span>Mode Sentuh (IFP)</span>
          </button>
          <button
            onClick={() => onSwitchMode('mouse')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-950 border border-slate-700 hover:border-amber-500 text-slate-300 hover:text-amber-300 text-xs font-mono transition-colors cursor-pointer"
          >
            <MousePointer className="w-4 h-4 text-amber-400" />
            <span>Mode Mouse</span>
          </button>
        </div>
      </header>

      {/* Middle Interactive Test Area */}
      <div className="relative w-full grow my-4 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Side: Real-time Hand Tracking Feedback Panel */}
        <div className="w-full md:w-96 bg-slate-900/90 border border-slate-700 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
          <h3 className="text-sm font-bold font-mono text-cyan-400 uppercase flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            {isEn ? 'Live Sensor Data' : 'Data Sensor Real-Time'}
          </h3>

          {/* Status Indicator */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 font-mono">Status Deteksi Tangan</span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  trackingState.isHandDetected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-400 animate-ping'
                }`}
              />
              <span className={`text-xs font-mono font-bold ${trackingState.isHandDetected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trackingState.isHandDetected ? 'TERDETEKSI' : 'TIDAK TERLIHAT'}
              </span>
            </div>
          </div>

          {/* Pinch Distance / Charge Meter */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Tekanan Cubitan (Pinch Meter)</span>
              <span className="text-cyan-300 font-bold">
                {Math.round(trackingState.pinchChargeProgress * 100)}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-950 border border-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  trackingState.isPinching
                    ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]'
                    : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                }`}
                style={{ width: `${Math.round(trackingState.pinchChargeProgress * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Terbuka</span>
              <span>Ambang Batas</span>
              <span>Terkunci</span>
            </div>
          </div>

          {/* Sliders for Tuning */}
          <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Sensitivitas Cubit (Threshold)</span>
                <span className="text-cyan-300">{Math.round(config.pinchThreshold * 100)}</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.65"
                step="0.02"
                value={config.pinchThreshold}
                onChange={(e) => onUpdateConfig({ pinchThreshold: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Kehalusan Reticle (Smoothing)</span>
                <span className="text-cyan-300">{Math.round(config.reticleSmoothing * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.85"
                step="0.05"
                value={config.reticleSmoothing}
                onChange={(e) => onUpdateConfig({ reticleSmoothing: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Center / Right: Interactive Dummy Target */}
        <div className="grow flex flex-col items-center justify-center p-6 text-center">
          <div
            className={`relative flex flex-col items-center justify-center w-56 h-56 rounded-full border-4 transition-all duration-200 cursor-pointer ${
              isDummyHit
                ? 'bg-emerald-950/80 border-emerald-400 shadow-[0_0_50px_#34d399] scale-110'
                : isHoveringDummy
                ? 'bg-cyan-950/60 border-cyan-300 shadow-[0_0_35px_#22d3ee] scale-105'
                : 'bg-slate-900/60 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
            }`}
            onClick={() => {
              setIsDummyHit(true);
              setTestPinchesCount((c) => c + 1);
              audioService.playCorrect();
              setTimeout(() => setIsDummyHit(false), 500);
            }}
          >
            {/* Target Crosshair graphic */}
            <div className="absolute inset-4 rounded-full border border-dashed border-cyan-400/50 animate-[spin_10s_linear_infinite]" />
            <Sparkles
              className={`w-10 h-10 mb-2 transition-transform ${
                isDummyHit ? 'text-emerald-300 scale-125' : isHoveringDummy ? 'text-cyan-300' : 'text-cyan-400'
              }`}
            />
            <span className="text-sm font-bold font-mono text-slate-200">
              {isDummyHit
                ? 'TARGET TERKUNCI!'
                : isHoveringDummy
                ? 'CUBIT JARI SEKARANG!'
                : 'ARAHKAN RETICLE KE SINI'}
            </span>
            <span className="text-xs text-slate-400 font-mono mt-1">
              (Uji Coba: {testPinchesCount}x Berhasil)
            </span>
          </div>

          <p className="mt-4 text-sm text-slate-300 max-w-md">
            {testPinchesCount > 0
              ? 'Hebat! Anda sudah menguasai gestur cubit. Klik Mulai Misi di bawah untuk bermain!'
              : 'Arahkan reticle biru ke lingkaran di atas, lalu rapatkan jari telunjuk dan jempol Anda untuk mencobanya.'}
          </p>
        </div>
      </div>

      {/* Bottom Actions */}
      <footer className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-sm cursor-pointer"
        >
          {isEn ? 'Cancel / Back' : 'Batal / Kembali'}
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onCompleteCalibration}
            className={`px-8 py-3 rounded-xl font-bold font-mono tracking-wider text-base flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
              testPinchesCount > 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-[0_0_25px_rgba(52,211,153,0.4)] animate-pulse'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            }`}
          >
            <span>{isEn ? 'START MISSION' : 'MULAI MISI SEKARANG'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
};
