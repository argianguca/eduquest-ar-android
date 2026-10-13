import React, { useState, useEffect, useRef } from 'react';
import {
  Touchpad,
  Sparkles,
  Users,
  RotateCcw,
  X,
  CheckCircle2,
  Activity,
  Layers,
  Hand,
  Maximize2,
} from 'lucide-react';

interface MultiTouchTestScreenProps {
  onClose: () => void;
  isEn?: boolean;
}

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  radiusX?: number;
  radiusY?: number;
  color: string;
}

const TOUCH_COLORS = [
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#a855f7', // Purple
  '#e11d48', // Rose
  '#84cc16', // Lime
  '#0ea5e9', // Sky
];

export const MultiTouchTestScreen: React.FC<MultiTouchTestScreenProps> = ({ onClose, isEn = false }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activeTouches, setActiveTouches] = useState<TouchPoint[]>([]);
  const [maxTouchesSeen, setMaxTouchesSeen] = useState<number>(0);

  // Dual-student zone test counters
  const [playerATaps, setPlayerATaps] = useState<number>(0);
  const [playerBTaps, setPlayerBTaps] = useState<number>(0);
  const [simultaneousHits, setSimultaneousHits] = useState<number>(0);

  const activePointsMap = useRef<Map<number, TouchPoint>>(new Map());
  const trailsRef = useRef<Map<number, { x: number; y: number }[]>>(new Map());

  // Handle canvas sizing
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        redraw();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw trail lines
    trailsRef.current.forEach((trail, id) => {
      if (trail.length < 2) return;
      const touch = activePointsMap.current.get(id);
      const color = touch ? touch.color : TOUCH_COLORS[Math.abs(id) % TOUCH_COLORS.length];

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      for (let i = 0; i < trail.length; i++) {
        const pt = trail[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    });

    // Draw active touch points with glowing circles
    activePointsMap.current.forEach((tp, id) => {
      // Outer pulse ring
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 42, 0, 2 * Math.PI);
      ctx.fillStyle = `${tp.color}33`;
      ctx.fill();

      // Core circle
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 24, 0, 2 * Math.PI);
      ctx.fillStyle = tp.color;
      ctx.shadowColor = tp.color;
      ctx.shadowBlur = 15;
      ctx.fill();

      // Touch index label
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${id + 1}`, tp.x, tp.y);

      // Coordinates tooltip
      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px monospace';
      ctx.fillText(`${Math.round(tp.x)}, ${Math.round(tp.y)}`, tp.x, tp.y + 38);
    });
  };

  // Touch event handlers for high precision multi-touch on IFP
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;
      const id = t.identifier;
      const color = TOUCH_COLORS[Math.abs(id) % TOUCH_COLORS.length];

      activePointsMap.current.set(id, { id, x, y, color });

      const currentTrail = trailsRef.current.get(id) || [];
      trailsRef.current.set(id, [...currentTrail, { x, y }]);

      // Check split player zones
      const midX = rect.width / 2;
      if (x < midX) {
        setPlayerATaps((prev) => prev + 1);
      } else {
        setPlayerBTaps((prev) => prev + 1);
      }
    }

    const currentCount = activePointsMap.current.size;
    setMaxTouchesSeen((prev) => Math.max(prev, currentCount));
    setActiveTouches(Array.from(activePointsMap.current.values()));

    // Check if both sides touched simultaneously
    let hasLeft = false;
    let hasRight = false;
    const midX = rect.width / 2;
    activePointsMap.current.forEach((tp) => {
      if (tp.x < midX) hasLeft = true;
      else hasRight = true;
    });
    if (hasLeft && hasRight) {
      setSimultaneousHits((prev) => prev + 1);
    }

    redraw();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;
      const id = t.identifier;

      const existing = activePointsMap.current.get(id);
      if (existing) {
        existing.x = x;
        existing.y = y;
      }

      const currentTrail = trailsRef.current.get(id) || [];
      if (currentTrail.length > 50) currentTrail.shift();
      trailsRef.current.set(id, [...currentTrail, { x, y }]);
    }

    setActiveTouches(Array.from(activePointsMap.current.values()));
    redraw();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const id = e.changedTouches[i].identifier;
      activePointsMap.current.delete(id);
    }
    setActiveTouches(Array.from(activePointsMap.current.values()));
    redraw();
  };

  const clearCanvas = () => {
    trailsRef.current.clear();
    activePointsMap.current.clear();
    setActiveTouches([]);
    redraw();
  };

  const resetAllStats = () => {
    clearCanvas();
    setMaxTouchesSeen(0);
    setPlayerATaps(0);
    setPlayerBTaps(0);
    setSimultaneousHits(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col p-4 md:p-6 text-slate-100 font-sans select-none touch-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <Touchpad className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-mono text-teal-300">
              {isEn ? 'Interactive Flat Panel Multi-Touch Test' : 'Uji Layar Sentuh Multi-Touch (Hisense 75WM61FE)'}
            </h2>
            <p className="text-xs text-slate-400">
              {isEn
                ? 'Test up to 20+ simultaneous touch points, latency, and two-player split touch detection'
                : 'Uji deteksi sentuhan simultan hingga 20+ jari dan respons sentuhan dua siswa berdampingan'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearCanvas}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Bersihkan Jejak
          </button>
          <button
            onClick={resetAllStats}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold transition-all cursor-pointer border border-slate-700"
          >
            Reset Rekor
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
            title="Tutup Tes Multi-Touch"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="max-w-7xl w-full mx-auto py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-slate-400">Sentuhan Aktif:</span>
          <span className="text-2xl font-black text-cyan-400 mt-1">
            {activeTouches.length} <span className="text-xs text-slate-500 font-normal">Jari</span>
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-slate-400">Puncak Sentuhan (Maks):</span>
          <span className="text-2xl font-black text-emerald-400 mt-1">
            {maxTouchesSeen} <span className="text-xs text-slate-500 font-normal">Titik Simultan</span>
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-slate-400">Siswa A (Kiri) vs B (Kanan):</span>
          <span className="text-xl font-black text-teal-300 mt-1">
            {playerATaps} <span className="text-slate-500 text-sm">vs</span> {playerBTaps}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-slate-400">Sentuhan Simultan Dual-Pemain:</span>
          <span className="text-2xl font-black text-purple-400 mt-1">
            {simultaneousHits} <span className="text-xs text-slate-500 font-normal">Kali Sukses</span>
          </span>
        </div>
      </div>

      {/* Interactive Multi-Touch Canvas Surface */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="flex-1 max-w-7xl w-full mx-auto relative bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl cursor-crosshair select-none touch-none"
      >
        {/* Drawing Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Visual Dual-Player Dividing Guide Line */}
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-dashed border-r border-dashed border-slate-800 pointer-events-none" />

        {/* Watermark Labels for Classroom Split Mode */}
        <div className="absolute inset-0 flex pointer-events-none opacity-20">
          <div className="w-1/2 flex flex-col items-center justify-center p-6 text-center">
            <span className="text-6xl font-black font-mono text-cyan-400 tracking-widest">TIM A</span>
            <span className="text-sm font-mono text-slate-300 mt-2">Area Sentuh Siswa Kiri</span>
          </div>
          <div className="w-1/2 flex flex-col items-center justify-center p-6 text-center">
            <span className="text-6xl font-black font-mono text-emerald-400 tracking-widest">TIM B</span>
            <span className="text-sm font-mono text-slate-300 mt-2">Area Sentuh Siswa Kanan</span>
          </div>
        </div>

        {/* Instructions Overlay if empty */}
        {activeTouches.length === 0 && trailsRef.current.size === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
            <Hand className="w-16 h-16 text-cyan-500/40 mb-3 animate-bounce" />
            <p className="text-lg font-bold font-mono text-slate-300">
              Sentuh Layar Panel dengan Banyak Jari Sekaligus
            </p>
            <p className="text-xs text-slate-400 max-w-lg mt-1 font-sans">
              Hisense 75WM61FE mendukung hingga 20+ titik sentuh inframerah. Sentuh bersama teman di sisi kiri dan kanan untuk menguji game dua pemain (Truth Dash & Catch Quest).
            </p>
          </div>
        )}
      </div>

      {/* Footer status summary */}
      <div className="max-w-7xl w-full mx-auto pt-3 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Multi-touch driver IFP aktif (touch-action: none, 0ms gesture delay)</span>
        </div>
        <div>
          Layar 75 Inci 4K | Kompatibel dengan Sentuhan Jari & Stylus Pasif
        </div>
      </div>
    </div>
  );
};
