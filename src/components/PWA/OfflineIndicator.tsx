import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/90 text-slate-950 font-bold text-xs shadow-xl backdrop-blur-md border border-amber-300 animate-in fade-in slide-in-from-bottom-2">
      <div className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Mode Offline Aktif — Semua bank soal & permainan tetap berjalan lokal!</span>
    </div>
  );
};
