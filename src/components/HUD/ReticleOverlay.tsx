import React from 'react';
import { HandPoint } from '../../services/handTracking';

interface ReticleOverlayProps {
  pointer: HandPoint | null;
  pinchCharge: number; // 0 to 1
  isPinching: boolean;
  isTriggered: boolean;
  hoveredOptionIndex: number | null;
  inputMode: 'gesture' | 'touch' | 'mouse';
  isHandDetected: boolean;
}

export const ReticleOverlay: React.FC<ReticleOverlayProps> = ({
  pointer,
  pinchCharge,
  isPinching,
  isTriggered,
  hoveredOptionIndex,
  inputMode,
  isHandDetected,
}) => {
  if (inputMode === 'touch' || !pointer || (!isHandDetected && inputMode === 'gesture')) {
    return null;
  }

  const { screenX, screenY } = pointer;
  const isLocked = hoveredOptionIndex !== null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      {/* Target Reticle at pointer coordinate */}
      <div
        className="absolute transition-transform duration-75 ease-out"
        style={{
          transform: `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -50%)`,
        }}
      >
        {/* Outer Rotating Radar Ring */}
        <div
          className={`relative flex items-center justify-center transition-all duration-200 ${
            isLocked ? 'w-24 h-24' : 'w-20 h-20'
          }`}
        >
          <svg
            className={`w-full h-full animate-[spin_8s_linear_infinite] ${
              isLocked ? 'text-cyan-400' : 'text-cyan-500/80'
            }`}
            viewBox="0 0 100 100"
          >
            {/* Outer dashed tech circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              className="opacity-70"
            />
            {/* Corner alignment brackets */}
            <path
              d="M 50 8 A 42 42 0 0 1 92 50"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 50 92 A 42 42 0 0 1 8 50"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Pinch Charging Ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="34"
              fill="none"
              stroke="rgba(6, 182, 212, 0.2)"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r="34"
              fill="none"
              stroke={isLocked ? '#38bdf8' : '#06b6d4'}
              strokeWidth="4"
              strokeDasharray={2 * Math.PI * 34}
              strokeDashoffset={2 * Math.PI * 34 * (1 - pinchCharge)}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>

          {/* Inner Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Top tick */}
            <div
              className={`absolute top-1 w-0.5 h-3 ${
                isLocked ? 'bg-cyan-300 shadow-[0_0_8px_#22d3ee]' : 'bg-cyan-400'
              }`}
            />
            {/* Bottom tick */}
            <div
              className={`absolute bottom-1 w-0.5 h-3 ${
                isLocked ? 'bg-cyan-300 shadow-[0_0_8px_#22d3ee]' : 'bg-cyan-400'
              }`}
            />
            {/* Left tick */}
            <div
              className={`absolute left-1 w-3 h-0.5 ${
                isLocked ? 'bg-cyan-300 shadow-[0_0_8px_#22d3ee]' : 'bg-cyan-400'
              }`}
            />
            {/* Right tick */}
            <div
              className={`absolute right-1 w-3 h-0.5 ${
                isLocked ? 'bg-cyan-300 shadow-[0_0_8px_#22d3ee]' : 'bg-cyan-400'
              }`}
            />

            {/* Central Pointer Dot */}
            <div
              className={`rounded-full transition-all duration-150 ${
                isPinching
                  ? 'w-4 h-4 bg-emerald-400 shadow-[0_0_15px_#34d399] scale-125'
                  : isLocked
                  ? 'w-3 h-3 bg-cyan-300 shadow-[0_0_10px_#67e8f9] animate-pulse'
                  : 'w-2 h-2 bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
              }`}
            />
          </div>

          {/* Energy Burst Animation when pinch triggers */}
          {isTriggered && (
            <div className="absolute inset-0 rounded-full border-4 border-cyan-300 animate-ping opacity-90" />
          )}

          {/* Aim-Lock Label */}
          {isLocked && (
            <div className="absolute -bottom-7 whitespace-nowrap px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/50 text-[10px] font-mono tracking-wider text-cyan-300 uppercase shadow-lg">
              TARGET LOCK [Opsi {['A', 'B', 'C', 'D'][hoveredOptionIndex]}]
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
