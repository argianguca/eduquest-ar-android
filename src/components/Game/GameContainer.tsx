import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Question,
  QuestionCollection,
  GameConfig,
  GameSessionState,
  Language,
  AnswerRecord,
} from '../../types/question';
import { cameraService } from '../../services/camera';
import { handTrackingEngine, HandTrackingState, HandPoint } from '../../services/handTracking';
import { audioService } from '../../services/audio';
import { GameHUD } from '../HUD/GameHUD';
import { ReticleOverlay } from '../HUD/ReticleOverlay';
import { GestureCalibrationModal } from './GestureCalibrationModal';
import { GameResultsView } from './GameResultsView';

interface GameContainerProps {
  collection: QuestionCollection;
  questions: Question[];
  config: GameConfig;
  language: Language;
  onUpdateConfig: (newConfig: Partial<GameConfig>) => void;
  onExitGame: () => void;
  onSelectAnotherQuiz: () => void;
}

export const GameContainer: React.FC<GameContainerProps> = ({
  collection,
  questions,
  config,
  language,
  onUpdateConfig,
  onExitGame,
  onSelectAnotherQuiz,
}) => {
  // --- Game Session State ---
  const [session, setSession] = useState<GameSessionState>(() => {
    // Select questions up to questionsPerRound
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const roundQuestions = shuffled.slice(0, Math.min(config.questionsPerRound, questions.length));

    return {
      status: 'briefing',
      currentQuestionIndex: 0,
      questions: roundQuestions,
      score: 0,
      combo: 0,
      maxCombo: 0,
      lives: config.initialLives,
      selectedAnswer: null,
      isAnswerSubmitted: false,
      isCorrect: null,
      timeRemaining: config.timeLimitPerQuestion,
      isPaused: false,
      answersHistory: [],
      collectionName: collection.name,
      subject: collection.subject,
      gradeLevel: collection.gradeLevel,
      topic: collection.topic,
    };
  });

  // Flow Sub-states
  const [showCalibration, setShowCalibration] = useState<boolean>(config.inputMode === 'gesture');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(!config.enableSound);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Hovered option index (0, 1, 2, 3 or null)
  const [hoveredOptionIndex, setHoveredOptionIndex] = useState<number | null>(null);
  const [dwellProgress, setDwellProgress] = useState<number>(0);
  const dwellStartTimeRef = useRef<number | null>(null);

  // Mouse fallback pointer
  const [mousePointer, setMousePointer] = useState<HandPoint | null>(null);

  // Hand tracking state
  const [trackingState, setTrackingState] = useState<HandTrackingState>({
    isReady: false,
    isHandDetected: false,
    pointer: null,
    thumb: null,
    pinchDistanceNormalized: 999,
    pinchChargeProgress: 0,
    isPinching: false,
    isPinchTriggered: false,
    handedness: '',
    palmSize: 0,
    error: null,
  });

  // DOM References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Update audio muted status
  useEffect(() => {
    audioService.setMuted(isMuted);
  }, [isMuted]);

  // Sync handTrackingEngine config
  useEffect(() => {
    handTrackingEngine.updateConfig(config.pinchThreshold, config.reticleSmoothing);
  }, [config.pinchThreshold, config.reticleSmoothing]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- CAMERA & HAND TRACKING SETUP ---
  useEffect(() => {
    let isMounted = true;

    async function initCameraAndVision() {
      if (config.inputMode !== 'gesture') {
        cameraService.stopCamera();
        handTrackingEngine.stopProcessing();
        setIsCameraActive(false);
        return;
      }

      setCameraError(null);
      // Start camera stream
      const { stream, error } = await cameraService.startCamera(config.preferredCameraId);
      if (!isMounted) return;

      if (error || !stream) {
        setCameraError(error || 'Gagal memulai kamera.');
        setIsCameraActive(false);
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        setIsCameraActive(true);
      }

      // Initialize HandLandmarker model
      const initResult = await handTrackingEngine.initialize();
      if (!isMounted) return;

      if (!initResult.success) {
        setCameraError(initResult.error);
        return;
      }

      // Start video frame processing loop
      if (videoRef.current) {
        handTrackingEngine.startProcessing(videoRef.current, (newState) => {
          if (isMounted) {
            setTrackingState(newState);
          }
        });
      }
    }

    initCameraAndVision();

    return () => {
      isMounted = false;
      handTrackingEngine.stopProcessing();
      cameraService.stopCamera();
    };
  }, [config.inputMode, config.preferredCameraId]);

  // --- COLLISION DETECTION (RETICLE -> ANSWER BUTTONS) ---
  const activePointer = config.inputMode === 'mouse' ? mousePointer : trackingState.pointer;

  useEffect(() => {
    if (!activePointer) {
      if (hoveredOptionIndex !== null) setHoveredOptionIndex(null);
      return;
    }

    const { screenX, screenY } = activePointer;
    let foundIndex: number | null = null;

    optionRefs.current.forEach((btn, index) => {
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      if (
        screenX >= rect.left &&
        screenX <= rect.right &&
        screenY >= rect.top &&
        screenY <= rect.bottom
      ) {
        foundIndex = index;
      }
    });

    if (foundIndex !== hoveredOptionIndex) {
      setHoveredOptionIndex(foundIndex);
      if (foundIndex !== null && !session.isAnswerSubmitted) {
        audioService.playLaserAim();
      }
    }
  }, [activePointer, session.isAnswerSubmitted, hoveredOptionIndex]);

  // --- PINCH TRIGGER HANDLING ---
  useEffect(() => {
    if (!trackingState.isPinchTriggered) return;

    // If answer already submitted, allow pinch anywhere to proceed to next question!
    if (session.isAnswerSubmitted) {
      handleNextQuestion();
      return;
    }

    // If hovering an option during active play, select it!
    if (hoveredOptionIndex !== null && !session.isAnswerSubmitted && session.status === 'playing') {
      audioService.playPinchSelect();
      handleSelectOption(hoveredOptionIndex);
    }
  }, [trackingState.isPinchTriggered, hoveredOptionIndex, session.isAnswerSubmitted, session.status]);

  // --- COUNTDOWN TIMER ---
  useEffect(() => {
    if (session.status !== 'playing' || session.isPaused || session.isAnswerSubmitted || config.unlimitedTime) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setSession((prev) => {
        if (prev.timeRemaining <= 1) {
          // Time expired! Treat as incorrect
          clearInterval(timerIntervalRef.current);
          handleTimeExpired();
          return { ...prev, timeRemaining: 0 };
        }

        const nextTime = prev.timeRemaining - 1;
        if (nextTime <= 5) {
          audioService.playCountdownTick(true);
        }
        return { ...prev, timeRemaining: nextTime };
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [session.status, session.isPaused, session.isAnswerSubmitted, config.unlimitedTime]);

  // --- ANSWER SUBMISSION LOGIC ---
  const handleSelectOption = useCallback(
    (index: number) => {
      if (session.isAnswerSubmitted || session.status !== 'playing') return;

      const currentQ = session.questions[session.currentQuestionIndex];
      const isCorrect = index === currentQ.correctAnswer;
      const timeTaken = config.timeLimitPerQuestion - session.timeRemaining;

      // Score calculation
      let points = 0;
      let newCombo = session.combo;
      let newLives = session.lives;

      if (isCorrect) {
        newCombo = session.combo + 1;
        const comboBonus = config.comboMultiplierBonus ? (newCombo > 1 ? (newCombo - 1) * 25 : 0) : 0;
        const speedBonus = Math.max(0, session.timeRemaining * 4);
        points = config.pointPerQuestion + comboBonus + speedBonus;
        audioService.playCorrect();
      } else {
        newCombo = 0;
        audioService.playIncorrect();
        if (config.costLifeOnWrong) {
          newLives = Math.max(0, session.lives - 1);
        }
      }

      const answerRecord: AnswerRecord = {
        questionId: currentQ.id,
        questionText: currentQ.questionText,
        options: currentQ.options,
        chosenOption: index,
        correctAnswer: currentQ.correctAnswer,
        isCorrect,
        timeTaken,
        explanation: currentQ.explanation,
        pointsAwarded: points,
      };

      setSession((prev) => ({
        ...prev,
        score: prev.score + points,
        combo: newCombo,
        maxCombo: Math.max(prev.maxCombo, newCombo),
        lives: newLives,
        selectedAnswer: index,
        isAnswerSubmitted: true,
        isCorrect,
        answersHistory: [...prev.answersHistory, answerRecord],
      }));
    },
    [session, config]
  );

  // --- HOVER DWELL AUTO-SELECTION (Tahan Kursor / Tangan untuk Memilih) ---
  const shooterDwellSec = config.shooterDwellDuration || config.globalDwellDuration || 1.5;

  useEffect(() => {
    if (
      hoveredOptionIndex === null ||
      session.isAnswerSubmitted ||
      session.status !== 'playing' ||
      config.enableDwellSelection === false
    ) {
      dwellStartTimeRef.current = null;
      setDwellProgress(0);
      return;
    }

    dwellStartTimeRef.current = Date.now();
    const interval = setInterval(() => {
      if (!dwellStartTimeRef.current) return;
      const elapsed = (Date.now() - dwellStartTimeRef.current) / 1000;
      const progress = Math.min(1, elapsed / shooterDwellSec);
      setDwellProgress(progress);

      if (progress >= 1) {
        clearInterval(interval);
        dwellStartTimeRef.current = null;
        setDwellProgress(0);
        audioService.playPinchSelect();
        handleSelectOption(hoveredOptionIndex);
      }
    }, 50);

    return () => {
      clearInterval(interval);
      setDwellProgress(0);
      dwellStartTimeRef.current = null;
    };
  }, [
    hoveredOptionIndex,
    session.isAnswerSubmitted,
    session.status,
    config.enableDwellSelection,
    shooterDwellSec,
    handleSelectOption,
  ]);

  const handleTimeExpired = useCallback(() => {
    const currentQ = session.questions[session.currentQuestionIndex];
    audioService.playIncorrect();
    const newLives = config.costLifeOnWrong ? Math.max(0, session.lives - 1) : session.lives;

    const answerRecord: AnswerRecord = {
      questionId: currentQ.id,
      questionText: currentQ.questionText,
      options: currentQ.options,
      chosenOption: -1,
      correctAnswer: currentQ.correctAnswer,
      isCorrect: false,
      timeTaken: config.timeLimitPerQuestion,
      explanation: currentQ.explanation,
      pointsAwarded: 0,
    };

    setSession((prev) => ({
      ...prev,
      combo: 0,
      lives: newLives,
      selectedAnswer: -1,
      isAnswerSubmitted: true,
      isCorrect: false,
      answersHistory: [...prev.answersHistory, answerRecord],
    }));
  }, [session, config]);

  // --- ADVANCE TO NEXT QUESTION OR RESULTS ---
  const handleNextQuestion = useCallback(() => {
    audioService.playButtonClick();

    // Check if game is over (lives ran out or all questions answered)
    const isOutOfLives = session.lives <= 0 && config.costLifeOnWrong;
    const isLastQuestion = session.currentQuestionIndex + 1 >= session.questions.length;

    if (isOutOfLives || isLastQuestion) {
      setSession((prev) => ({
        ...prev,
        status: 'completed',
        isAnswerSubmitted: false,
      }));
      return;
    }

    // Advance to next question
    setSession((prev) => ({
      ...prev,
      currentQuestionIndex: prev.currentQuestionIndex + 1,
      selectedAnswer: null,
      isAnswerSubmitted: false,
      isCorrect: null,
      timeRemaining: config.timeLimitPerQuestion,
    }));
    setHoveredOptionIndex(null);
  }, [session, config]);

  // --- TOGGLE CONTROLS ---
  const handleTogglePause = () => {
    audioService.playButtonClick();
    setSession((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleToggleInputMode = () => {
    audioService.playButtonClick();
    const modes: ('gesture' | 'touch' | 'mouse')[] = ['gesture', 'touch', 'mouse'];
    const nextIdx = (modes.indexOf(config.inputMode) + 1) % modes.length;
    onUpdateConfig({ inputMode: modes[nextIdx] });
  };

  // --- MOUSE MOVE LISTENER FOR MOUSE MODE ---
  const handleMouseMove = (e: React.MouseEvent) => {
    if (config.inputMode === 'mouse') {
      setMousePointer({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
        screenX: e.clientX,
        screenY: e.clientY,
      });
    }
  };

  // --- PLAY AGAIN WITH SAME COLLECTION ---
  const handlePlayAgain = () => {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const roundQuestions = shuffled.slice(0, Math.min(config.questionsPerRound, questions.length));

    setSession({
      status: 'playing',
      currentQuestionIndex: 0,
      questions: roundQuestions,
      score: 0,
      combo: 0,
      maxCombo: 0,
      lives: config.initialLives,
      selectedAnswer: null,
      isAnswerSubmitted: false,
      isCorrect: null,
      timeRemaining: config.timeLimitPerQuestion,
      isPaused: false,
      answersHistory: [],
      collectionName: collection.name,
      subject: collection.subject,
      gradeLevel: collection.gradeLevel,
      topic: collection.topic,
    });
    setHoveredOptionIndex(null);
  };

  // --- PRACTICE MISTAKES ONLY ---
  const handlePracticeMistakes = (mistakeQuestions: Question[]) => {
    audioService.playButtonClick();
    setSession({
      status: 'playing',
      currentQuestionIndex: 0,
      questions: mistakeQuestions,
      score: 0,
      combo: 0,
      maxCombo: 0,
      lives: config.initialLives,
      selectedAnswer: null,
      isAnswerSubmitted: false,
      isCorrect: null,
      timeRemaining: config.timeLimitPerQuestion,
      isPaused: false,
      answersHistory: [],
      collectionName: `${collection.name} (Latihan Kesalahan)`,
      subject: collection.subject,
      gradeLevel: collection.gradeLevel,
      topic: collection.topic,
    });
    setHoveredOptionIndex(null);
  };

  const currentQuestion = session.questions[session.currentQuestionIndex];

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col justify-between"
    >
      {/* 1. Live Mirrored Video Element behind UI */}
      {config.inputMode === 'gesture' && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 overflow-hidden"
          style={{ opacity: config.cameraOpacity }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        </div>
      )}

      {/* 2. Cyber Matrix Grid Background effect */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950/80 to-slate-950/95" />

      {/* 3. Camera Error Banner if webcam denied */}
      {cameraError && config.inputMode === 'gesture' && !showCalibration && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-4 text-rose-200 text-sm shadow-xl flex items-center justify-between gap-3">
          <span>{cameraError}</span>
          <button
            onClick={() => onUpdateConfig({ inputMode: 'touch' })}
            className="px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white font-mono text-xs font-bold cursor-pointer"
          >
            Beralih ke Layar Sentuh
          </button>
        </div>
      )}

      {/* 4. Active Reticle Overlay */}
      {session.status === 'playing' && (
        <ReticleOverlay
          pointer={activePointer}
          pinchCharge={Math.max(trackingState.pinchChargeProgress, dwellProgress)}
          isPinching={trackingState.isPinching || dwellProgress > 0}
          isTriggered={trackingState.isPinchTriggered}
          hoveredOptionIndex={hoveredOptionIndex}
          inputMode={config.inputMode}
          isHandDetected={trackingState.isHandDetected}
        />
      )}

      {/* 5. Calibration Modal before game starts */}
      {showCalibration && config.inputMode === 'gesture' && (
        <GestureCalibrationModal
          trackingState={trackingState}
          config={config}
          language={language}
          onUpdateConfig={onUpdateConfig}
          onCompleteCalibration={() => {
            setShowCalibration(false);
            setSession((s) => ({ ...s, status: 'playing' }));
          }}
          onSwitchMode={(mode) => {
            onUpdateConfig({ inputMode: mode });
            setShowCalibration(false);
            setSession((s) => ({ ...s, status: 'playing' }));
          }}
          onCancel={onExitGame}
        />
      )}

      {/* 6. Mission Briefing Screen (if not calibrated or touch/mouse) */}
      {!showCalibration && session.status === 'briefing' && (
        <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900/90 border-2 border-cyan-500 rounded-3xl p-6 md:p-8 text-center shadow-[0_0_45px_rgba(6,182,212,0.3)]">
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-3 py-1 rounded-full border border-cyan-500/40 uppercase tracking-widest">
              MISI EDUQUEST AR
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold font-mono text-white mt-3 mb-1">
              {collection.name}
            </h2>
            <p className="text-sm font-mono text-emerald-400 mb-6">
              Kelas {collection.gradeLevel} SD • {collection.subject} • {collection.topic}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Jumlah Soal</span>
                <span className="text-lg font-bold text-cyan-300">
                  {session.questions.length} Butir
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Waktu / Soal</span>
                <span className="text-lg font-bold text-amber-300">
                  {config.timeLimitPerQuestion} Detik
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Energi Nyawa</span>
                <span className="text-lg font-bold text-rose-300">{config.initialLives} Perisai</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  audioService.playButtonClick();
                  setSession((s) => ({ ...s, status: 'playing' }));
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold font-mono text-base tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:brightness-110 cursor-pointer"
              >
                MULAI MISI SEKARANG
              </button>
              <button
                onClick={onExitGame}
                className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs cursor-pointer"
              >
                Kembali ke Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Active Gameplay HUD */}
      {!showCalibration && session.status !== 'completed' && currentQuestion && (
        <GameHUD
          currentQuestion={currentQuestion}
          questionIndex={session.currentQuestionIndex}
          totalQuestions={session.questions.length}
          score={session.score}
          combo={session.combo}
          lives={session.lives}
          timeRemaining={session.timeRemaining}
          maxTime={config.timeLimitPerQuestion}
          selectedOption={session.selectedAnswer}
          hoveredOption={hoveredOptionIndex}
          isAnswerSubmitted={session.isAnswerSubmitted}
          isCorrect={session.isCorrect}
          isPaused={session.isPaused}
          config={config}
          language={language}
          quizName={collection.name}
          isHandDetected={trackingState.isHandDetected}
          isCameraActive={isCameraActive}
          isMuted={isMuted}
          isFullscreen={isFullscreen}
          onOptionHover={setHoveredOptionIndex}
          onOptionSelect={handleSelectOption}
          onNextQuestion={handleNextQuestion}
          onTogglePause={handleTogglePause}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={handleToggleFullscreen}
          onUpdateCameraOpacity={(opacity) => onUpdateConfig({ cameraOpacity: opacity })}
          onToggleInputMode={handleToggleInputMode}
          onExitGame={onExitGame}
          optionRefs={optionRefs}
        />
      )}

      {/* 8. Completed Results View */}
      {session.status === 'completed' && (
        <GameResultsView
          sessionState={session}
          language={language}
          onPlayAgain={handlePlayAgain}
          onPracticeMistakes={handlePracticeMistakes}
          onSelectAnotherQuiz={onSelectAnotherQuiz}
          onReturnHome={onExitGame}
        />
      )}
    </div>
  );
};
