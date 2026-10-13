import React, { useState, useEffect } from 'react';
import {
  QuestionCollection,
  Question,
  GradeLevel,
  GameConfig,
  Language,
  ClassroomPresetId,
  CLASSROOM_PRESETS,
} from '../../types/question';
import { audioService } from '../../services/audio';
import {
  Play,
  Sparkles,
  Hand,
  Touchpad,
  MousePointer,
  Clock,
  Shield,
  Layers,
  Sliders,
  BookOpen,
  Filter,
  Zap,
  CheckCircle2,
  Tv,
  ArrowRight,
} from 'lucide-react';

import { GameMode } from '../../types/question';
import {
  Crosshair,
  Footprints,
  Users,
} from 'lucide-react';

interface MainMenuProps {
  collections: QuestionCollection[];
  questions: Question[];
  config: GameConfig;
  language: Language;
  onStartGame: (collection: QuestionCollection, mode?: GameMode) => void;
  onUpdateConfig: (newConfig: Partial<GameConfig>) => void;
  onNavigateToBank: () => void;
  onNavigateToMaker: () => void;
  onSwitchToKioskView?: () => void;
  onOpenCameraTest?: () => void;
  onOpenTouchTest?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  collections,
  questions,
  config,
  language,
  onStartGame,
  onUpdateConfig,
  onNavigateToBank,
  onNavigateToMaker,
  onSwitchToKioskView,
  onOpenCameraTest,
  onOpenTouchTest,
}) => {
  const isEn = language === 'en';
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // --- Active Game Mode State ---
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>(() => {
    try {
      const saved = localStorage.getItem('eduquest_selected_mode') as GameMode;
      if (saved && ['shooter', 'truth_dash', 'catch_quest'].includes(saved)) return saved;
    } catch {}
    return 'shooter';
  });

  // Incompatibility Warning Modal state
  const [incompatibleNotice, setIncompatibleNotice] = useState<{
    collection: QuestionCollection;
    targetMode: GameMode;
    message: string;
  } | null>(null);

  // Helper to count compatible questions for a given mode
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
      // shooter and catch_quest use multiple_choice (4 options or untyped)
      return targetSet.filter(
        (q) =>
          !q.type ||
          q.type === 'multiple_choice' ||
          (Array.isArray(q.options) && q.options.length === 4)
      ).length;
    }
  };

  // --- Quick Play State ---
  const [quickCollectionId, setQuickCollectionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('eduquest_last_quick_col_id');
      if (saved && collections.some((c) => c.id === saved)) return saved;
    } catch {}
    return collections[0]?.id || '';
  });

  const [quickPresetId, setQuickPresetId] = useState<ClassroomPresetId>(() => {
    try {
      const saved = localStorage.getItem('eduquest_last_preset') as ClassroomPresetId;
      if (saved && CLASSROOM_PRESETS[saved]) return saved;
    } catch {}
    return config.activePreset || 'challenge';
  });

  // Mode Selection handler with smart collection recommendation
  const handleSelectMode = (mode: GameMode) => {
    setSelectedGameMode(mode);
    try {
      localStorage.setItem('eduquest_selected_mode', mode);
    } catch {}
    audioService.playButtonClick();

    // Auto switch quickCollection if current one has 0 compatible questions
    if (activeQuickCollection && getCompatibleCount(activeQuickCollection, mode) === 0) {
      const compatibleCol = collections.find((c) => getCompatibleCount(c, mode) > 0);
      if (compatibleCol) {
        setQuickCollectionId(compatibleCol.id);
      }
    }
  };

  // Safe Launch with compatibility check
  const handleLaunchMode = (collection: QuestionCollection, mode: GameMode) => {
    const compatibleCount = getCompatibleCount(collection, mode);
    if (compatibleCount === 0) {
      audioService.playIncorrect();
      if (mode === 'truth_dash') {
        setIncompatibleNotice({
          collection,
          targetMode: mode,
          message: `Paket "${collection.name}" hanya berisi soal Pilihan Ganda (4 Opsi). Mode Truth Dash membutuhkan pernyataan bertipe Benar/Salah (True/False).`,
        });
      } else {
        setIncompatibleNotice({
          collection,
          targetMode: mode,
          message: `Paket "${collection.name}" hanya berisi pernyataan Benar/Salah. Mode ${
            mode === 'shooter' ? 'Shooter Quest' : 'Catch Quest'
          } membutuhkan soal Pilihan Ganda (4 Opsi).`,
        });
      }
      return;
    }

    audioService.playButtonClick();
    onStartGame(collection, mode);
  };

  // Sync if collections change
  useEffect(() => {
    if (!quickCollectionId && collections.length > 0) {
      setQuickCollectionId(collections[0].id);
    }
  }, [collections, quickCollectionId]);

  // Selected quick collection object
  const activeQuickCollection =
    collections.find((c) => c.id === quickCollectionId) || collections[0] || null;

  // Launch Quick Play
  const handleLaunchQuickPlay = () => {
    if (!activeQuickCollection) return;

    // Apply chosen preset config
    const preset = CLASSROOM_PRESETS[quickPresetId];
    onUpdateConfig({
      ...preset.config,
      activePreset: quickPresetId,
    });

    handleLaunchMode(activeQuickCollection, selectedGameMode);
  };

  // Filter collections for grid
  const filteredCollections = collections.filter((c) => {
    if (selectedGrade !== 'all' && c.gradeLevel !== selectedGrade) return false;
    if (selectedSubject !== 'all' && c.subject !== selectedSubject) return false;
    return true;
  });

  const availableSubjects = Array.from(new Set(collections.map((c) => c.subject))).sort();

  return (
    <div className="w-full flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto select-none">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/80 border-2 border-cyan-500/40 rounded-3xl p-6 md:p-10 shadow-[0_0_40px_rgba(6,182,212,0.2)]">
        {/* Futuristic background decorations */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-500/50 text-xs font-mono text-cyan-300 w-fit">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>UNIVERSAL GESTURE-CONTROLLED AR GAME</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black font-mono tracking-tight text-white leading-tight">
            EduQuest <span className="text-cyan-400">AR</span>
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            {isEn
              ? 'Universal educational game for Grades 1–6 SD across all subjects. Mirror camera feed, point with index finger, and pinch thumb with index finger to answer questions!'
              : 'Game edukasi interaktif untuk SD Kelas 1–6 semua mata pelajaran. Lihat dirimu di kamera, arahkan jari telunjuk ke jawaban, dan cubit jempol dengan telunjuk untuk memilih!'}
          </p>

          {/* Quick Control Mode & Classroom Display Mode Switcher */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <span className="text-xs font-mono text-slate-400">Mode Kontrol:</span>
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-700 rounded-xl p-1 font-mono text-xs">
              <button
                onClick={() => {
                  onUpdateConfig({ inputMode: 'gesture' });
                  audioService.playButtonClick();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  config.inputMode === 'gesture'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Hand className="w-3.5 h-3.5" />
                <span>Gestur AR (Kamera)</span>
              </button>

              <button
                onClick={() => {
                  onUpdateConfig({ inputMode: 'touch' });
                  audioService.playButtonClick();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  config.inputMode === 'touch'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Touchpad className="w-3.5 h-3.5" />
                <span>Layar Sentuh (IFP)</span>
              </button>

              <button
                onClick={() => {
                  onUpdateConfig({ inputMode: 'mouse' });
                  audioService.playButtonClick();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  config.inputMode === 'mouse'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span>Mouse / Pointer</span>
              </button>
            </div>

            {/* Classroom Display Mode quick toggle */}
            <button
              onClick={() => {
                onUpdateConfig({
                  classroomDisplayMode: !config.classroomDisplayMode,
                  textSize: !config.classroomDisplayMode ? 'xl' : 'normal',
                });
                audioService.playButtonClick();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs transition-all cursor-pointer ${
                config.classroomDisplayMode
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-400'
                  : 'bg-slate-950/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Mode Tampilan Kelas: Huruf Ekstra Besar & Kontras Tinggi untuk Proyektor / Layar Flat Panel"
            >
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {config.classroomDisplayMode ? 'Mode Layar Kelas: AKTIF' : 'Mode Layar Kelas: Nonaktif'}
              </span>
            </button>

            {onSwitchToKioskView && (
              <button
                onClick={onSwitchToKioskView}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 font-mono text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Beralih ke antarmuka 3 langkah sederhana yang ramah guru & siswa"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mode Kiosk Kelas (Sederhana)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- FEATURE 1: 3 GAME SELECTION MODE CARDS --- */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div>
            <h2 className="text-xl md:text-2xl font-black font-mono tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>PILIH MODE PERMAINAN EDUQUEST AR</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-400 font-mono">
              Pilih satu dari 3 mode pembelajaran interaktif kelas dengan teknologi sensor kamera terintegrasi
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-500">Mode Terpilih:</span>
            <span
              className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                selectedGameMode === 'shooter'
                  ? 'bg-cyan-950 border border-cyan-400 text-cyan-300'
                  : selectedGameMode === 'truth_dash'
                  ? 'bg-emerald-950 border border-emerald-400 text-emerald-300'
                  : 'bg-amber-950 border border-amber-400 text-amber-300'
              }`}
            >
              {selectedGameMode === 'shooter'
                ? '🎯 Shooter Quest'
                : selectedGameMode === 'truth_dash'
                ? '⚡ Truth Dash'
                : '🏆 Catch Quest'}
            </span>
          </div>
        </div>

        {/* 3 Visually Distinct Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. SHOOTER QUEST */}
          <div
            onClick={() => handleSelectMode('shooter')}
            className={`relative rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between gap-4 cursor-pointer group ${
              selectedGameMode === 'shooter'
                ? 'bg-gradient-to-b from-cyan-950/80 via-slate-900 to-slate-950 border-2 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.35)] ring-2 ring-cyan-400/40'
                : 'bg-slate-900/70 border-2 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/90'
            }`}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div
                  className={`p-3 rounded-2xl border ${
                    selectedGameMode === 'shooter'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-cyan-400'
                  }`}
                >
                  <Crosshair className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 font-bold">
                    Pilihan Ganda
                  </span>
                  {selectedGameMode === 'shooter' && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 font-bold mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>AKTIF</span>
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black font-mono text-white group-hover:text-cyan-300 transition-colors">
                  Shooter Quest
                </h3>
                <p className="text-xs font-mono text-cyan-400 font-semibold mt-0.5">
                  Aim, Pinch, Answer.
                </p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Arahkan ujung jari telunjuk ke jawaban pilihan dan lakukan cubitan (pinch) jempol-telunjuk untuk menembak jawaban benar.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  1 Pemain
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  Gestur Cubit Jari (Pinch)
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  Layar Sentuh / Mouse
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectMode('shooter');
              }}
              className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                selectedGameMode === 'shooter'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {selectedGameMode === 'shooter' ? '✓ MODE SEDANG DIPILIH' : 'PILIH SHOOTER QUEST'}
            </button>
          </div>

          {/* 2. TRUTH DASH */}
          <div
            onClick={() => handleSelectMode('truth_dash')}
            className={`relative rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between gap-4 cursor-pointer group ${
              selectedGameMode === 'truth_dash'
                ? 'bg-gradient-to-b from-emerald-950/80 via-slate-900 to-slate-950 border-2 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/40'
                : 'bg-slate-900/70 border-2 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/90'
            }`}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div
                  className={`p-3 rounded-2xl border ${
                    selectedGameMode === 'truth_dash'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-emerald-400'
                  }`}
                >
                  <Footprints className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-bold">
                    Benar / Salah (True/False)
                  </span>
                  {selectedGameMode === 'truth_dash' && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>AKTIF</span>
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black font-mono text-white group-hover:text-emerald-300 transition-colors">
                  Truth Dash
                </h3>
                <p className="text-xs font-mono text-emerald-400 font-semibold mt-0.5">
                  Move Left or Right.
                </p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Bergerak aktif melangkah ke kiri (SALAH) atau kanan (BENAR) di depan kamera untuk memvalidasi pernyataan materi secara fisik.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  Gerak Aktif Tubuh
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  MediaPipe Pose
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  Zona Layar Sentuh
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectMode('truth_dash');
              }}
              className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                selectedGameMode === 'truth_dash'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {selectedGameMode === 'truth_dash' ? '✓ MODE SEDANG DIPILIH' : 'PILIH TRUTH DASH'}
            </button>
          </div>

          {/* 3. CATCH QUEST */}
          <div
            onClick={() => handleSelectMode('catch_quest')}
            className={`relative rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between gap-4 cursor-pointer group ${
              selectedGameMode === 'catch_quest'
                ? 'bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-950 border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/40'
                : 'bg-slate-900/70 border-2 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/90'
            }`}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div
                  className={`p-3 rounded-2xl border ${
                    selectedGameMode === 'catch_quest'
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-amber-400'
                  }`}
                >
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-[10px] font-mono text-amber-300 font-bold">
                    Pilihan Ganda Tim
                  </span>
                  {selectedGameMode === 'catch_quest' && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400 font-bold mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>AKTIF</span>
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black font-mono text-white group-hover:text-amber-300 transition-colors">
                  Catch Quest
                </h3>
                <p className="text-xs font-mono text-amber-400 font-semibold mt-0.5">
                  Two-Team Catch Battle.
                </p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Pertarungan tangkap jawaban antara Tim Merah dan Tim Biru! Buka telapak tangan untuk menangkap token jawaban yang melayang jatuh.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  Duel 2 Tim (A & B)
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  Deteksi Dua Tangan
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  Jalur Terpisah
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectMode('catch_quest');
              }}
              className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                selectedGameMode === 'catch_quest'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {selectedGameMode === 'catch_quest' ? '✓ MODE SEDANG DIPILIH' : 'PILIH CATCH QUEST'}
            </button>
          </div>
        </div>
      </section>

      {/* --- FEATURE 2: PROMINENT QUICK PLAY PANEL --- */}
      {collections.length > 0 && activeQuickCollection && (
        <section
          className={`border-2 rounded-3xl p-6 md:p-8 flex flex-col gap-5 transition-all duration-300 ${
            selectedGameMode === 'shooter'
              ? 'bg-gradient-to-br from-slate-900/95 via-slate-950 to-cyan-950/40 border-cyan-500/60 shadow-[0_0_35px_rgba(6,182,212,0.25)]'
              : selectedGameMode === 'truth_dash'
              ? 'bg-gradient-to-br from-slate-900/95 via-slate-950 to-emerald-950/40 border-emerald-500/60 shadow-[0_0_35px_rgba(16,185,129,0.25)]'
              : 'bg-gradient-to-br from-slate-900/95 via-slate-950 to-amber-950/40 border-amber-500/60 shadow-[0_0_35px_rgba(245,158,11,0.25)]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl border ${
                  selectedGameMode === 'shooter'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    : selectedGameMode === 'truth_dash'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-amber-950 border-amber-500 text-amber-300'
                }`}
              >
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2
                  className={`text-lg md:text-xl font-bold font-mono ${
                    selectedGameMode === 'shooter'
                      ? 'text-cyan-300'
                      : selectedGameMode === 'truth_dash'
                      ? 'text-emerald-300'
                      : 'text-amber-300'
                  }`}
                >
                  MAIN CEPAT KELAS •{' '}
                  {selectedGameMode === 'shooter'
                    ? 'SHOOTER QUEST'
                    : selectedGameMode === 'truth_dash'
                    ? 'TRUTH DASH'
                    : 'CATCH QUEST'}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Mulai bermain instan dengan preset aturan kelas tanpa perlu konfigurasi berulang
                </p>
              </div>
            </div>

            {/* Active Collection & Mode Tag */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400">Paket Terpilih:</span>
              <span
                className={`px-2.5 py-1 rounded-lg border font-bold ${
                  selectedGameMode === 'shooter'
                    ? 'bg-cyan-950 border-cyan-500/40 text-cyan-300'
                    : selectedGameMode === 'truth_dash'
                    ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950 border-amber-500/40 text-amber-300'
                }`}
              >
                {activeQuickCollection.name}
              </span>
            </div>
          </div>

          {/* Compatibility alert banner if collection has 0 compatible questions for mode */}
          {(() => {
            const count = getCompatibleCount(activeQuickCollection, selectedGameMode);
            if (count === 0) {
              const compatibleCol = collections.find((c) => getCompatibleCount(c, selectedGameMode) > 0);
              return (
                <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/70 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">⚠️</span>
                    <span>
                      Paket terpilih belum memiliki butir soal yang kompatibel untuk{' '}
                      <strong>{selectedGameMode.replace('_', ' ').toUpperCase()}</strong>.
                    </span>
                  </div>
                  {compatibleCol && (
                    <button
                      onClick={() => setQuickCollectionId(compatibleCol.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shrink-0 cursor-pointer"
                    >
                      Ganti ke Paket Kompatibel: {compatibleCol.name}
                    </button>
                  )}
                </div>
              );
            }
            return (
              <div className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Tersedia <strong className="text-emerald-300">{count} Butir Soal Kompatibel</strong> dalam paket ini untuk mode {selectedGameMode.replace('_', ' ')}.
                </span>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Left: Collection Selector */}
            <div className="lg:col-span-4 flex flex-col gap-2">
              <label className="text-xs font-mono text-slate-300 font-bold">
                1. Pilih Paket Kuis Soal:
              </label>
              <select
                value={quickCollectionId}
                onChange={(e) => setQuickCollectionId(e.target.value)}
                className="w-full bg-slate-950 border-2 border-slate-700 hover:border-cyan-400 rounded-2xl p-3 text-slate-100 font-mono text-xs md:text-sm focus:outline-none transition-colors"
              >
                {collections.map((c) => {
                  const compCount = getCompatibleCount(c, selectedGameMode);
                  return (
                    <option key={c.id} value={c.id}>
                      Kelas {c.gradeLevel} SD • {c.subject} — {c.name} ({compCount} Soal Kompatibel)
                    </option>
                  );
                })}
              </select>

              {/* Detail snippet */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-[11px] text-slate-400">
                <div className="flex justify-between mb-1">
                  <span>Jenjang: <strong className="text-slate-200">Kelas {activeQuickCollection.gradeLevel} SD</strong></span>
                  <span>Mapel: <strong className="text-emerald-300">{activeQuickCollection.subject}</strong></span>
                </div>
                <div>Topik: <span className="text-cyan-300">{activeQuickCollection.topic}</span></div>
              </div>
            </div>

            {/* Center: 3 Classroom Presets */}
            <div className="lg:col-span-5 flex flex-col gap-2">
              <label className="text-xs font-mono text-slate-300 font-bold">
                2. Pilih Preset Aturan Kelas:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['practice', 'challenge', 'quick_quiz'] as ClassroomPresetId[]).map((presetId) => {
                  const p = CLASSROOM_PRESETS[presetId];
                  const isSelected = quickPresetId === presetId;
                  return (
                    <button
                      key={presetId}
                      onClick={() => {
                        setQuickPresetId(presetId);
                        audioService.playButtonClick();
                      }}
                      className={`flex flex-col p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                        isSelected
                          ? selectedGameMode === 'shooter'
                            ? 'bg-cyan-950/90 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400'
                            : selectedGameMode === 'truth_dash'
                            ? 'bg-emerald-950/90 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400'
                            : 'bg-amber-950/90 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)] ring-1 ring-amber-400'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span
                          className={`font-mono text-xs font-bold ${
                            isSelected
                              ? selectedGameMode === 'shooter'
                                ? 'text-cyan-300'
                                : selectedGameMode === 'truth_dash'
                                ? 'text-emerald-300'
                                : 'text-amber-300'
                              : 'text-slate-300'
                          }`}
                        >
                          {p.name}
                        </span>
                        {isSelected && (
                          <CheckCircle2
                            className={`w-3.5 h-3.5 shrink-0 ${
                              selectedGameMode === 'shooter'
                                ? 'text-cyan-400'
                                : selectedGameMode === 'truth_dash'
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                            }`}
                          />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight">
                        {p.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Big Launch Button */}
            <div className="lg:col-span-3 flex flex-col justify-center">
              <button
                onClick={handleLaunchQuickPlay}
                className={`w-full py-5 rounded-2xl font-black font-mono text-base md:text-lg tracking-wider text-slate-950 shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                  selectedGameMode === 'shooter'
                    ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_25px_rgba(6,182,212,0.45)]'
                    : selectedGameMode === 'truth_dash'
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_25px_rgba(16,185,129,0.45)]'
                    : 'bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400 shadow-[0_0_25px_rgba(245,158,11,0.45)]'
                }`}
              >
                {selectedGameMode === 'shooter' ? (
                  <Crosshair className="w-5 h-5 fill-current" />
                ) : selectedGameMode === 'truth_dash' ? (
                  <Footprints className="w-5 h-5 fill-current" />
                ) : (
                  <Users className="w-5 h-5 fill-current" />
                )}
                <span>
                  {selectedGameMode === 'shooter'
                    ? 'MULAI SHOOTER'
                    : selectedGameMode === 'truth_dash'
                    ? 'MULAI TRUTH DASH'
                    : 'MULAI CATCH QUEST'}
                </span>
              </button>
              <span className="text-[10px] text-slate-500 font-mono text-center mt-1.5">
                Mode aktif: {selectedGameMode.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Filter and Subject Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-bold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filter Kelas SD:</span>
          </span>
          <button
            onClick={() => setSelectedGrade('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              selectedGrade === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Semua Kelas
          </button>
          {[1, 2, 3, 4, 5, 6].map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g as any)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                selectedGrade === g
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Kelas {g} SD
            </button>
          ))}
        </div>

        {/* Subject filter dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Mapel:</span>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
          >
            <option value="all">Semua Mata Pelajaran</option>
            {availableSubjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Question Collections Grid with Mode Badges and Direct Launchers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCollections.map((col) => {
          const colQuestions = questions.filter((q) => col.questionIds.includes(q.id));
          const count = colQuestions.length || col.questionIds.length;
          const mcCount = getCompatibleCount(col, 'shooter');
          const tfCount = getCompatibleCount(col, 'truth_dash');

          return (
            <div
              key={col.id}
              className="bg-slate-900/80 border-2 border-slate-800 hover:border-cyan-400/70 rounded-3xl p-5 md:p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.25)] flex flex-col justify-between gap-4 group"
            >
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md bg-cyan-950 border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-300">
                    Kelas {col.gradeLevel} SD
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-950 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-300">
                    {col.subject}
                  </span>
                </div>

                <h3 className="text-lg md:text-xl font-bold text-slate-100 group-hover:text-cyan-300 transition-colors leading-snug">
                  {col.name}
                </h3>

                <p className="text-xs md:text-sm text-slate-400 line-clamp-2">
                  {col.description || `Misi materi ${col.topic}`}
                </p>

                {/* Compatibility Mode Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {mcCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                      🎯 Shooter ({mcCount})
                    </span>
                  )}
                  {tfCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 font-bold">
                      ⚡ Truth Dash ({tfCount})
                    </span>
                  )}
                  {mcCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/30 text-[10px] font-mono text-amber-300">
                      🏆 Catch ({mcCount})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-500 pt-2 border-t border-slate-800">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{count} Butir Soal</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{config.unlimitedTime ? 'Waktu Bebas ♾️' : `${config.timeLimitPerQuestion}s / Soal`}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons: Main Launch button + Alternate Mode shortcuts */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => handleLaunchMode(col, selectedGameMode)}
                  className={`w-full py-3 rounded-2xl text-slate-950 font-bold font-mono text-sm tracking-wider shadow-md flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-95 transition-all cursor-pointer ${
                    selectedGameMode === 'shooter'
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                      : selectedGameMode === 'truth_dash'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    MAIN:{' '}
                    {selectedGameMode === 'shooter'
                      ? 'SHOOTER QUEST'
                      : selectedGameMode === 'truth_dash'
                      ? 'TRUTH DASH'
                      : 'CATCH QUEST'}
                  </span>
                </button>

                {/* Direct alternate mode launchers */}
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                  <button
                    onClick={() => handleLaunchMode(col, 'shooter')}
                    title="Luncurkan Shooter Quest"
                    className="py-1.5 px-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-400 text-slate-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>Shooter</span>
                  </button>
                  <button
                    onClick={() => handleLaunchMode(col, 'truth_dash')}
                    title="Luncurkan Truth Dash (Benar/Salah)"
                    className="py-1.5 px-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-400 text-slate-400 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Footprints className="w-3 h-3" />
                    <span>Truth Dash</span>
                  </button>
                  <button
                    onClick={() => handleLaunchMode(col, 'catch_quest')}
                    title="Luncurkan Catch Quest (2 Tim)"
                    className="py-1.5 px-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-400 text-slate-400 hover:text-amber-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Users className="w-3 h-3" />
                    <span>Catch</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Teacher Quick-Action Footer Card */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-cyan-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold font-mono text-slate-200">
              Ingin Menyesuaikan Soal atau Membuat Kuis Baru?
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Bapak/Ibu Guru dapat menambah, menyunting, atau membuat soal otomatis dengan Gemini AI kapan saja.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onNavigateToBank}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs font-bold cursor-pointer"
          >
            Buka Bank Soal
          </button>
          <button
            onClick={onNavigateToMaker}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-mono text-xs font-bold shadow-md cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-950" />
            <span>Buat Soal dengan AI</span>
          </button>
        </div>
      </div>

      {/* Incompatible Notice Modal */}
      {incompatibleNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-6 md:p-8 max-w-lg w-full flex flex-col gap-5 font-mono shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-950 border border-amber-500 text-amber-300">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  FORMAT SOAL BELUM KOMPATIBEL
                </h3>
                <span className="text-xs text-amber-400 font-semibold uppercase">
                  Mode Target: {incompatibleNotice.targetMode.replace('_', ' ')}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {incompatibleNotice.message}
            </p>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 flex flex-col gap-2">
              <strong className="text-cyan-300">Solusi / Rekomendasi:</strong>
              {incompatibleNotice.targetMode === 'truth_dash' ? (
                <>
                  <span>
                    • Pilih paket <strong>"Truth Dash SD - Pengetahuan Umum & IPAS"</strong> yang sudah berisi pernyataan Benar/Salah siap main.
                  </span>
                  <span>
                    • Buka <strong>Pembuat Soal</strong> untuk menyusun pernyataan Benar/Salah baru untuk materi ini.
                  </span>
                </>
              ) : (
                <>
                  <span>
                    • Pilih paket soal Pilihan Ganda standar (seperti "IPAS Kelas 4 - Tumbuhan Sumber Kehidupan").
                  </span>
                  <span>
                    • Atau tambahkan opsi pilihan ganda A, B, C, D di Bank Soal.
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIncompatibleNotice(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
              {incompatibleNotice.targetMode === 'truth_dash' && (
                <button
                  onClick={() => {
                    const tfCol = collections.find((c) => getCompatibleCount(c, 'truth_dash') > 0);
                    if (tfCol) {
                      setIncompatibleNotice(null);
                      handleLaunchMode(tfCol, 'truth_dash');
                    } else {
                      setIncompatibleNotice(null);
                      onNavigateToMaker();
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md cursor-pointer"
                >
                  Mainkan Paket Benar/Salah
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
