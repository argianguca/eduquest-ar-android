import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Question,
  QuestionCollection,
  GameConfig,
  Language,
  AnswerRecord,
} from '../../types/question';
import { cameraService } from '../../services/camera';
import { catchTrackingEngine, CatchHand } from '../../services/catchTracking';
import { audioService } from '../../services/audio';
import {
  ChevronLeft,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Trophy,
  Users,
  RotateCcw,
  Zap,
  Sliders,
  Settings,
  Layers,
  Infinity as InfinityIcon,
} from 'lucide-react';

interface FallingToken {
  id: string;
  team: 'teamA' | 'teamB';
  optionIndex: number;
  text: string;
  xPercent: number; // 5 to 45 for team A, 55 to 95 for team B
  yPercent: number; // 0 to 100
  speed: number;
  caught: boolean;
}

interface CatchQuestContainerProps {
  collection: QuestionCollection;
  questions: Question[];
  config: GameConfig;
  language: Language;
  onUpdateConfig: (newConfig: Partial<GameConfig>) => void;
  onExitGame: () => void;
  onSelectAnotherQuiz: () => void;
}

export const CatchQuestContainer: React.FC<CatchQuestContainerProps> = ({
  collection,
  questions,
  config,
  language,
  onUpdateConfig,
  onExitGame,
  onSelectAnotherQuiz,
}) => {
  const isEn = language === 'en';

  // Filter multiple choice questions with 4 options
  const validQuestions = questions.filter(
    (q) => !q.type || q.type === 'multiple_choice' || (Array.isArray(q.options) && q.options.length === 4)
  );

  const activeQuestions =
    validQuestions.length > 0
      ? validQuestions.slice(0, Math.min(config.questionsPerRound, validQuestions.length))
      : questions.slice(0, Math.min(config.questionsPerRound, questions.length));

  // --- Game Session State ---
  const [currentIdx, setCurrentIdx] = useState(0);
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [teamAAnswers, setTeamAAnswers] = useState<AnswerRecord[]>([]);
  const [teamBAnswers, setTeamBAnswers] = useState<AnswerRecord[]>([]);

  // Per question responses
  const [teamAResponse, setTeamAResponse] = useState<{
    optionIndex: number;
    isCorrect: boolean;
  } | null>(null);
  const [teamBResponse, setTeamBResponse] = useState<{
    optionIndex: number;
    isCorrect: boolean;
  } | null>(null);

  const [timeRemaining, setTimeRemaining] = useState(config.timeLimitPerQuestion || 30);
  const [status, setStatus] = useState<'briefing' | 'playing' | 'answered' | 'completed'>('briefing');

  // Real-time speed & transparency & flexible time settings
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(config.catchQuestSpeed ?? 1.0);
  const [isUnlimitedTime, setIsUnlimitedTime] = useState<boolean>(config.unlimitedTime ?? false);
  const [camOpacity, setCamOpacity] = useState<number>(config.cameraOpacity ?? 0.65);
  const [cardOpacity, setCardOpacity] = useState<number>(config.overlayCardOpacity ?? 0.85);
  const [showQuickSettings, setShowQuickSettings] = useState<boolean>(false);

  // Sync with global config when changed from outside
  useEffect(() => {
    if (config.catchQuestSpeed !== undefined) setSpeedMultiplier(config.catchQuestSpeed);
    if (config.unlimitedTime !== undefined) setIsUnlimitedTime(!!config.unlimitedTime);
    if (config.cameraOpacity !== undefined) setCamOpacity(config.cameraOpacity);
    if (config.overlayCardOpacity !== undefined) setCardOpacity(config.overlayCardOpacity);
  }, [config.catchQuestSpeed, config.unlimitedTime, config.cameraOpacity, config.overlayCardOpacity]);

  // Camera & Tracking
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(!config.enableSound);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [hands, setHands] = useState<CatchHand[]>([]);
  const [fallingTokens, setFallingTokens] = useState<FallingToken[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const playfieldRef = useRef<HTMLDivElement | null>(null);

  const currentQ = activeQuestions[currentIdx];

  // Sync audio mute
  useEffect(() => {
    audioService.setMuted(isMuted);
  }, [isMuted]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // --- CAMERA & DUAL HAND TRACKING INITIALIZATION ---
  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      if (config.inputMode !== 'gesture') {
        cameraService.stopCamera();
        catchTrackingEngine.stopProcessing();
        setIsCameraActive(false);
        return;
      }

      setCameraError(null);
      const { stream, error } = await cameraService.startCamera(config.preferredCameraId);
      if (!isMounted) return;

      if (error || !stream) {
        setCameraError(error || 'Kamera tidak dapat diakses.');
        setIsCameraActive(false);
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        setIsCameraActive(true);
      }

      const initResult = await catchTrackingEngine.initialize();
      if (!isMounted) return;

      if (!initResult.success) {
        setCameraError(initResult.error);
        return;
      }

      if (videoRef.current) {
        catchTrackingEngine.startProcessing(videoRef.current, (state) => {
          if (isMounted) {
            setHands(state.hands);
          }
        });
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      catchTrackingEngine.stopProcessing();
      cameraService.stopCamera();
    };
  }, [config.inputMode, config.preferredCameraId]);

  // --- SPAWN FALLING ANSWER TOKENS ---
  const spawnTokenBatch = useCallback(() => {
    if (!currentQ) return;
    const choices = currentQ.options.slice(0, 4);

    // Spawn 4 synchronized tokens for both teams with balanced horizontal lanes
    // Team A Lanes: 8%, 18%, 28%, 38%
    // Team B Lanes: 58%, 68%, 78%, 88%
    const lanesA = [8, 18, 28, 38].sort(() => 0.5 - Math.random());
    const lanesB = lanesA.map((l) => l + 50); // Exact mirrored balance

    const newTokens: FallingToken[] = [];
    const timestamp = Date.now();

    choices.forEach((opt, idx) => {
      const speed = 0.25 + Math.random() * 0.08; // balanced falling velocity
      // Team A
      newTokens.push({
        id: `tok-A-${timestamp}-${idx}`,
        team: 'teamA',
        optionIndex: idx,
        text: opt,
        xPercent: lanesA[idx],
        yPercent: -12 - idx * 14, // Staggered spawn heights
        speed,
        caught: false,
      });

      // Team B
      newTokens.push({
        id: `tok-B-${timestamp}-${idx}`,
        team: 'teamB',
        optionIndex: idx,
        text: opt,
        xPercent: lanesB[idx],
        yPercent: -12 - idx * 14,
        speed,
        caught: false,
      });
    });

    setFallingTokens(newTokens);
  }, [currentQ]);

  // Trigger spawn when starting new question
  useEffect(() => {
    if (status === 'playing') {
      spawnTokenBatch();
    } else {
      setFallingTokens([]);
    }
  }, [status, currentIdx, spawnTokenBatch]);

  // --- SUBMIT TEAM ANSWER HELPER ---
  const handleTeamCatch = useCallback(
    (team: 'teamA' | 'teamB', optionIdx: number) => {
      if (status !== 'playing' || !currentQ) return;

      const isAnsCorrect = optionIdx === currentQ.correctAnswer;
      const points = isAnsCorrect ? config.pointPerQuestion || 100 : 0;

      if (team === 'teamA') {
        if (teamAResponse !== null) return; // Team A already answered
        setTeamAResponse({ optionIndex: optionIdx, isCorrect: isAnsCorrect });
        if (isAnsCorrect) {
          audioService.playCorrect();
          setTeamAScore((s) => s + points);
        } else {
          audioService.playWrong();
        }

        const rec: AnswerRecord = {
          questionId: currentQ.id,
          questionText: currentQ.questionText,
          options: currentQ.options,
          chosenOption: optionIdx,
          correctAnswer: currentQ.correctAnswer,
          isCorrect: isAnsCorrect,
          timeTaken: Math.max(1, config.timeLimitPerQuestion - timeRemaining),
          explanation: currentQ.explanation,
          pointsAwarded: points,
        };
        setTeamAAnswers((prev) => [...prev, rec]);
      } else {
        if (teamBResponse !== null) return; // Team B already answered
        setTeamBResponse({ optionIndex: optionIdx, isCorrect: isAnsCorrect });
        if (isAnsCorrect) {
          audioService.playCorrect();
          setTeamBScore((s) => s + points);
        } else {
          audioService.playWrong();
        }

        const rec: AnswerRecord = {
          questionId: currentQ.id,
          questionText: currentQ.questionText,
          options: currentQ.options,
          chosenOption: optionIdx,
          correctAnswer: currentQ.correctAnswer,
          isCorrect: isAnsCorrect,
          timeTaken: Math.max(1, config.timeLimitPerQuestion - timeRemaining),
          explanation: currentQ.explanation,
          pointsAwarded: points,
        };
        setTeamBAnswers((prev) => [...prev, rec]);
      }
    },
    [status, currentQ, teamAResponse, teamBResponse, config, timeRemaining]
  );

  // Check if both teams answered -> advance
  useEffect(() => {
    if (status === 'playing' && teamAResponse !== null && teamBResponse !== null) {
      setStatus('answered');
    }
  }, [teamAResponse, teamBResponse, status]);

  // --- ANIMATION LOOP: FALLING TOKENS & HAND COLLISION DETECTION ---
  useEffect(() => {
    if (status !== 'playing') {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const step = () => {
      setFallingTokens((prevTokens) => {
        const playfield = playfieldRef.current;
        const width = playfield?.clientWidth || window.innerWidth;
        const height = playfield?.clientHeight || window.innerHeight;

        const updated: FallingToken[] = [];
        let anyResetNeeded = false;

        prevTokens.forEach((token) => {
          if (token.caught) return;

          // Velocity scaled by real-time speedMultiplier
          let newY = token.yPercent + token.speed * speedMultiplier;

          // If token falls out of bottom, loop back to top for repeat catch opportunity
          if (newY > 105) {
            newY = -15;
            anyResetNeeded = true;
          }

          // Check Hand Collision
          const tokenPxX = (token.xPercent / 100) * width;
          const tokenPxY = (newY / 100) * height;
          const tokenRadius = 45; // hit radius

          let wasCaught = false;

          for (const hand of hands) {
            // Check arena team restriction
            if (hand.team !== token.team) continue;

            const dist = Math.hypot(hand.screenX - tokenPxX, hand.screenY - tokenPxY);
            if (dist < hand.radius + tokenRadius) {
              wasCaught = true;
              handleTeamCatch(token.team, token.optionIndex);
              break;
            }
          }

          if (!wasCaught) {
            updated.push({
              ...token,
              yPercent: newY,
            });
          }
        });

        return updated;
      });

      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [status, hands, handleTeamCatch, speedMultiplier]);

  // Handle Timeout
  const handleTimeOut = useCallback(() => {
    if (status !== 'playing' || !currentQ || isUnlimitedTime) return;
    audioService.playWrong();

    if (teamAResponse === null) {
      setTeamAResponse({ optionIndex: -1, isCorrect: false });
      setTeamAAnswers((prev) => [
        ...prev,
        {
          questionId: currentQ.id,
          questionText: currentQ.questionText,
          options: currentQ.options,
          chosenOption: -1,
          correctAnswer: currentQ.correctAnswer,
          isCorrect: false,
          timeTaken: config.timeLimitPerQuestion,
          explanation: currentQ.explanation,
          pointsAwarded: 0,
        },
      ]);
    }

    if (teamBResponse === null) {
      setTeamBResponse({ optionIndex: -1, isCorrect: false });
      setTeamBAnswers((prev) => [
        ...prev,
        {
          questionId: currentQ.id,
          questionText: currentQ.questionText,
          options: currentQ.options,
          chosenOption: -1,
          correctAnswer: currentQ.correctAnswer,
          isCorrect: false,
          timeTaken: config.timeLimitPerQuestion,
          explanation: currentQ.explanation,
          pointsAwarded: 0,
        },
      ]);
    }

    setStatus('answered');
  }, [status, currentQ, teamAResponse, teamBResponse, config.timeLimitPerQuestion, isUnlimitedTime]);

  // --- QUESTION TIMER ---
  useEffect(() => {
    if (status !== 'playing' || isUnlimitedTime) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleTimeOut();
          return 0;
        }
        if (prev <= 5 && prev > 1) {
          audioService.playCountdownBeep();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [status, currentIdx, isUnlimitedTime, handleTimeOut]);

  // Advance to Next Question
  const handleNextQuestion = () => {
    audioService.playButtonClick();
    if (currentIdx + 1 >= activeQuestions.length) {
      setStatus('completed');
    } else {
      setCurrentIdx((prev) => prev + 1);
      setTeamAResponse(null);
      setTeamBResponse(null);
      setTimeRemaining(config.timeLimitPerQuestion || 30);
      setStatus('playing');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // --- FINAL RESULTS VIEW ---
  if (status === 'completed') {
    const winnerText =
      teamAScore > teamBScore
        ? 'TIM A (CYAN) MENANG! 🏆'
        : teamBScore > teamAScore
        ? 'TIM B (AMBER) MENANG! 🏆'
        : 'HASIL IMBANG! KEDUA TIM HEBAT! 🤝';

    const teamACorrect = teamAAnswers.filter((a) => a.isCorrect).length;
    const teamBCorrect = teamBAnswers.filter((a) => a.isCorrect).length;

    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 md:p-8 select-none font-mono">
        <div className="max-w-3xl w-full bg-slate-900 border-2 border-cyan-500 rounded-3xl p-6 md:p-10 shadow-2xl flex flex-col gap-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-amber-300 to-emerald-400">
              HASIL BATTLE DUA TIM
            </h1>
          </div>

          <div className="text-xl md:text-2xl font-black text-amber-300">
            {winnerText}
          </div>

          {/* Scores Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Team A */}
            <div className="p-5 rounded-2xl bg-cyan-950/60 border-2 border-cyan-500 flex flex-col gap-2">
              <span className="text-sm font-bold text-cyan-300">TIM A (CYAN)</span>
              <span className="text-4xl font-black text-white">{teamAScore}</span>
              <span className="text-xs text-slate-400">
                Benar: {teamACorrect} / {activeQuestions.length} Soal
              </span>
            </div>

            {/* Team B */}
            <div className="p-5 rounded-2xl bg-amber-950/60 border-2 border-amber-500 flex flex-col gap-2">
              <span className="text-sm font-bold text-amber-300">TIM B (AMBER)</span>
              <span className="text-4xl font-black text-white">{teamBScore}</span>
              <span className="text-xs text-slate-400">
                Benar: {teamBCorrect} / {activeQuestions.length} Soal
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                setCurrentIdx(0);
                setTeamAScore(0);
                setTeamBScore(0);
                setTeamAAnswers([]);
                setTeamBAnswers([]);
                setTeamAResponse(null);
                setTeamBResponse(null);
                setTimeRemaining(config.timeLimitPerQuestion || 30);
                setStatus('playing');
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-black cursor-pointer shadow-lg hover:brightness-110"
            >
              <RotateCcw className="w-4 h-4" />
              <span>MAIN LAGI</span>
            </button>

            <button
              onClick={onExitGame}
              className="px-6 py-3 rounded-2xl bg-slate-800 text-slate-300 hover:text-white font-bold cursor-pointer"
            >
              KEMBALI KE MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={playfieldRef}
      className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white select-none"
    >
      {/* Background Webcam Mirror */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-opacity duration-300 ${
          isCameraActive && config.inputMode === 'gesture' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ opacity: camOpacity }}
      />

      {/* Cyber Grid */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/90 pointer-events-none" />

      {/* --- TOP BAR HUD --- */}
      <header
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3.5 backdrop-blur-md border-b border-cyan-500/20 font-mono transition-colors"
        style={{ backgroundColor: `rgba(2, 6, 23, ${cardOpacity})` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onExitGame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Menu Utama</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-extrabold text-amber-300">CATCH QUEST AR</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-200 hidden sm:inline-block">
              Two-Team Battle
            </span>
          </div>
        </div>

        {/* Center: Question Progress & Timer */}
        <div className="flex items-center gap-3 text-xs md:text-sm">
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-800">
            <span className="text-slate-400">Soal:</span>
            <span className="font-bold text-cyan-300">
              {currentIdx + 1} / {activeQuestions.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-bold bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-cyan-400" />
            {isUnlimitedTime ? (
              <span className="text-cyan-300 flex items-center gap-1 font-mono">
                <InfinityIcon className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-[11px] font-bold">WAKTU BEBAS</span>
              </span>
            ) : (
              <span
                className={
                  timeRemaining <= 5 ? 'text-rose-400 font-black animate-ping' : 'text-cyan-300'
                }
              >
                {timeRemaining}s
              </span>
            )}
          </div>
        </div>

        {/* Right Controls: Speed Quick Toggle, Quick Controls, Audio, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Quick Speed Toggle Button */}
          <button
            onClick={() => {
              // Cycle speeds: 0.6 -> 1.0 -> 1.5 -> 2.0 -> 0.6
              const speeds = [0.6, 1.0, 1.5, 2.0];
              const curIdx = speeds.findIndex((s) => Math.abs(s - speedMultiplier) < 0.1);
              const nextSpeed = speeds[(curIdx + 1) % speeds.length];
              setSpeedMultiplier(nextSpeed);
              onUpdateConfig({ catchQuestSpeed: nextSpeed });
            }}
            title="Klik untuk ubah kecepatan jatuh seketika"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-950/90 border border-cyan-400/60 hover:border-cyan-300 text-cyan-300 text-xs font-mono font-bold cursor-pointer transition-all shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            <span>{speedMultiplier.toFixed(1)}x</span>
            <span className="text-[10px] text-cyan-400/70 hidden md:inline">Speed</span>
          </button>

          {/* Quick Settings Popover Toggle */}
          <button
            onClick={() => setShowQuickSettings(!showQuickSettings)}
            title="Buka Pengaturan Cepat (Kecepatan, Waktu & Transparansi)"
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              showQuickSettings
                ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* --- IN-GAME QUICK SETTINGS FLOATING POPUP --- */}
      {showQuickSettings && (
        <div
          className="absolute top-16 right-4 z-40 w-80 md:w-96 rounded-2xl p-4 shadow-2xl border border-cyan-500/40 font-mono text-xs backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ backgroundColor: `rgba(2, 6, 23, 0.95)` }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Kontrol Cepat Permainan</span>
            </span>
            <button
              onClick={() => setShowQuickSettings(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded-lg bg-slate-800 cursor-pointer"
            >
              Tutup ✕
            </button>
          </div>

          <div className="flex flex-col gap-3.5 pt-3">
            {/* 1. Catch Quest Speed */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1 text-cyan-200 font-bold">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Kecepatan Jatuh:</span>
                </span>
                <span className="text-cyan-300 font-bold font-mono">{speedMultiplier.toFixed(1)}x</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: '🐢 0.6x', val: 0.6 },
                  { label: '⚡ 1.0x', val: 1.0 },
                  { label: '🚀 1.5x', val: 1.5 },
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => {
                      setSpeedMultiplier(s.val);
                      onUpdateConfig({ catchQuestSpeed: s.val });
                    }}
                    className={`py-1 rounded-lg border text-center transition-all cursor-pointer ${
                      Math.abs(speedMultiplier - s.val) < 0.1
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="0.4"
                max="2.2"
                step="0.1"
                value={speedMultiplier}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSpeedMultiplier(val);
                  onUpdateConfig({ catchQuestSpeed: val });
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* 2. Timer / Unlimited Time */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <InfinityIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Waktu Tak Terbatas:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !isUnlimitedTime;
                    setIsUnlimitedTime(nextVal);
                    onUpdateConfig({ unlimitedTime: nextVal });
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                    isUnlimitedTime
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isUnlimitedTime ? 'AKTIF ♾️' : 'NONAKTIF'}
                </button>
              </div>

              {!isUnlimitedTime && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Tambah / Kurang Waktu:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const newT = Math.max(5, timeRemaining - 5);
                        setTimeRemaining(newT);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
                    >
                      -5s
                    </button>
                    <span className="text-cyan-300 font-bold font-mono">{timeRemaining}s</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newT = timeRemaining + 5;
                        setTimeRemaining(newT);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
                    >
                      +5s
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Camera Opacity */}
            <div className="flex flex-col gap-1 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-cyan-200 font-semibold">Transparansi Kamera:</span>
                <span className="text-cyan-300 font-bold font-mono">{Math.round(camOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={camOpacity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCamOpacity(val);
                  onUpdateConfig({ cameraOpacity: val });
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* 4. Overlay Card Opacity */}
            <div className="flex flex-col gap-1 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-amber-200 font-semibold">Transparansi Kartu:</span>
                <span className="text-amber-300 font-bold font-mono">{Math.round(cardOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={cardOpacity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCardOpacity(val);
                  onUpdateConfig({ overlayCardOpacity: val });
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* --- BRIEFING POPUP --- */}
      {status === 'briefing' && (
        <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border-2 border-amber-500/70 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-5 text-center font-mono">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-950 border border-amber-400 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <Users className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">CATCH QUEST AR</h2>
              <p className="text-sm text-amber-300 mt-1">
                Pertarungan Tangkap Jawaban Dua Tim (Split Arena)!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-left bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/50">
                <span className="font-bold text-cyan-300 text-sm">🔵 TIM A (SISI KIRI)</span>
                <span className="text-slate-300">
                  Tangkap token jawaban yang melayang jatuh di arena sebelah kiri dengan tanganmu!
                </span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-amber-950/40 border border-amber-500/50">
                <span className="font-bold text-amber-300 text-sm">🟡 TIM B (SISI KANAN)</span>
                <span className="text-slate-300">
                  Tangkap token jawaban yang melayang jatuh di arena sebelah kanan dengan tanganmu!
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Setiap tim berkesempatan menangkap satu jawaban per butir soal. Tangan atau klik mouse di arena tim masing-masing akan mengunci jawaban!
            </p>

            <button
              onClick={() => {
                audioService.playButtonClick();
                setStatus('playing');
              }}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-amber-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-base shadow-lg transition-all cursor-pointer"
            >
              MULAI PERTANDINGAN
            </button>
          </div>
        </div>
      )}

      {/* --- TOP SYNCHRONIZED QUESTION BANNER --- */}
      {currentQ && (
        <div
          className="absolute top-18 left-4 right-4 z-20 max-w-4xl mx-auto backdrop-blur-md border-2 border-cyan-500/40 rounded-2xl p-4 text-center shadow-xl transition-colors"
          style={{ backgroundColor: `rgba(2, 6, 23, ${cardOpacity})` }}
        >
          <span className="text-[11px] font-mono font-bold text-cyan-300 block mb-1">
            {currentQ.subject} • Kelas {currentQ.gradeLevel} SD
          </span>
          <h2 className="text-lg md:text-2xl font-extrabold text-white leading-snug">
            {currentQ.questionText}
          </h2>
        </div>
      )}

      {/* --- SPLIT ARENA BOUNDARY LINE (CENTER) --- */}
      <div className="absolute top-36 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-cyan-500 via-slate-600 to-amber-500 z-10 opacity-70 pointer-events-none" />

      {/* --- TEAM SCORE HEADERS --- */}
      <div className="absolute top-38 left-6 z-20 flex items-center gap-2 bg-cyan-950/90 border border-cyan-400 px-3 py-1.5 rounded-xl font-mono text-xs">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
        <span className="font-bold text-cyan-200">TIM A: {teamAScore} Poin</span>
        {teamAResponse && (
          <span className="text-[10px] text-cyan-300 font-bold ml-1">
            {teamAResponse.isCorrect ? '✅ Terkunci (Benar)' : '❌ Terkunci (Salah)'}
          </span>
        )}
      </div>

      <div className="absolute top-38 right-6 z-20 flex items-center gap-2 bg-amber-950/90 border border-amber-400 px-3 py-1.5 rounded-xl font-mono text-xs">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="font-bold text-amber-200">TIM B: {teamBScore} Poin</span>
        {teamBResponse && (
          <span className="text-[10px] text-amber-300 font-bold ml-1">
            {teamBResponse.isCorrect ? '✅ Terkunci (Benar)' : '❌ Terkunci (Salah)'}
          </span>
        )}
      </div>

      {/* --- FALLING ANSWER TOKENS --- */}
      {status === 'playing' &&
        fallingTokens.map((token) => {
          const isTeamA = token.team === 'teamA';
          const teamLocked = isTeamA ? teamAResponse !== null : teamBResponse !== null;

          return (
            <div
              key={token.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (!teamLocked) {
                  handleTeamCatch(token.team, token.optionIndex);
                }
              }}
              style={{
                left: `${token.xPercent}%`,
                top: `${token.yPercent}%`,
                touchAction: 'none',
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 w-32 md:w-44 p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center font-mono cursor-pointer select-none transition-transform hover:scale-105 active:scale-95 shadow-lg ${
                isTeamA
                  ? 'bg-cyan-950/85 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'bg-amber-950/85 border-amber-400 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
              } ${teamLocked ? 'opacity-30 pointer-events-none' : ''}`}
            >
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                {['A', 'B', 'C', 'D'][token.optionIndex]}
              </span>
              <span className="text-xs md:text-sm font-bold leading-tight mt-0.5 line-clamp-2">
                {token.text}
              </span>
            </div>
          );
        })}

      {/* --- DETECTED HAND VISUALIZERS --- */}
      {config.inputMode === 'gesture' &&
        hands.map((hand) => (
          <div
            key={hand.id}
            style={{
              left: `${hand.screenX}px`,
              top: `${hand.screenY}px`,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 flex items-center justify-center pointer-events-none z-30 transition-all duration-75 ${
              hand.team === 'teamA'
                ? 'border-cyan-400 bg-cyan-400/20 shadow-[0_0_20px_rgba(6,182,212,0.7)]'
                : hand.team === 'teamB'
                ? 'border-amber-400 bg-amber-400/20 shadow-[0_0_20px_rgba(245,158,11,0.7)]'
                : 'border-slate-500 bg-slate-500/10'
            }`}
          >
            <span className="text-[10px] font-mono font-black text-white">
              {hand.team === 'teamA' ? 'TIM A' : hand.team === 'teamB' ? 'TIM B' : 'BATAS'}
            </span>
          </div>
        ))}

      {/* --- ANSWERED REVEAL & EXPLANATION MODAL --- */}
      {status === 'answered' && currentQ && (
        <div className="absolute bottom-6 left-4 right-4 z-40 max-w-4xl mx-auto bg-slate-900/95 backdrop-blur-md border-2 border-cyan-500 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 font-mono animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 text-left">
            <div className="p-3 rounded-2xl bg-cyan-950 border border-cyan-400 text-cyan-300 shrink-0">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Kunci Jawaban: <span className="text-emerald-400">{currentQ.options[currentQ.correctAnswer]}</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl font-sans">
                {currentQ.explanation}
              </p>
            </div>
          </div>

          <button
            onClick={handleNextQuestion}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-sm tracking-wider shadow-lg shrink-0 cursor-pointer"
          >
            {currentIdx + 1 >= activeQuestions.length ? 'LIHAT HASIL AKHIR' : 'SOAL BERIKUTNYA ➔'}
          </button>
        </div>
      )}
    </div>
  );
};
