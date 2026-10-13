import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Question,
  QuestionCollection,
  GameConfig,
  Language,
  AnswerRecord,
} from '../../types/question';
import { cameraService } from '../../services/camera';
import {
  poseTrackingEngine,
  PoseTrackingState,
  BodyZone,
  DetectedStudent,
} from '../../services/poseTracking';
import { audioService } from '../../services/audio';
import { GameResultsView } from './GameResultsView';
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
  Award,
  Footprints,
  Users,
  Timer,
  Lock,
  Plus,
  Minus,
  SlidersHorizontal,
  Infinity as InfinityIcon,
  Camera,
  Layers,
} from 'lucide-react';

interface TruthDashContainerProps {
  collection: QuestionCollection;
  questions: Question[];
  config: GameConfig;
  language: Language;
  onUpdateConfig: (newConfig: Partial<GameConfig>) => void;
  onExitGame: () => void;
  onSelectAnotherQuiz: () => void;
}

export const TruthDashContainer: React.FC<TruthDashContainerProps> = ({
  collection,
  questions,
  config,
  language,
  onUpdateConfig,
  onExitGame,
  onSelectAnotherQuiz,
}) => {
  const isEn = language === 'en';

  // Filter true_false questions, or adapt multiple_choice if needed
  const validQuestions = questions.filter(
    (q) => q.type === 'true_false' || (Array.isArray(q.options) && q.options.length === 2)
  );

  const activeQuestions =
    validQuestions.length > 0
      ? validQuestions.slice(0, Math.min(config.questionsPerRound, validQuestions.length))
      : questions.slice(0, Math.min(config.questionsPerRound, questions.length));

  // --- Dwell Time & Mode Configuration ---
  const currentDwellSec = config.truthDashDwellDuration || 1.5;
  const currentMode = config.truthDashMode || 'consensus';

  // --- Game Session State ---
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(config.timeLimitPerQuestion || 25);
  const [status, setStatus] = useState<'briefing' | 'playing' | 'answered' | 'completed'>('briefing');
  const [selectedZone, setSelectedZone] = useState<BodyZone | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [answersHistory, setAnswersHistory] = useState<AnswerRecord[]>([]);

  // Camera & Multi-pose Tracking state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(!config.enableSound);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQuickSettings, setShowQuickSettings] = useState(false);

  // Real-time flexible time and visual transparency
  const [isUnlimitedTime, setIsUnlimitedTime] = useState<boolean>(config.unlimitedTime ?? false);
  const [camOpacity, setCamOpacity] = useState<number>(config.cameraOpacity ?? 0.65);
  const [cardOpacity, setCardOpacity] = useState<number>(config.overlayCardOpacity ?? 0.85);

  // Sync with global config
  useEffect(() => {
    if (config.unlimitedTime !== undefined) setIsUnlimitedTime(!!config.unlimitedTime);
    if (config.cameraOpacity !== undefined) setCamOpacity(config.cameraOpacity);
    if (config.overlayCardOpacity !== undefined) setCardOpacity(config.overlayCardOpacity);
  }, [config.unlimitedTime, config.cameraOpacity, config.overlayCardOpacity]);

  const [poseState, setPoseState] = useState<PoseTrackingState>({
    isReady: false,
    isBodyDetected: false,
    bodyCenterX: 0.5,
    bodyCenterY: 0.5,
    zone: 'neutral',
    dwellProgress: 0,
    confidence: 0,
    error: null,
    students: [],
    studentCount: 0,
    leftCount: 0,
    rightCount: 0,
    neutralCount: 0,
    consensusZone: null,
    consensusRatio: 0,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const hasTriggeredCurrentQ = useRef<boolean>(false);

  // Sync dwell duration with engine
  useEffect(() => {
    poseTrackingEngine.setDwellDuration(currentDwellSec);
  }, [currentDwellSec]);

  // Sync mute state
  useEffect(() => {
    audioService.setMuted(isMuted);
  }, [isMuted]);

  // Fullscreen listener
  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // --- START / STOP CAMERA & POSE TRACKING ---
  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      if (config.inputMode !== 'gesture') {
        cameraService.stopCamera();
        poseTrackingEngine.stopProcessing();
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

      const initResult = await poseTrackingEngine.initialize();
      if (!isMounted) return;

      if (!initResult.success) {
        setCameraError(initResult.error);
        return;
      }

      poseTrackingEngine.setDwellDuration(currentDwellSec);

      if (videoRef.current) {
        poseTrackingEngine.startProcessing(videoRef.current, (newPose) => {
          if (isMounted) {
            setPoseState(newPose);
          }
        });
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      poseTrackingEngine.stopProcessing();
      cameraService.stopCamera();
    };
  }, [config.inputMode, config.preferredCameraId]);

  const currentQ = activeQuestions[currentIdx];

  // Quick adjust dwell duration (fleksibel tanpa batas 3s)
  const adjustDwellTime = (delta: number) => {
    const nextVal = Math.round((currentDwellSec + delta) * 10) / 10;
    const clamped = Math.max(0.5, Math.min(20.0, nextVal));
    onUpdateConfig({ truthDashDwellDuration: clamped });
    poseTrackingEngine.setDwellDuration(clamped);
    audioService.playButtonClick();
  };

  const setDwellPreset = (sec: number) => {
    const clamped = Math.max(0.5, Math.min(20.0, sec));
    onUpdateConfig({ truthDashDwellDuration: clamped });
    poseTrackingEngine.setDwellDuration(clamped);
    audioService.playButtonClick();
  };

  // Submit Answer
  const submitAnswer = useCallback(
    (chosenZone: 'left' | 'right') => {
      if (status !== 'playing' || hasTriggeredCurrentQ.current || !currentQ) return;
      hasTriggeredCurrentQ.current = true;
      setSelectedZone(chosenZone);

      // In Truth Dash:
      // Left = SALAH (Option 1)
      // Right = BENAR (Option 0)
      const chosenOptionIdx = chosenZone === 'right' ? 0 : 1;
      const isAnsCorrect = chosenOptionIdx === currentQ.correctAnswer;

      const timeTaken = Math.max(1, config.timeLimitPerQuestion - timeRemaining);
      let points = 0;

      if (isAnsCorrect) {
        audioService.playCorrect();
        const base = config.pointPerQuestion || 100;
        const comboBonus = config.comboMultiplierBonus ? combo * 20 : 0;
        const speedBonus = Math.max(0, Math.round(timeRemaining * 4));
        // Bonus for multi-student consensus participation
        const participationBonus = poseState.studentCount > 1 ? poseState.studentCount * 15 : 0;
        points = base + comboBonus + speedBonus + participationBonus;

        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setMaxCombo((m) => Math.max(m, nextCombo));
        setScore((s) => s + points);
        setIsCorrect(true);
      } else {
        audioService.playWrong();
        setCombo(0);
        setIsCorrect(false);
      }

      const record: AnswerRecord = {
        questionId: currentQ.id,
        questionText: currentQ.questionText,
        options: currentQ.options,
        chosenOption: chosenOptionIdx,
        correctAnswer: currentQ.correctAnswer,
        isCorrect: isAnsCorrect,
        timeTaken,
        explanation: currentQ.explanation,
        pointsAwarded: points,
      };

      setAnswersHistory((prev) => [...prev, record]);
      setStatus('answered');
    },
    [status, currentQ, timeRemaining, config, combo, poseState.studentCount]
  );

  // Handle timeout
  const handleTimeOut = useCallback(() => {
    if (status !== 'playing' || hasTriggeredCurrentQ.current) return;

    // In consensus mode, if time runs out but majority has picked a zone, lock that zone!
    if (poseState.studentCount > 0 && poseState.consensusZone && poseState.consensusZone !== 'neutral') {
      submitAnswer(poseState.consensusZone as 'left' | 'right');
      return;
    }

    hasTriggeredCurrentQ.current = true;
    audioService.playWrong();

    const record: AnswerRecord = {
      questionId: currentQ?.id || `q-${currentIdx}`,
      questionText: currentQ?.questionText || '',
      options: currentQ?.options || ['BENAR', 'SALAH'],
      chosenOption: -1, // Unanswered
      correctAnswer: currentQ?.correctAnswer || 0,
      isCorrect: false,
      timeTaken: config.timeLimitPerQuestion,
      explanation: currentQ?.explanation || '',
      pointsAwarded: 0,
    };

    setAnswersHistory((prev) => [...prev, record]);
    setCombo(0);
    setIsCorrect(false);
    setStatus('answered');
  }, [status, currentQ, currentIdx, config.timeLimitPerQuestion, poseState.studentCount, poseState.consensusZone, submitAnswer]);

  // --- TIMER EFFECT ---
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
        if (prev <= 6 && prev > 1) {
          audioService.playCountdownBeep();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [status, currentIdx, isUnlimitedTime, handleTimeOut]);

  // --- MULTI-STUDENT / DELIBERATE BODY MOVEMENT DWELL TRIGGER ---
  useEffect(() => {
    if (status !== 'playing' || hasTriggeredCurrentQ.current) return;
    if (config.inputMode !== 'gesture') return;

    // Check if dwell progress completed for active zone / consensus zone
    if (poseState.dwellProgress >= 1) {
      if (poseState.zone === 'left') {
        submitAnswer('left'); // SALAH
      } else if (poseState.zone === 'right') {
        submitAnswer('right'); // BENAR
      }
    }
  }, [poseState.dwellProgress, poseState.zone, status, config.inputMode, submitAnswer]);

  // Advance to next question
  const handleNextQuestion = () => {
    audioService.playButtonClick();
    if (currentIdx + 1 >= activeQuestions.length) {
      setStatus('completed');
    } else {
      setCurrentIdx((prev) => prev + 1);
      setSelectedZone(null);
      setIsCorrect(null);
      setTimeRemaining(config.timeLimitPerQuestion || 25);
      hasTriggeredCurrentQ.current = false;
      poseTrackingEngine.resetDwell();
      setStatus('playing');
    }
  };

  // Re-practice incorrect
  const handlePracticeIncorrect = (mistakes: Question[] | AnswerRecord[]) => {
    const failedIds = new Set(mistakes.map((m: any) => m.id || m.questionId));
    const failedQuestions = activeQuestions.filter((q) => failedIds.has(q.id));
    if (failedQuestions.length > 0) {
      setCurrentIdx(0);
      setScore(0);
      setCombo(0);
      setAnswersHistory([]);
      setSelectedZone(null);
      setIsCorrect(null);
      setTimeRemaining(config.timeLimitPerQuestion || 25);
      hasTriggeredCurrentQ.current = false;
      setStatus('playing');
    }
  };

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Separate students by zone
  const leftStudents = poseState.students.filter((s) => s.zone === 'left');
  const rightStudents = poseState.students.filter((s) => s.zone === 'right');
  const neutralStudents = poseState.students.filter((s) => s.zone === 'neutral');

  // If completed, show unified results
  if (status === 'completed') {
    const sessionMock: any = {
      status: 'completed',
      currentQuestionIndex: activeQuestions.length - 1,
      score,
      combo,
      maxCombo,
      lives: 99,
      selectedAnswer: null,
      isAnswerSubmitted: true,
      isCorrect: true,
      timeRemaining: 0,
      isPaused: false,
      questions: activeQuestions,
      answersHistory,
      collectionName: collection.name,
      subject: collection.subject,
      gradeLevel: collection.gradeLevel,
      topic: collection.topic,
    };

    return (
      <GameResultsView
        sessionState={sessionMock}
        language={language}
        onPlayAgain={() => {
          setCurrentIdx(0);
          setScore(0);
          setCombo(0);
          setAnswersHistory([]);
          setSelectedZone(null);
          setIsCorrect(null);
          setTimeRemaining(config.timeLimitPerQuestion || 25);
          hasTriggeredCurrentQ.current = false;
          setStatus('playing');
        }}
        onPracticeMistakes={handlePracticeIncorrect}
        onSelectAnotherQuiz={onSelectAnotherQuiz}
        onReturnHome={onExitGame}
      />
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white select-none">
      {/* Background Webcam Video */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-opacity duration-300 ${
          isCameraActive ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ opacity: camOpacity }}
      />

      {/* Cyber Subtle Grid & Gradient Overlay (High camera clarity like Catch Quest) */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950/80 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-30" />

      {/* --- MULTI-STUDENT AR RETICLES & LOCK-ON GAUGES --- */}
      {isCameraActive && config.inputMode === 'gesture' && poseState.students.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
          {poseState.students.map((student) => {
            const isStudentInLeft = student.zone === 'left';
            const isStudentInRight = student.zone === 'right';
            const ringColor = isStudentInLeft
              ? '#f43f5e'
              : isStudentInRight
              ? '#10b981'
              : student.color;

            return (
              <div
                key={student.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-75"
                style={{
                  left: `${Math.round(student.smoothedX * 100)}%`,
                  top: `${Math.round(student.smoothedY * 100)}%`,
                }}
              >
                {/* Reticle with circular dwell ring */}
                <div className="relative flex items-center justify-center">
                  <svg className="w-14 h-14 -rotate-90 filter drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                    {/* Background ring */}
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      className="stroke-slate-900/80"
                      strokeWidth="3.5"
                      fill="rgba(15, 23, 42, 0.75)"
                    />
                    {/* Dwell progress fill */}
                    {student.dwellProgress > 0 && (
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        stroke={ringColor}
                        strokeWidth="3.5"
                        fill="none"
                        strokeDasharray={138.2}
                        strokeDashoffset={138.2 * (1 - student.dwellProgress)}
                        strokeLinecap="round"
                        className="transition-all duration-75"
                      />
                    )}
                  </svg>

                  {/* Student Center Badge */}
                  <div
                    className="absolute w-8 h-8 rounded-full flex items-center justify-center font-black text-xs font-mono shadow-lg border border-white/20 transition-transform"
                    style={{
                      backgroundColor: student.color,
                      color: '#030712',
                      transform: student.isLocked ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    {student.isLocked ? <Lock className="w-4 h-4 text-slate-950" /> : student.id}
                  </div>
                </div>

                {/* Floating Student Label & Zone Status */}
                <div
                  className="mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/95 border font-mono text-[10px] shadow-xl whitespace-nowrap"
                  style={{ borderColor: student.color }}
                >
                  <span className="font-extrabold" style={{ color: student.color }}>
                    {student.label}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span
                    className={
                      isStudentInLeft
                        ? 'text-rose-300 font-black'
                        : isStudentInRight
                        ? 'text-emerald-300 font-black'
                        : 'text-slate-400'
                    }
                  >
                    {isStudentInLeft
                      ? `SALAH (${Math.round(student.dwellProgress * 100)}%)`
                      : isStudentInRight
                      ? `BENAR (${Math.round(student.dwellProgress * 100)}%)`
                      : 'NETRAL'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- TOP BAR HUD --- */}
      <header
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-2.5 md:px-6 backdrop-blur-md border-b border-cyan-500/20 font-mono gap-2 transition-colors"
        style={{ backgroundColor: `rgba(2, 6, 23, ${cardOpacity})` }}
      >
        <div className="flex items-center gap-2 md:gap-3">
          {/* Circular Score Badge (Matching Classroom Screen Reference) */}
          <div className="relative flex items-center justify-center w-11 h-11 md:w-13 md:h-13 shrink-0">
            <svg className="w-11 h-11 md:w-13 md:h-13 -rotate-90">
              <circle
                cx="22"
                cy="22"
                r="18"
                className="stroke-slate-800 md:hidden"
                strokeWidth="3"
                fill="rgba(15, 23, 42, 0.9)"
              />
              <circle
                cx="26"
                cy="26"
                r="21"
                className="stroke-slate-800 hidden md:block"
                strokeWidth="3.5"
                fill="rgba(15, 23, 42, 0.9)"
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                stroke="#10b981"
                strokeWidth="3"
                fill="none"
                strokeDasharray="113"
                strokeDashoffset={combo > 0 ? `${Math.max(10, 113 - combo * 18)}` : '0'}
                strokeLinecap="round"
                className="md:hidden transition-all duration-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]"
              />
              <circle
                cx="26"
                cy="26"
                r="21"
                stroke="#10b981"
                strokeWidth="3.5"
                fill="none"
                strokeDasharray="131"
                strokeDashoffset={combo > 0 ? `${Math.max(12, 131 - combo * 20)}` : '0'}
                strokeLinecap="round"
                className="hidden md:block transition-all duration-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs md:text-sm font-black font-mono text-emerald-300 leading-none">
                {score}
              </span>
              <span className="text-[7px] md:text-[8px] font-mono text-slate-400 leading-none mt-0.5">
                SKOR
              </span>
            </div>
          </div>

          <button
            onClick={onExitGame}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>

          {/* Multi-Student Live Badge */}
          {poseState.studentCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-500/50 text-[11px] text-purple-200">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-bold">{poseState.studentCount} Murid Aktif</span>
            </div>
          )}

          {combo > 1 && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-orange-950 border border-orange-500/60 text-orange-300 font-bold animate-bounce text-xs">
              <span>{combo}x KOMBO</span>
            </div>
          )}
        </div>

        {/* Center: Question index & Timer Badge */}
        <div className="flex items-center gap-2 font-mono text-xs md:text-sm">
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-800">
            <span className="text-slate-400">Soal:</span>
            <span className="font-bold text-cyan-300">
              {currentIdx + 1} / {activeQuestions.length}
            </span>
          </div>

          {currentQ && (
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              {isUnlimitedTime ? (
                <span className="text-cyan-300 font-bold flex items-center gap-1">
                  <InfinityIcon className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>BEBAS</span>
                </span>
              ) : (
                <span
                  className={
                    timeRemaining <= 5
                      ? 'text-rose-400 font-black animate-ping'
                      : 'text-cyan-300 font-bold'
                  }
                >
                  {timeRemaining}s
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Quick Dwell Controls & System buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Dwell Time Control HUD Button */}
          <button
            onClick={() => setShowQuickSettings(!showQuickSettings)}
            className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              showQuickSettings
                ? 'bg-purple-900/80 border-purple-400 text-purple-100 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                : 'bg-slate-900/90 border-slate-700 hover:border-purple-400 text-purple-300'
            }`}
            title="Pengaturan Cepat Durasi Stay"
          >
            <Timer className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-bold">Stay: {currentDwellSec.toFixed(1)}s</span>
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
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

      {/* --- QUICK CONTROL HUD POPOVER (On-The-Fly Settings) --- */}
      {showQuickSettings && (
        <div
          className="absolute top-16 right-4 md:right-8 z-40 w-84 md:w-96 rounded-2xl p-4 shadow-2xl font-mono text-xs text-white backdrop-blur-xl border border-purple-500/50 animate-in fade-in slide-in-from-top-2"
          style={{ backgroundColor: `rgba(2, 6, 23, 0.95)` }}
        >
          <div className="flex items-center justify-between border-b border-purple-500/30 pb-2 mb-3">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-purple-400" />
              <span>Kontrol Cepat Permainan</span>
            </span>
            <button
              onClick={() => setShowQuickSettings(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded-lg bg-slate-800 cursor-pointer"
            >
              Tutup ✕
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {/* 1. Dwell Duration Controls */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-semibold">Durasi Stay di Zona:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustDwellTime(-0.1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white cursor-pointer font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-black text-purple-300 w-12 text-center">
                    {currentDwellSec.toFixed(1)}s
                  </span>
                  <button
                    onClick={() => adjustDwellTime(0.1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white cursor-pointer font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Presets for Dwell (tanpa batas 3s) */}
              <div className="grid grid-cols-5 gap-1 text-center">
                {[1.0, 1.5, 2.5, 4.0, 6.0].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setDwellPreset(sec)}
                    className={`py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                      Math.abs(currentDwellSec - sec) < 0.05
                        ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={currentDwellSec}
                onChange={(e) => setDwellPreset(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer h-1.5 mt-1"
                title="Geser untuk mengatur durasi stay kustom"
              />
            </div>

            {/* 2. Timer & Unlimited Time Controls */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
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
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>Batas Waktu per Soal:</span>
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

            {/* 3. Camera Transparency Slider */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1">
              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1 text-cyan-200 font-semibold">
                  <Camera className="w-3 h-3 text-cyan-400" />
                  <span>Transparansi Kamera:</span>
                </span>
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

            {/* 4. Overlay Card Transparency Slider */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1">
              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1 text-amber-200 font-semibold">
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span>Transparansi Kartu:</span>
                </span>
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

            {/* 5. Multi-Student Participation Mode Switch */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-slate-400 text-[11px] mb-1.5 block">Mode Partisipasi:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateConfig({ truthDashMode: 'consensus' })}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                    currentMode === 'consensus'
                      ? 'bg-purple-950 border-purple-400 text-purple-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  👥 Konsensus
                </button>
                <button
                  onClick={() => onUpdateConfig({ truthDashMode: 'all_active' })}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                    currentMode === 'all_active'
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  🏃 Semua Aktif
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- BRIEFING MODAL IF JUST STARTED --- */}
      {status === 'briefing' && (
        <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border-2 border-purple-500/70 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-5 text-center font-mono">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-950 border border-purple-400 flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <Footprints className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">TRUTH DASH AR MULTI-MURID</h2>
              <p className="text-sm text-purple-300 mt-1">
                Tantangan Gerak Fisik Bersama di Depan Layar Kelas!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-left bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-rose-950/40 border border-rose-500/50">
                <span className="font-bold text-rose-300 text-sm">⬅️ SISI KIRI (SALAH)</span>
                <span className="text-slate-300">
                  Langkah ke sisi kiri kamera jika pernyataan menurut kalian SALAH.
                </span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50">
                <span className="font-bold text-emerald-300 text-sm">➡️ SISI KANAN (BENAR)</span>
                <span className="text-slate-300">
                  Langkah ke sisi kanan kamera jika pernyataan menurut kalian BENAR.
                </span>
              </div>
            </div>

            <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-2xl text-xs text-purple-200 text-left flex flex-col gap-1.5">
              <div className="font-bold flex items-center gap-1.5 text-purple-300">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Mendukung Banyak Murid Sekaligus (Simultan)</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Kamera melacak hingga 6 murid serentak (P1, P2, P3, ...). Tahan posisi selama{' '}
                <strong className="text-white">{currentDwellSec.toFixed(1)} detik</strong> di dalam
                zona untuk mengunci suara kelas! Durasi stay bisa diubah kapan saja.
              </p>
            </div>

            {/* Quick Dwell & Control Mode select */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Durasi Stay:</span>
                <div className="flex items-center gap-1">
                  {[1.0, 1.5, 2.5, 4.0, 6.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => setDwellPreset(s)}
                      className={`px-2 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                        Math.abs(currentDwellSec - s) < 0.05
                          ? 'bg-purple-600 border-purple-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Mode:</span>
                <button
                  onClick={() => onUpdateConfig({ inputMode: 'gesture' })}
                  className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${
                    config.inputMode === 'gesture'
                      ? 'bg-purple-500 text-black border-purple-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  AR Pose
                </button>
                <button
                  onClick={() => onUpdateConfig({ inputMode: 'touch' })}
                  className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${
                    config.inputMode === 'touch'
                      ? 'bg-cyan-500 text-black border-cyan-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Sentuh
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                audioService.playButtonClick();
                setStatus('playing');
              }}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 hover:brightness-110 text-slate-950 font-black text-base shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all cursor-pointer"
            >
              MULAI MAIN SEKARANG
            </button>
          </div>
        </div>
      )}

      {/* --- PLAY AREA: CLEAN SPLIT-ARENA (LIKE CATCH QUEST & CLASSROOM SCREEN) --- */}
      {/* Top Floating Question Card (Minimal, Non-Intrusive) */}
      {currentQ && (
        <div className="absolute top-18 md:top-20 left-4 right-4 z-25 pointer-events-none flex justify-center">
          <div className="w-full max-w-3xl bg-slate-950/80 backdrop-blur-md border border-cyan-500/35 rounded-2xl px-5 py-3 shadow-2xl flex flex-col items-center gap-1.5 text-center pointer-events-auto">
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold">
                {currentQ.subject} • Kelas {currentQ.gradeLevel} SD
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-300">Pilih Sisi Kiri (SALAH) atau Kanan (BENAR)</span>
            </div>

            <h2 className="text-lg md:text-2xl font-black text-white leading-snug tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              "{currentQ.questionText}"
            </h2>
          </div>
        </div>
      )}

      {/* --- SPLIT INTERACTIVE ARENA (LEFT: SALAH / RED, RIGHT: BENAR / GREEN) --- */}
      <div className="absolute inset-0 pt-20 pb-20 pointer-events-auto flex z-10">
        {/* LEFT HALF: SALAH (A) */}
        <div
          role="button"
          tabIndex={0}
          onPointerDown={() => {
            if (status === 'playing') submitAnswer('left');
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && status === 'playing') submitAnswer('left');
          }}
          aria-label="Pilih SALAH (Sisi Kiri)"
          className={`relative flex-1 h-full flex flex-col justify-between p-4 md:p-6 transition-all duration-200 cursor-pointer select-none group border-r border-rose-500/25 touch-manipulation ${
            selectedZone === 'left'
              ? 'bg-rose-950/30 ring-4 ring-rose-500/80 shadow-[inset_0_0_80px_rgba(244,63,94,0.35)]'
              : (poseState.zone === 'left' || leftStudents.length > 0) &&
                config.inputMode === 'gesture' &&
                status === 'playing'
              ? 'bg-rose-950/20 shadow-[inset_0_0_50px_rgba(244,63,94,0.2)]'
              : 'bg-rose-950/10 hover:bg-rose-950/20'
          }`}
        >
          {/* Corner Reticles (Catch Quest Aesthetic) */}
          <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-rose-400/60 pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-rose-400/60 pointer-events-none" />

          {/* Dwell Fill Progress on Left Half */}
          {poseState.zone === 'left' && status === 'playing' && config.inputMode === 'gesture' && (
            <div
              className="absolute bottom-0 left-0 right-0 bg-rose-500/25 pointer-events-none transition-all duration-75"
              style={{ height: `${Math.round(poseState.dwellProgress * 100)}%` }}
            />
          )}

          {/* Top Left Floating Chips */}
          <div className="relative z-10 flex items-center gap-2 pointer-events-none">
            <div className="flex items-center gap-2 bg-slate-950/75 backdrop-blur-sm border border-rose-500/40 px-3 py-1.5 rounded-full font-mono text-[11px] text-rose-300 shadow-md">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span className="font-bold">{leftStudents.length} Murid</span>
              {leftStudents.length > 0 && (
                <div className="flex -space-x-1 ml-1">
                  {leftStudents.map((s) => (
                    <span
                      key={s.id}
                      className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center font-mono border border-slate-900"
                      style={{ backgroundColor: s.color, color: '#090d16' }}
                    >
                      {s.id}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subtle Watermarked Background Label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15 group-hover:opacity-25 transition-opacity">
            <span className="text-6xl md:text-8xl font-black font-mono text-rose-400 select-none tracking-widest drop-shadow-[0_0_20px_rgba(244,63,94,0.4)]">
              SALAH
            </span>
          </div>

          <div className="relative z-10" />
        </div>

        {/* CENTER VERTICAL LASER DIVIDER & NEUTRAL ZONE */}
        <div className="absolute left-1/2 top-20 bottom-20 -translate-x-1/2 w-0.5 bg-gradient-to-b from-cyan-400/80 via-purple-400/60 to-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.8)] pointer-events-none z-20 flex flex-col items-center justify-center">
          {/* Neutral Dead Zone Marker */}
          <div className="px-3 py-1 rounded-full bg-slate-950/90 border border-slate-700/80 backdrop-blur-md text-[10px] font-mono text-slate-400 whitespace-nowrap shadow-xl flex items-center gap-1.5 -translate-y-8">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>ZONA TENGAH</span>
            {neutralStudents.length > 0 && (
              <span className="text-cyan-300 font-bold">({neutralStudents.length})</span>
            )}
          </div>
        </div>

        {/* RIGHT HALF: BENAR (B) */}
        <div
          role="button"
          tabIndex={0}
          onPointerDown={() => {
            if (status === 'playing') submitAnswer('right');
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && status === 'playing') submitAnswer('right');
          }}
          aria-label="Pilih BENAR (Sisi Kanan)"
          className={`relative flex-1 h-full flex flex-col justify-between p-4 md:p-6 transition-all duration-200 cursor-pointer select-none group border-l border-emerald-500/25 touch-manipulation ${
            selectedZone === 'right'
              ? 'bg-emerald-950/30 ring-4 ring-emerald-500/80 shadow-[inset_0_0_80px_rgba(16,185,129,0.35)]'
              : (poseState.zone === 'right' || rightStudents.length > 0) &&
                config.inputMode === 'gesture' &&
                status === 'playing'
              ? 'bg-emerald-950/20 shadow-[inset_0_0_50px_rgba(16,185,129,0.2)]'
              : 'bg-emerald-950/10 hover:bg-emerald-950/20'
          }`}
        >
          {/* Corner Reticles */}
          <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-emerald-400/60 pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-emerald-400/60 pointer-events-none" />

          {/* Dwell Fill Progress on Right Half */}
          {poseState.zone === 'right' && status === 'playing' && config.inputMode === 'gesture' && (
            <div
              className="absolute bottom-0 left-0 right-0 bg-emerald-500/25 pointer-events-none transition-all duration-75"
              style={{ height: `${Math.round(poseState.dwellProgress * 100)}%` }}
            />
          )}

          {/* Top Right Floating Chips */}
          <div className="relative z-10 flex items-center justify-end gap-2 pointer-events-none">
            <div className="flex items-center gap-2 bg-slate-950/75 backdrop-blur-sm border border-emerald-500/40 px-3 py-1.5 rounded-full font-mono text-[11px] text-emerald-300 shadow-md">
              {rightStudents.length > 0 && (
                <div className="flex -space-x-1 mr-1">
                  {rightStudents.map((s) => (
                    <span
                      key={s.id}
                      className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center font-mono border border-slate-900"
                      style={{ backgroundColor: s.color, color: '#090d16' }}
                    >
                      {s.id}
                    </span>
                  ))}
                </div>
              )}
              <span className="font-bold">{rightStudents.length} Murid</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
          </div>

          {/* Subtle Watermarked Background Label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15 group-hover:opacity-25 transition-opacity">
            <span className="text-6xl md:text-8xl font-black font-mono text-emerald-400 select-none tracking-widest drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              BENAR
            </span>
          </div>

          <div className="relative z-10" />
        </div>
      </div>

      {/* --- CENTER FLOATING STATUS PILL (DWELL LOCKING OR RESULT BANNER) --- */}
      {status === 'playing' && poseState.dwellProgress > 0 && config.inputMode === 'gesture' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none animate-in fade-in zoom-in-95">
          <div className="px-5 py-2.5 rounded-2xl bg-slate-950/90 border-2 border-cyan-400/80 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center gap-3 font-mono text-sm">
            <Lock className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="text-white font-bold">
              Mengunci Pilihan: {poseState.zone === 'left' ? 'SALAH (A)' : 'BENAR (B)'} (
              {Math.round(poseState.dwellProgress * 100)}%)
            </span>
          </div>
        </div>
      )}

      {/* Result Floating Banner (Matching "JAWABAN: B" style from classroom interactive screen) */}
      {status === 'answered' && currentQ && (
        <div className="absolute inset-0 z-40 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg bg-slate-950/95 backdrop-blur-xl border-3 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 font-mono pointer-events-auto"
            style={{ borderColor: isCorrect ? '#10b981' : '#f43f5e' }}
          >
            {/* Answer Result Badge */}
            <div
              className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase shadow-lg"
              style={{
                backgroundColor: isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
                color: isCorrect ? '#34d399' : '#fb7185',
                border: `1.5px solid ${isCorrect ? '#10b981' : '#f43f5e'}`,
              }}
            >
              {isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span>{isCorrect ? 'JAWABAN BENAR' : 'JAWABAN SALAH'}</span>
            </div>

            <div className="text-xl md:text-2xl font-black text-white">
              Kunci Jawaban:{' '}
              <span className={currentQ.correctAnswer === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {currentQ.correctAnswer === 0 ? 'BENAR (B)' : 'SALAH (A)'}
              </span>
            </div>

            <p className="text-xs md:text-sm text-slate-300 font-sans leading-relaxed max-w-md bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
              {currentQ.explanation}
            </p>

            <button
              onClick={handleNextQuestion}
              className="mt-1 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:brightness-110 text-slate-950 font-black text-sm tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.4)] cursor-pointer transition-all hover:scale-105"
            >
              {currentIdx + 1 >= activeQuestions.length ? 'LIHAT HASIL AKHIR' : 'SOAL BERIKUTNYA ➔'}
            </button>
          </div>
        </div>
      )}

      {/* --- BOTTOM DOCK (MINIMALIST OPTIONS & MURID COUNTERS) --- */}
      <footer className="absolute bottom-0 left-0 right-0 z-30 h-20 px-4 md:px-8 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex items-center justify-between pointer-events-none font-mono">
        {/* Bottom Left Dock: [ A ] SALAH */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => status === 'playing' && submitAnswer('left')}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-950/90 border-2 transition-all cursor-pointer shadow-lg hover:scale-105 ${
              selectedZone === 'left'
                ? 'border-rose-400 bg-rose-950/60 shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                : 'border-rose-500/70 hover:border-rose-400'
            }`}
          >
            <span className="w-8 h-8 rounded-xl bg-rose-600 text-white font-black text-base flex items-center justify-center shadow-md">
              A
            </span>
            <div className="flex flex-col text-left">
              <span className="text-base md:text-lg font-black text-rose-300 leading-none">
                SALAH
              </span>
              <span className="text-[10px] text-slate-400 font-bold leading-tight mt-0.5">
                {leftStudents.length} Murid Memilih
              </span>
            </div>
          </button>
        </div>

        {/* Center Bottom: Consensus Balance Bar & Input Indicator */}
        <div className="hidden sm:flex flex-col items-center gap-1 bg-slate-950/80 border border-slate-800 px-4 py-1.5 rounded-2xl backdrop-blur-sm pointer-events-auto">
          {poseState.studentCount > 0 ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-rose-400 font-bold">{leftStudents.length} Murid</span>
              <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden flex border border-slate-700">
                <div
                  className="bg-rose-500 h-full transition-all duration-200"
                  style={{ width: `${(leftStudents.length / poseState.studentCount) * 100}%` }}
                />
                <div
                  className="bg-emerald-500 h-full transition-all duration-200"
                  style={{ width: `${(rightStudents.length / poseState.studentCount) * 100}%` }}
                />
              </div>
              <span className="text-emerald-400 font-bold">{rightStudents.length} Murid</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">
              {config.inputMode === 'gesture'
                ? `Melangkah ke kiri/kanan (Tahan: ${currentDwellSec.toFixed(1)}s)`
                : 'Klik separuh kiri (SALAH) atau kanan (BENAR)'}
            </span>
          )}
        </div>

        {/* Bottom Right Dock: BENAR [ B ] */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => status === 'playing' && submitAnswer('right')}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-950/90 border-2 transition-all cursor-pointer shadow-lg hover:scale-105 ${
              selectedZone === 'right'
                ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                : 'border-emerald-500/70 hover:border-emerald-400'
            }`}
          >
            <div className="flex flex-col text-right">
              <span className="text-base md:text-lg font-black text-emerald-300 leading-none">
                BENAR
              </span>
              <span className="text-[10px] text-slate-400 font-bold leading-tight mt-0.5">
                {rightStudents.length} Murid Memilih
              </span>
            </div>
            <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-md">
              B
            </span>
          </button>
        </div>
      </footer>

      {/* Tracking Status indicator at bottom left */}
      <div className="absolute bottom-3 left-4 z-20 flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-[11px] text-slate-400">
        <Activity className="w-3.5 h-3.5 text-cyan-400" />
        <span>
          {config.inputMode === 'gesture'
            ? poseState.studentCount > 0
              ? `${poseState.studentCount} Murid Terlacak (Stay: ${currentDwellSec.toFixed(1)}s)`
              : 'Mencari Posisi Murid di Depan Kamera...'
            : 'Mode Input: Layar Sentuh / Mouse'}
        </span>
      </div>
    </div>
  );
};
