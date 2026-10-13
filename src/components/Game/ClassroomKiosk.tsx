import React, { useState, useMemo } from 'react';
import {
  QuestionCollection,
  Question,
  GradeLevel,
  GameConfig,
  Language,
  GameMode,
  InputMode,
} from '../../types/question';
import { PWAInstallButton } from '../PWA/PWAInstallButton';
import { audioService } from '../../services/audio';
import {
  Footprints,
  Zap,
  Crosshair,
  Touchpad,
  Camera,
  Play,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  Settings,
  HelpCircle,
  PlusCircle,
} from 'lucide-react';

interface ClassroomKioskProps {
  collections: QuestionCollection[];
  questions: Question[];
  config: GameConfig;
  language: Language;
  onStartGame: (collection: QuestionCollection, mode?: GameMode) => void;
  onUpdateConfig: (newConfig: Partial<GameConfig>) => void;
  onSwitchToAdvancedView: () => void;
  onNavigateToMaker: () => void;
  onOpenSettings: () => void;
}

export const ClassroomKiosk: React.FC<ClassroomKioskProps> = ({
  collections,
  questions,
  config,
  language,
  onStartGame,
  onUpdateConfig,
  onSwitchToAdvancedView,
  onNavigateToMaker,
  onOpenSettings,
}) => {
  const isEn = language === 'en';

  // Step 1: Selected Game Mode
  const [selectedMode, setSelectedMode] = useState<GameMode>(() => {
    try {
      const saved = localStorage.getItem('eduquest_selected_mode') as GameMode;
      if (saved && ['truth_dash', 'catch_quest', 'shooter'].includes(saved)) return saved;
    } catch {}
    return 'truth_dash';
  });

  // Step 2: Selected Grade & Subject & Collection
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(() => {
    return collections[0]?.id || '';
  });

  // Step 3: Selected Input Mode (Touch vs Camera Gesture)
  const currentInputMode = config.inputMode || 'touch';

  // Filter collections based on grade & subject
  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      const matchGrade = selectedGrade === 'all' || c.gradeLevel === selectedGrade;
      const matchSubject =
        selectedSubject === 'all' || c.subject.toLowerCase() === selectedSubject.toLowerCase();
      return matchGrade && matchSubject;
    });
  }, [collections, selectedGrade, selectedSubject]);

  // Current active collection
  const activeCollection = useMemo(() => {
    const found = filteredCollections.find((c) => c.id === selectedCollectionId);
    return found || filteredCollections[0] || collections[0];
  }, [filteredCollections, selectedCollectionId, collections]);

  // Get question count for collection
  const getCompatibleCount = (col: QuestionCollection, mode: GameMode): number => {
    const colQuestions = questions.filter((q) => col.questionIds.includes(q.id));
    const targetSet =
      colQuestions.length > 0
        ? colQuestions
        : questions.filter(
            (q) =>
              q.gradeLevel === col.gradeLevel ||
              q.subject.toLowerCase() === col.subject.toLowerCase()
          );

    if (mode === 'truth_dash') {
      return targetSet.filter(
        (q) => q.type === 'true_false' || (Array.isArray(q.options) && q.options.length === 2)
      ).length;
    } else {
      return targetSet.filter(
        (q) =>
          !q.type ||
          q.type === 'multiple_choice' ||
          (Array.isArray(q.options) && q.options.length === 4)
      ).length;
    }
  };

  // Launch handler
  const handleLaunchGame = () => {
    if (!activeCollection) return;
    try {
      localStorage.setItem('eduquest_selected_mode', selectedMode);
    } catch {}
    audioService.playButtonClick();
    onStartGame(activeCollection, selectedMode);
  };

  const handleSelectMode = (mode: GameMode) => {
    setSelectedMode(mode);
    audioService.playButtonClick();
  };

  const handleSelectInput = (mode: InputMode) => {
    onUpdateConfig({ inputMode: mode });
    audioService.playButtonClick();
  };

  const compatibleCount = activeCollection ? getCompatibleCount(activeCollection, selectedMode) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-8 pb-20">
      {/* 1. Offline & PWA Banner */}
      <PWAInstallButton variant="banner" />

      {/* 2. Kiosk Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold font-mono">
              MODE KELAS SANTAY & MUDAH
            </span>
            <span className="text-slate-400 text-xs">· Untuk Guru & Siswa SD</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Pusat Permainan Edukasi Interaktif
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Cukup selesaikan 3 langkah mudah di bawah, lalu tekan tombol Mulai Main.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
            title="Buka Pengaturan Waktu, Transparansi, & Suara"
          >
            <Settings className="w-4 h-4 text-purple-400" />
            <span>Pengaturan</span>
          </button>
          <button
            onClick={onSwitchToAdvancedView}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 text-xs font-bold cursor-pointer transition-colors border border-cyan-500/30"
            title="Ganti ke Tampilan Lengkap Guru (dengan bank soal detail & filter tingkat lanjut)"
          >
            <Layers className="w-4 h-4" />
            <span>Mode Lengkap Guru</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          LANGKAH 1: PILIH GAME
         ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-cyan-500 text-slate-950 font-black text-sm flex items-center justify-center">
            1
          </div>
          <h2 className="text-xl font-bold text-white">Langkah 1: Pilih Permainan</h2>
          <span className="text-xs text-slate-400">
            (Pilih jenis aktivitas fisik yang ingin dimainkan anak-anak)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Game 1: Truth Dash */}
          <button
            onClick={() => handleSelectMode('truth_dash')}
            className={`p-5 rounded-3xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
              selectedMode === 'truth_dash'
                ? 'bg-gradient-to-b from-purple-950/80 via-slate-900 to-slate-900 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.3)] ring-2 ring-purple-400/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-purple-500/40 hover:bg-slate-900'
            }`}
          >
            {selectedMode === 'truth_dash' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 mb-3 group-hover:scale-110 transition-transform">
                <Footprints className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Truth Dash</h3>
              <p className="text-purple-300 font-bold text-xs mt-0.5">Lari Benar atau Salah</p>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Siswa bergerak ke zona <strong>Kiri (SALAH)</strong> atau <strong>Kanan (BENAR)</strong>. Sangat seru untuk voting gerak bersama sekelas!
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between text-[11px] font-mono text-purple-300">
              <span>Format: Benar / Salah</span>
              <span>2 Opsi</span>
            </div>
          </button>

          {/* Game 2: Catch Quest */}
          <button
            onClick={() => handleSelectMode('catch_quest')}
            className={`p-5 rounded-3xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
              selectedMode === 'catch_quest'
                ? 'bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-900 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.3)] ring-2 ring-amber-400/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-amber-500/40 hover:bg-slate-900'
            }`}
          >
            {selectedMode === 'catch_quest' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 mb-3 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Catch Quest</h3>
              <p className="text-amber-300 font-bold text-xs mt-0.5">Tangkap Balon Soal</p>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Gelembung jawaban jatuh perlahan dari atas. Tangkap jawaban yang benar menggunakan tangan atau sentuh layar!
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between text-[11px] font-mono text-amber-300">
              <span>Format: Pilihan Ganda</span>
              <span>4 Pilihan</span>
            </div>
          </button>

          {/* Game 3: Shooter Quest */}
          <button
            onClick={() => handleSelectMode('shooter')}
            className={`p-5 rounded-3xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
              selectedMode === 'shooter'
                ? 'bg-gradient-to-b from-cyan-950/80 via-slate-900 to-slate-900 border-cyan-500 shadow-[0_0_25px_rgba(6,182,212,0.3)] ring-2 ring-cyan-400/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900'
            }`}
          >
            {selectedMode === 'shooter' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-3 group-hover:scale-110 transition-transform">
                <Crosshair className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Shooter Quest</h3>
              <p className="text-cyan-300 font-bold text-xs mt-0.5">Arahkan & Kunci Jawaban</p>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Arahkan pointer ke kartu jawaban di layar. Tahan posisi (dwelling) atau jepit jari untuk menembak target!
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-cyan-500/20 flex items-center justify-between text-[11px] font-mono text-cyan-300">
              <span>Format: Pilihan Ganda</span>
              <span>4 Target</span>
            </div>
          </button>
        </div>
      </section>

      {/* =========================================================================
          LANGKAH 2: PILIH MATERI SOAL
         ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-cyan-500 text-slate-950 font-black text-sm flex items-center justify-center">
              2
            </div>
            <h2 className="text-xl font-bold text-white">Langkah 2: Pilih Materi Pelajaran</h2>
          </div>
          <button
            onClick={onNavigateToMaker}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Buat Kuis Baru (AI / Manual)</span>
          </button>
        </div>

        {/* Filter Kelas yang Besar */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 px-3 font-semibold">Tingkat Kelas:</span>
          {(['all', 1, 2, 3, 4, 5, 6] as (GradeLevel | 'all')[]).map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                selectedGrade === grade
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {grade === 'all' ? 'Semua Kelas' : `Kelas ${grade} SD`}
            </button>
          ))}
        </div>

        {/* Daftar Koleksi Soal Kartu Besar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCollections.map((col) => {
            const count = getCompatibleCount(col, selectedMode);
            const isSelected = activeCollection?.id === col.id;
            const isCompatible = count > 0;

            return (
              <button
                key={col.id}
                onClick={() => setSelectedCollectionId(col.id)}
                className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-md ring-2 ring-cyan-400/30'
                    : isCompatible
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    : 'bg-slate-950/50 border-slate-800/60 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-bold text-cyan-300 font-mono">
                      Kelas {col.gradeLevel} · {col.subject}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                    )}
                  </div>
                  <h4 className="text-base font-bold text-white line-clamp-1">{col.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {col.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Tersedia:</span>
                  <span
                    className={`font-bold font-mono ${
                      count > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {count} Soal Cocok
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          LANGKAH 3: CARA BERMAIN (KONTROL)
         ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-cyan-500 text-slate-950 font-black text-sm flex items-center justify-center">
            3
          </div>
          <h2 className="text-xl font-bold text-white">Langkah 3: Pilih Cara Bermain</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Opsi A: Sentuhan / Mouse (Paling Mudah) */}
          <button
            onClick={() => handleSelectInput('touch')}
            className={`p-4 rounded-2xl border-2 text-left flex items-start gap-4 transition-all cursor-pointer ${
              currentInputMode === 'touch' || currentInputMode === 'mouse'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-400/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
              <Touchpad className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">Sentuhan Layar / Mouse</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  Paling Mudah
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Cukup sentuh layar proyektor interaktif, tablet, atau klik mouse. <strong>Tidak memerlukan kamera.</strong>
              </p>
            </div>
          </button>

          {/* Opsi B: Kamera Gerak Tubuh */}
          <button
            onClick={() => handleSelectInput('gesture')}
            className={`p-4 rounded-2xl border-2 text-left flex items-start gap-4 transition-all cursor-pointer ${
              currentInputMode === 'gesture'
                ? 'bg-purple-950/40 border-purple-500 shadow-md ring-2 ring-purple-400/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">Kamera Gerak Tubuh (AR)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                  Aktif Bergerak
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Gunakan webcam laptop. Siswa berdiri di depan kelas dan bergerak/melompat sesuai jawaban kuis.
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* =========================================================================
          TOMBOL RAKSASA: MULAI MAIN SEKARANG!
         ========================================================================= */}
      <div className="sticky bottom-4 z-40">
        <div className="p-4 rounded-3xl bg-slate-950/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Siap Dimainkan:</div>
              <div className="text-sm sm:text-base font-black text-white">
                {selectedMode === 'truth_dash'
                  ? 'Truth Dash'
                  : selectedMode === 'catch_quest'
                  ? 'Catch Quest'
                  : 'Shooter Quest'}{' '}
                — <span className="text-cyan-300">{activeCollection?.name || 'Materi'}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {compatibleCount} Soal Siap · Kontrol:{' '}
                {currentInputMode === 'touch' ? 'Layar Sentuh / Mouse' : 'Kamera Gerak Tubuh'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLaunchGame}
            disabled={compatibleCount === 0}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base tracking-wider flex items-center justify-center gap-3 shadow-xl transition-all cursor-pointer ${
              compatibleCount > 0
                ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:brightness-110 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-6 h-6 fill-current" />
            <span>MULAI MAIN SEKARANG!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
