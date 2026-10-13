import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameSessionState, Language, Question } from '../../types/question';
import { audioService } from '../../services/audio';
import {
  Trophy,
  Award,
  Sparkles,
  RotateCcw,
  Home,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Shield,
  Zap,
  AlertCircle,
  Check,
  BookOpen,
} from 'lucide-react';

interface GameResultsViewProps {
  sessionState: GameSessionState;
  language: Language;
  onPlayAgain: () => void;
  onPracticeMistakes?: (mistakeQuestions: Question[]) => void;
  onSelectAnotherQuiz: () => void;
  onReturnHome: () => void;
}

export const GameResultsView: React.FC<GameResultsViewProps> = ({
  sessionState,
  language,
  onPlayAgain,
  onPracticeMistakes,
  onSelectAnotherQuiz,
  onReturnHome,
}) => {
  const isEn = language === 'en';
  const total = sessionState.answersHistory.length;
  const correctCount = sessionState.answersHistory.filter((a) => a.isCorrect).length;
  const timedOutCount = sessionState.answersHistory.filter((a) => a.chosenOption === -1).length;
  const incorrectCount = sessionState.answersHistory.filter((a) => !a.isCorrect && a.chosenOption !== -1).length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // Review Filter: 'all' or 'mistakes_only'
  const [reviewFilter, setReviewFilter] = useState<'all' | 'mistakes_only'>('all');

  // Identify mistake questions from the session questions
  const mistakeQuestionIds = sessionState.answersHistory
    .filter((a) => !a.isCorrect)
    .map((a) => a.questionId);

  const mistakeQuestions = sessionState.questions.filter((q) =>
    mistakeQuestionIds.includes(q.id)
  );

  useEffect(() => {
    if (accuracy >= 60) {
      audioService.playVictoryFanfare();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#10b981', '#38bdf8', '#fbbf24', '#a855f7'],
        });
      } catch {}
    } else {
      audioService.playGameOver();
    }
  }, [accuracy]);

  // Determine Rank Title
  let rankTitle = 'Penjelajah Pemula';
  let rankColor = 'text-cyan-400';
  if (accuracy === 100) {
    rankTitle = 'MASTER EDUQUEST LEGENDARIS (SEMPURNA!)';
    rankColor = 'text-amber-300';
  } else if (accuracy >= 80) {
    rankTitle = 'KOMANDAN PENGETAHUAN UNGGUL';
    rankColor = 'text-emerald-300';
  } else if (accuracy >= 60) {
    rankTitle = 'KAPTEN SAINS & LOGIKA CERDAS';
    rankColor = 'text-cyan-300';
  } else {
    rankTitle = 'TARUNA EDUKASI TETAP SEMANGAT';
    rankColor = 'text-slate-300';
  }

  const displayedHistory = sessionState.answersHistory.filter((item) => {
    if (reviewFilter === 'mistakes_only') return !item.isCorrect;
    return true;
  });

  return (
    <div className="relative w-full h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center select-none z-30">
      <div className="w-full max-w-4xl bg-slate-950/90 backdrop-blur-xl border-2 border-cyan-500/50 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col gap-6">
        {/* Header Hero */}
        <div className="text-center flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-950/80 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.4)] mb-3">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold font-mono text-cyan-300 uppercase tracking-wider">
            {isEn ? 'MISSION REPORT COMPLETED' : 'LAPORAN AKHIR MISI EDUQUEST'}
          </h2>
          <span className="text-sm font-mono text-slate-400 mt-1">
            {sessionState.collectionName} • Kelas {sessionState.gradeLevel} SD • {sessionState.subject}
          </span>

          <div className={`mt-2 font-mono text-base md:text-lg font-bold tracking-wider ${rankColor}`}>
            ⭐ {rankTitle} ⭐
          </div>
        </div>

        {/* Extended Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Skor Total</span>
            </div>
            <span className="text-2xl font-extrabold font-mono text-amber-300">
              {sessionState.score.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Akurasi</span>
            </div>
            <span className="text-2xl font-extrabold font-mono text-emerald-300">
              {accuracy}%
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Jawaban Benar</span>
            </div>
            <span className="text-2xl font-extrabold font-mono text-emerald-400">
              {correctCount}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block">dari {total} soal</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Jawaban Salah</span>
            </div>
            <span className="text-2xl font-extrabold font-mono text-rose-400">
              {incorrectCount}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3.5 text-center col-span-2 sm:col-span-1">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Waktu Habis</span>
            </div>
            <span className="text-2xl font-extrabold font-mono text-amber-300">
              {timedOutCount}
            </span>
          </div>
        </div>

        {/* Practice Incorrect Answers Callout or 100% Perfection Banner */}
        {mistakeQuestions.length > 0 ? (
          <div className="p-4 rounded-2xl bg-cyan-950/80 border-2 border-cyan-400/60 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg font-mono">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-900 border border-cyan-500 text-cyan-300 shrink-0">
                <BookOpen className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm md:text-base font-bold text-cyan-200">
                  {isEn ? 'Practice Your Mistakes' : 'Latihan Ulang Soal yang Masih Salah'}
                </h4>
                <p className="text-xs text-slate-300">
                  {isEn
                    ? `Reinforce understanding by playing only the ${mistakeQuestions.length} missed question(s).`
                    : `Perkuat pemahaman materi dengan memainkan putaran khusus berisi ${mistakeQuestions.length} butir soal yang keliru/terlewat.`}
                </p>
              </div>
            </div>

            {onPracticeMistakes && (
              <button
                onClick={() => onPracticeMistakes(mistakeQuestions)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-xs md:text-sm tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                {isEn ? 'Practice Incorrect Answers' : 'Latihan Soal yang Salah'} ({mistakeQuestions.length})
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500/70 flex items-center justify-center gap-3 text-emerald-200 font-mono text-sm text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <span className="font-bold">
              {isEn
                ? 'Perfect Round! All questions answered correctly without any mistakes.'
                : 'Luar Biasa! Semua soal terjawab dengan benar tanpa ada kesalahan. Tidak ada soal yang perlu diulang!'}
            </span>
          </div>
        )}

        {/* Detailed Question Review Section */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <h3 className="text-base font-bold font-mono text-slate-200 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              <span>{isEn ? 'Question Review' : 'Tinjauan Detail Jawaban'}</span>
            </h3>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <button
                onClick={() => setReviewFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  reviewFilter === 'all'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Semua Soal ({total})
              </button>
              {mistakeQuestions.length > 0 && (
                <button
                  onClick={() => setReviewFilter('mistakes_only')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    reviewFilter === 'mistakes_only'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-rose-300'
                  }`}
                >
                  Salah Saja ({mistakeQuestions.length})
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
            {displayedHistory.map((item, index) => {
              const letters = ['A', 'B', 'C', 'D'];
              const isTimedOut = item.chosenOption === -1;

              return (
                <div
                  key={index}
                  className={`p-4 rounded-2xl border transition-all ${
                    item.isCorrect
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : isTimedOut
                      ? 'bg-amber-950/30 border-amber-500/40'
                      : 'bg-rose-950/30 border-rose-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-xs font-bold text-cyan-300">
                        Soal #{index + 1}
                      </span>
                      {item.isCorrect ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 font-mono">
                          <CheckCircle2 className="w-4 h-4" /> [BENAR] (+{item.pointsAwarded})
                        </span>
                      ) : isTimedOut ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-400 font-mono">
                          <Clock className="w-4 h-4" /> [WAKTU HABIS / TIDAK TERJAWAB]
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-rose-400 font-mono">
                          <XCircle className="w-4 h-4" /> [KURANG TEPAT / SALAH]
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {item.timeTaken}s
                    </span>
                  </div>

                  <p className="text-sm md:text-base font-medium text-slate-100 mb-2">
                    {item.questionText}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono mb-2">
                    <div
                      className={`p-2 rounded-lg border ${
                        item.isCorrect
                          ? 'bg-emerald-900/40 border-emerald-500 text-emerald-200'
                          : isTimedOut
                          ? 'bg-amber-900/40 border-amber-500 text-amber-200'
                          : 'bg-rose-900/40 border-rose-500 text-rose-200'
                      }`}
                    >
                      <span>Jawaban Kamu: </span>
                      <span className="font-bold">
                        {item.chosenOption >= 0
                          ? `[${letters[item.chosenOption]}] ${item.options[item.chosenOption]}`
                          : 'Waktu Habis (Tidak Menjawab)'}
                      </span>
                    </div>

                    {!item.isCorrect && (
                      <div className="p-2 rounded-lg bg-emerald-900/30 border border-emerald-500/60 text-emerald-300">
                        <span>Kunci Jawaban Benar: </span>
                        <span className="font-bold">
                          [{letters[item.correctAnswer]}] {item.options[item.correctAnswer]}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-cyan-400 font-bold font-mono">Pembahasan: </span>
                    {item.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onReturnHome}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-sm cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>{isEn ? 'Main Menu' : 'Menu Utama'}</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onSelectAnotherQuiz}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-mono text-sm cursor-pointer"
            >
              {isEn ? 'Choose Another Quiz' : 'Pilih Kuis Lain'}
            </button>
            <button
              onClick={onPlayAgain}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold font-mono text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:brightness-110 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isEn ? 'Play Again' : 'Main Lagi'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
