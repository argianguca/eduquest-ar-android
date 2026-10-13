/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Question,
  QuestionCollection,
  GameConfig,
  Language,
  GameMode,
} from './types/question';
import { storageService, DEFAULT_GAME_CONFIG } from './services/storage';
import { Navbar } from './components/Navigation/Navbar';
import { MainMenu } from './components/Game/MainMenu';
import { ClassroomKiosk } from './components/Game/ClassroomKiosk';
import { GameContainer } from './components/Game/GameContainer';
import { TruthDashContainer } from './components/Game/TruthDashContainer';
import { CatchQuestContainer } from './components/Game/CatchQuestContainer';
import { QuestionBank } from './components/QuestionBank/QuestionBank';
import { QuestionMaker } from './components/QuestionMaker/QuestionMaker';
import { SettingsModal } from './components/Settings/SettingsModal';
import { DiagnosticModal } from './components/Diagnostics/DiagnosticModal';
import { CameraTestScreen } from './components/Diagnostics/CameraTestScreen';
import { MultiTouchTestScreen } from './components/Diagnostics/MultiTouchTestScreen';
import { cameraService } from './services/camera';
import { OfflineIndicator } from './components/PWA/OfflineIndicator';
import { useWakeLock } from './hooks/useWakeLock';

export default function App() {
  const [view, setView] = useState<'play' | 'bank' | 'maker'>('play');
  const [language, setLanguage] = useState<Language>('id');
  const [config, setConfig] = useState<GameConfig>(DEFAULT_GAME_CONFIG);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [collections, setCollections] = useState<QuestionCollection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active game session
  const [activeCollection, setActiveCollection] = useState<QuestionCollection | null>(null);
  const [activeMode, setActiveMode] = useState<GameMode>('shooter');

  // Modals
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [showCameraTest, setShowCameraTest] = useState<boolean>(false);
  const [showMultiTouchTest, setShowMultiTouchTest] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Clean camera shutdown when leaving camera test
  const handleCloseCameraTest = useCallback(() => {
    cameraService.stopCamera();
    setShowCameraTest(false);
  }, []);

  // Keep screen awake during classroom play (Interactive Flat Panels & Tablets)
  useWakeLock(true);

  // Listen to fullscreen changes across browsers
  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as any;
      const isFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Load initial data from IndexedDB
  const refreshData = useCallback(async () => {
    await storageService.init();
    const [qs, cols, savedConfig] = await Promise.all([
      storageService.getAllQuestions(),
      storageService.getAllCollections(),
      storageService.getGameConfig(),
    ]);
    setQuestions(qs);
    setCollections(cols);
    setConfig(savedConfig);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Update Config
  const handleUpdateConfig = useCallback(
    async (newConfig: Partial<GameConfig>) => {
      setConfig((prev) => {
        const updated = { ...prev, ...newConfig };
        storageService.saveGameConfig(updated);
        return updated;
      });
    },
    []
  );

  // Fullscreen toggle for Android IFP & Desktop
  const handleToggleFullscreen = () => {
    const doc = document as any;
    const elem = document.documentElement as any;
    const isFs = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isFs) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  };

  // Launch Game
  const handleStartGame = (collection: QuestionCollection, mode: GameMode = 'shooter') => {
    cameraService.stopCamera();
    setShowCameraTest(false);
    setShowMultiTouchTest(false);
    setActiveCollection(collection);
    setActiveMode(mode);
  };

  const handleExitGame = () => {
    setActiveCollection(null);
  };

  // If active game is running, render full-screen corresponding Game Container
  if (activeCollection) {
    // Get questions belonging to this collection, or fallback to grade/subject match
    const collectionQuestions = questions.filter((q) =>
      activeCollection.questionIds.includes(q.id)
    );
    const availableQuestions =
      collectionQuestions.length > 0
        ? collectionQuestions
        : questions.filter(
            (q) =>
              q.gradeLevel === activeCollection.gradeLevel ||
              q.subject.toLowerCase() === activeCollection.subject.toLowerCase()
          );

    const targetQuestions = availableQuestions.length > 0 ? availableQuestions : questions;

    if (activeMode === 'truth_dash') {
      return (
        <TruthDashContainer
          collection={activeCollection}
          questions={targetQuestions}
          config={config}
          language={language}
          onUpdateConfig={handleUpdateConfig}
          onExitGame={handleExitGame}
          onSelectAnotherQuiz={() => {
            setActiveCollection(null);
            setView('play');
          }}
        />
      );
    }

    if (activeMode === 'catch_quest') {
      return (
        <CatchQuestContainer
          collection={activeCollection}
          questions={targetQuestions}
          config={config}
          language={language}
          onUpdateConfig={handleUpdateConfig}
          onExitGame={handleExitGame}
          onSelectAnotherQuiz={() => {
            setActiveCollection(null);
            setView('play');
          }}
        />
      );
    }

    // Default: 'shooter' (Shooter Quest)
    return (
      <GameContainer
        collection={activeCollection}
        questions={targetQuestions}
        config={config}
        language={language}
        onUpdateConfig={handleUpdateConfig}
        onExitGame={handleExitGame}
        onSelectAnotherQuiz={() => {
          setActiveCollection(null);
          setView('play');
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center text-cyan-400 font-mono gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
        <span className="text-sm tracking-wider">MEMUAT EDUQUEST AR...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        currentView={view}
        onSelectView={setView}
        language={language}
        onToggleLanguage={() => setLanguage((l) => (l === 'id' ? 'en' : 'id'))}
        inputMode={config.inputMode}
        onOpenSettings={() => setShowSettings(true)}
        onOpenDiagnostics={() => setShowDiagnostics(true)}
        onOpenCameraTest={() => setShowCameraTest(true)}
        onOpenTouchTest={() => setShowMultiTouchTest(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Content View Switcher */}
      <main className="grow">
        {view === 'play' &&
          (config.kioskModeEnabled !== false ? (
            <ClassroomKiosk
              collections={collections}
              questions={questions}
              config={config}
              language={language}
              onStartGame={handleStartGame}
              onUpdateConfig={handleUpdateConfig}
              onSwitchToAdvancedView={() => handleUpdateConfig({ kioskModeEnabled: false })}
              onNavigateToMaker={() => setView('maker')}
              onOpenSettings={() => setShowSettings(true)}
              onOpenCameraTest={() => setShowCameraTest(true)}
              onOpenTouchTest={() => setShowMultiTouchTest(true)}
            />
          ) : (
            <MainMenu
              collections={collections}
              questions={questions}
              config={config}
              language={language}
              onStartGame={handleStartGame}
              onUpdateConfig={handleUpdateConfig}
              onNavigateToBank={() => setView('bank')}
              onNavigateToMaker={() => setView('maker')}
              onSwitchToKioskView={() => handleUpdateConfig({ kioskModeEnabled: true })}
              onOpenCameraTest={() => setShowCameraTest(true)}
              onOpenTouchTest={() => setShowMultiTouchTest(true)}
            />
          ))}

        {view === 'bank' && (
          <QuestionBank
            questions={questions}
            collections={collections}
            language={language}
            onRefreshData={refreshData}
            onPlayCollection={handleStartGame}
          />
        )}

        {view === 'maker' && (
          <QuestionMaker
            language={language}
            onQuestionsSaved={refreshData}
            onNavigateToBank={() => setView('bank')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/80 px-4 py-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>EduQuest AR — Universal Educational Gaming Platform (SD Kelas 1–6)</span>
          <span className="text-slate-600">
            Dibuat untuk Guru SD & Peserta Didik Indonesia • Siap Offline & Panel Interaktif
          </span>
        </div>
      </footer>

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          config={config}
          language={language}
          onUpdateConfig={handleUpdateConfig}
          onUpdateLanguage={setLanguage}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showDiagnostics && (
        <DiagnosticModal
          config={config}
          language={language}
          onClose={() => setShowDiagnostics(false)}
          onSwitchMode={(mode) => handleUpdateConfig({ inputMode: mode })}
          onOpenCameraTest={() => setShowCameraTest(true)}
          onOpenTouchTest={() => setShowMultiTouchTest(true)}
        />
      )}

      {/* Temporary Camera & MediaPipe Test Screen (Hisense 75WM61FE) */}
      {showCameraTest && (
        <CameraTestScreen
          onClose={handleCloseCameraTest}
          isEn={language === 'en'}
        />
      )}

      {/* Temporary Multi-Touch 20+ Finger Test Screen (Hisense 75WM61FE) */}
      {showMultiTouchTest && (
        <MultiTouchTestScreen
          onClose={() => setShowMultiTouchTest(false)}
          isEn={language === 'en'}
        />
      )}

      {/* Offline Toast Indicator */}
      <OfflineIndicator />
    </div>
  );
}
