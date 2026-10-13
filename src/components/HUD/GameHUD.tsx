import React, { useRef, useEffect } from 'react';
import { Question, GameConfig, Language } from '../../types/question';
import {
  Shield,
  Clock,
  Sparkles,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Camera,
  CameraOff,
  Hand,
  MousePointer,
  Touchpad,
  Infinity as InfinityIcon,
} from 'lucide-react';

interface GameHUDProps {
  currentQuestion: Question;
  questionIndex: number;
  totalQuestions: number;
  score: number;
  combo: number;
  lives: number;
  timeRemaining: number;
  maxTime: number;
  selectedOption: number | null;
  hoveredOption: number | null;
  isAnswerSubmitted: boolean;
  isCorrect: boolean | null;
  isPaused: boolean;
  config: GameConfig;
  language: Language;
  quizName: string;
  isHandDetected: boolean;
  isCameraActive: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  onOptionHover: (index: number | null) => void;
  onOptionSelect: (index: number) => void;
  onNextQuestion: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onUpdateCameraOpacity: (opacity: number) => void;
  onToggleInputMode: () => void;
  onExitGame: () => void;
  optionRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  currentQuestion,
  questionIndex,
  totalQuestions,
  score,
  combo,
  lives,
  timeRemaining,
  maxTime,
  selectedOption,
  hoveredOption,
  isAnswerSubmitted,
  isCorrect,
  isPaused,
  config,
  language,
  quizName,
  isHandDetected,
  isCameraActive,
  isMuted,
  isFullscreen,
  onOptionHover,
  onOptionSelect,
  onNextQuestion,
  onTogglePause,
  onToggleMute,
  onToggleFullscreen,
  onUpdateCameraOpacity,
  onToggleInputMode,
  onExitGame,
  optionRefs,
}) => {
  const isEn = language === 'en';
  const timePercent = Math.max(0, Math.min(100, (timeRemaining / maxTime) * 100));
  const isLowTime = timeRemaining <= 5 && !isAnswerSubmitted;

  // Font size classes based on config.textSize or classroomDisplayMode
  const isDisplayMode = !!config.classroomDisplayMode;

  const questionTextClass = isDisplayMode
    ? 'text-2xl md:text-3xl lg:text-5xl font-extrabold leading-snug'
    : {
        normal: 'text-xl md:text-2xl lg:text-3xl font-semibold',
        large: 'text-2xl md:text-3xl lg:text-4xl font-bold',
        xl: 'text-3xl md:text-4xl lg:text-5xl font-extrabold',
      }[config.textSize];

  const optionTextClass = isDisplayMode
    ? 'text-xl md:text-2xl lg:text-3xl font-bold leading-normal'
    : {
        normal: 'text-lg md:text-xl lg:text-2xl font-medium',
        large: 'text-xl md:text-2xl lg:text-3xl font-semibold',
        xl: 'text-2xl md:text-3xl lg:text-4xl font-bold',
      }[config.textSize];

  const nextButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 md:p-6 lg:p-8 select-none overflow-hidden z-20">
      {/* --- TOP STATUS BAR --- */}
      <header className={`w-full flex flex-wrap items-center justify-between gap-3 backdrop-blur-md rounded-2xl px-4 py-3 shadow-[0_0_20px_rgba(6,182,212,0.15)] ${
        isDisplayMode ? 'bg-slate-950 border-2 border-cyan-400' : 'bg-slate-950/80 border border-cyan-500/30'
      }`}>
        {/* Left: App Title, Quiz Name & Subject Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <h1 className="text-sm md:text-base font-bold tracking-wider font-mono text-cyan-300 uppercase">
              EduQuest AR
            </h1>
          </div>
          {isDisplayMode && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-400 text-[10px] font-mono font-bold text-cyan-300 tracking-wider">
              DISPLAY IFP
            </span>
          )}
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="flex flex-col">
            <span className="text-xs md:text-sm font-semibold text-slate-200 line-clamp-1 max-w-[200px] md:max-w-xs">
              {quizName}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono">
              <span>Kelas {currentQuestion.gradeLevel} SD</span>
              <span>•</span>
              <span className="font-medium text-emerald-400">{currentQuestion.subject}</span>
              <span>•</span>
              <span className="text-slate-400 truncate max-w-[120px]">{currentQuestion.topic}</span>
            </div>
          </div>
        </div>

        {/* Center: Question Counter & Animated Timer */}
        <div className="flex items-center gap-4">
          {/* Question Counter */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/60 rounded-xl px-3 py-1.5 font-mono text-xs md:text-sm">
            <span className="text-slate-400">{isEn ? 'Q' : 'Soal'}</span>
            <span className="text-cyan-300 font-bold text-base md:text-lg">
              {String(questionIndex + 1).padStart(2, '0')}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{String(totalQuestions).padStart(2, '0')}</span>
          </div>

          {/* Countdown Timer with high-tech progress ring */}
          {config.unlimitedTime ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono bg-slate-900/90 border-cyan-500/40 text-cyan-300">
              <InfinityIcon className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="font-bold text-sm tracking-wider">BEBAS</span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono transition-colors ${
                isLowTime
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                  : 'bg-slate-900/90 border-cyan-500/40 text-cyan-300'
              }`}
            >
              <Clock className={`w-4 h-4 ${isLowTime ? 'animate-spin' : ''}`} />
              <span className="font-bold text-base md:text-lg tracking-wider">
                {String(timeRemaining).padStart(2, '0')}s
              </span>
              {/* Mini progress bar */}
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                <div
                  className={`h-full transition-all duration-300 ${
                    isLowTime ? 'bg-rose-500' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${timePercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Score, Combo & Shield/Lives */}
        <div className="flex items-center gap-3">
          {/* Score & Combo */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 rounded-xl px-3 py-1.5 font-mono">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col items-end">
              <span className="text-sm md:text-base font-bold text-amber-300">
                {score.toLocaleString()}
              </span>
            </div>
            {combo > 1 && (
              <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/60 rounded px-1.5 py-0.5 animate-bounce">
                {combo}x COMBO
              </span>
            )}
          </div>

          {/* Energy Shields / Lives */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/60 rounded-xl px-2.5 py-1.5">
            {Array.from({ length: config.initialLives }).map((_, idx) => {
              const active = idx < lives;
              return (
                <Shield
                  key={idx}
                  className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 ${
                    active
                      ? 'text-cyan-400 fill-cyan-400/40 drop-shadow-[0_0_6px_#06b6d4]'
                      : 'text-slate-700 fill-transparent opacity-40'
                  }`}
                />
              );
            })}
          </div>

          {/* Pause Button */}
          <button
            onClick={onTogglePause}
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400"
            title={isPaused ? (isEn ? 'Resume' : 'Lanjutkan') : (isEn ? 'Pause' : 'Jeda')}
            aria-label="Pause or Resume game"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* --- CENTER: QUESTION CARD --- */}
      <main className="w-full max-w-4xl mx-auto my-3 md:my-5 flex flex-col items-center">
        <div className="w-full relative bg-slate-950/85 backdrop-blur-lg border-2 border-cyan-500/40 rounded-3xl p-6 md:p-8 shadow-[0_0_35px_rgba(6,182,212,0.2)] text-center transition-all duration-300">
          {/* Subtle Top Accent Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/40 text-xs font-mono text-cyan-300 uppercase tracking-widest mb-3">
            <span>{currentQuestion.subject}</span>
            <span>•</span>
            <span>
              {currentQuestion.difficulty === 'easy'
                ? isEn ? 'Easy' : 'Mudah'
                : currentQuestion.difficulty === 'medium'
                ? isEn ? 'Medium' : 'Sedang'
                : isEn ? 'Challenging' : 'Menantang'}
            </span>
          </div>

          {/* Question Text */}
          <h2
            className={`text-slate-100 leading-relaxed tracking-wide drop-shadow-md ${questionTextClass}`}
          >
            {currentQuestion.questionText}
          </h2>

          {/* Optional Image */}
          {currentQuestion.imageUrl && (
            <div className="mt-4 max-h-48 overflow-hidden rounded-xl border border-cyan-500/30 inline-block">
              <img
                src={currentQuestion.imageUrl}
                alt="Pertanyaan"
                className="max-h-48 object-contain rounded-xl"
              />
            </div>
          )}
        </div>
      </main>

      {/* --- BOTTOM: 4 ANSWER CHOICES GRID --- */}
      <footer className="w-full max-w-5xl mx-auto flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {currentQuestion.options.map((optionText, idx) => {
            const isHovered = hoveredOption === idx;
            const isSelected = selectedOption === idx;
            const isCorrectOption = idx === currentQuestion.correctAnswer;
            const letters = ['A', 'B', 'C', 'D'];

            // Status Styling
            let containerStyle =
              'bg-slate-950/80 border-slate-700/80 text-slate-200 hover:border-cyan-400 hover:bg-slate-900/90';
            let badgeStyle = 'bg-slate-900 border-slate-700 text-slate-400';

            if (isHovered && !isAnswerSubmitted) {
              containerStyle =
                'bg-cyan-950/90 border-cyan-400 text-cyan-100 shadow-[0_0_25px_rgba(6,182,212,0.4)] scale-[1.01]';
              badgeStyle = 'bg-cyan-500 text-black font-bold border-cyan-300';
            }

            if (isAnswerSubmitted) {
              if (isCorrectOption) {
                containerStyle =
                  'bg-emerald-950/95 border-emerald-400 text-emerald-100 shadow-[0_0_30px_rgba(52,211,153,0.5)] scale-[1.02] ring-2 ring-emerald-400';
                badgeStyle = 'bg-emerald-500 text-black font-bold border-emerald-300';
              } else if (isSelected && !isCorrectOption) {
                containerStyle =
                  'bg-rose-950/90 border-rose-500 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.4)] opacity-80';
                badgeStyle = 'bg-rose-500 text-white font-bold border-rose-300';
              } else {
                containerStyle = 'bg-slate-950/50 border-slate-800 text-slate-500 opacity-50';
                badgeStyle = 'bg-slate-900 border-slate-800 text-slate-600';
              }
            }

            return (
              <button
                key={idx}
                ref={(el) => {
                  optionRefs.current[idx] = el;
                }}
                disabled={isAnswerSubmitted}
                onMouseEnter={() => !isAnswerSubmitted && onOptionHover(idx)}
                onMouseLeave={() => !isAnswerSubmitted && onOptionHover(null)}
                onPointerDown={() => {
                  if (!isAnswerSubmitted) {
                    onOptionHover(idx);
                    onOptionSelect(idx);
                  }
                }}
                className={`relative flex items-center gap-3.5 p-4 md:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer min-h-[75px] md:min-h-[85px] text-left active:scale-[0.98] select-none touch-manipulation ${containerStyle}`}
                aria-label={`Opsi ${letters[idx]}: ${optionText}`}
              >
                {/* Option Letter Indicator */}
                <div
                  className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl border font-mono font-bold text-base md:text-lg shrink-0 transition-colors ${badgeStyle}`}
                >
                  {letters[idx]}
                </div>

                {/* Option Text */}
                <span className={`grow leading-snug drop-shadow-sm ${optionTextClass}`}>
                  {optionText}
                </span>

                {/* Status Icon when answered */}
                {isAnswerSubmitted && isCorrectOption && (
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0 animate-bounce" />
                )}
                {isAnswerSubmitted && isSelected && !isCorrectOption && (
                  <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* --- ANSWER EXPLANATION / FEEDBACK DRAWER --- */}
        {isAnswerSubmitted && (
          <div className="w-full mt-2 bg-slate-950/95 backdrop-blur-xl border-2 border-cyan-500/60 rounded-2xl p-4 md:p-5 shadow-[0_0_35px_rgba(6,182,212,0.3)] animate-in fade-in slide-in-from-bottom duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3 grow">
                <div
                  className={`p-2.5 rounded-xl border shrink-0 ${
                    isCorrect
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-rose-950 border-rose-500 text-rose-300'
                  }`}
                >
                  {isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm md:text-base font-bold font-mono uppercase tracking-wider ${
                        isCorrect ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isCorrect
                        ? isEn ? 'CORRECT! EXCELLENT JOB!' : 'BENAR! KERJA BAGUS!'
                        : isEn ? 'LESS ACCURATE' : 'KURANG TEPAT'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      (Jawaban benar: {['A', 'B', 'C', 'D'][currentQuestion.correctAnswer]})
                    </span>
                  </div>
                  <p className="text-slate-200 text-sm md:text-base leading-relaxed mt-1">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>

              {/* Next Question Trigger Button (can be clicked or pinched) */}
              <button
                ref={nextButtonRef}
                onClick={onNextQuestion}
                className="w-full md:w-auto shrink-0 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold font-mono tracking-wider text-sm md:text-base shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isEn ? 'NEXT MISSION' : 'LANJUTKAN MISI'}</span>
                <span className="text-xs opacity-75 font-sans">(Cubit / Tekan)</span>
              </button>
            </div>
          </div>
        )}

        {/* --- FLOATING BOTTOM UTILITY CONTROLS --- */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400 font-mono">
          {/* Status Indicators */}
          <div className="flex items-center gap-3">
            {/* Input Mode Badge */}
            <button
              onClick={onToggleInputMode}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Klik untuk beralih mode kontrol"
            >
              {config.inputMode === 'gesture' && <Hand className="w-3.5 h-3.5 text-cyan-400" />}
              {config.inputMode === 'touch' && <Touchpad className="w-3.5 h-3.5 text-emerald-400" />}
              {config.inputMode === 'mouse' && <MousePointer className="w-3.5 h-3.5 text-amber-400" />}
              <span className="capitalize">
                {config.inputMode === 'gesture'
                  ? isEn ? 'Gesture (AR)' : 'Gerakan Tangan'
                  : config.inputMode === 'touch'
                  ? isEn ? 'Touch (IFP)' : 'Layar Sentuh'
                  : 'Mouse'}
              </span>
            </button>

            {/* Hand Tracking Status (in gesture mode) */}
            {config.inputMode === 'gesture' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isHandDetected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 animate-ping'
                  }`}
                />
                <span>
                  {isHandDetected
                    ? isEn ? 'Hand Tracked' : 'Tangan Terdeteksi'
                    : isEn ? 'Show Hand to Camera' : 'Arahkan Tangan ke Kamera'}
                </span>
              </div>
            )}
          </div>

          {/* Quick Sliders & Toggles */}
          <div className="flex items-center gap-2">
            {/* Camera Opacity Slider (Hidden in Classroom Display Mode to keep interface clean) */}
            {config.inputMode === 'gesture' && isCameraActive && !isDisplayMode && (
              <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-1">
                <Camera className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] text-slate-400">Transparansi</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.cameraOpacity}
                  onChange={(e) => onUpdateCameraOpacity(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-[10px] text-cyan-300 w-6">
                  {Math.round(config.cameraOpacity * 100)}%
                </span>
              </div>
            )}

            {/* Audio Toggle */}
            <button
              onClick={onToggleMute}
              className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition-colors"
              title={isMuted ? 'Aktifkan Suara' : 'Bisukan Suara'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition-colors"
              title="Layar Penuh"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Exit to Menu */}
            <button
              onClick={onExitGame}
              className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-700/60 hover:border-rose-500 text-rose-300 hover:text-rose-200 transition-colors cursor-pointer"
            >
              {isEn ? 'Exit' : 'Keluar'}
            </button>
          </div>
        </div>
      </footer>

      {/* --- PAUSE OVERLAY --- */}
      {isPaused && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-40 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-cyan-500 rounded-3xl p-6 text-center shadow-[0_0_40px_rgba(6,182,212,0.3)]">
            <h3 className="text-2xl font-bold font-mono text-cyan-300 mb-2">
              {isEn ? 'GAME PAUSED' : 'PERMAINAN DIJEDA'}
            </h3>
            <p className="text-slate-300 text-sm mb-6">
              {isEn
                ? 'Take a breath! You can resume whenever you are ready.'
                : 'Istirahat sejenak! Lanjutkan kapan pun Anda sudah siap.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onTogglePause}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold font-mono tracking-wider shadow-lg hover:brightness-110 cursor-pointer"
              >
                {isEn ? 'RESUME GAME' : 'LANJUTKAN PERMAINAN'}
              </button>
              <button
                onClick={onExitGame}
                className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-sm cursor-pointer"
              >
                {isEn ? 'RETURN TO MAIN MENU' : 'KEMBALI KE MENU UTAMA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
