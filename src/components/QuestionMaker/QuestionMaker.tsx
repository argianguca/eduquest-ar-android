import React, { useState, useEffect } from 'react';
import {
  Question,
  GradeLevel,
  DifficultyLevel,
  Language,
  AIGenerationRequest,
} from '../../types/question';
import { geminiClient } from '../../services/gemini';
import { storageService } from '../../services/storage';
import { audioService } from '../../services/audio';
import {
  Sparkles,
  PenTool,
  Save,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Info,
  Check,
  Plus,
  BookOpen,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

interface QuestionMakerProps {
  language: Language;
  onQuestionsSaved: () => Promise<void>;
  onNavigateToBank: () => void;
}

export const QuestionMaker: React.FC<QuestionMakerProps> = ({
  language,
  onQuestionsSaved,
  onNavigateToBank,
}) => {
  const isEn = language === 'en';
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('ai');

  // Server Gemini status & Custom API Key state
  const [isGeminiConfigured, setIsGeminiConfigured] = useState<boolean>(true);
  const [serverChecked, setServerChecked] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>(() => geminiClient.getCustomApiKey());
  const [inputKey, setInputKey] = useState<string>(() => geminiClient.getCustomApiKey());
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  const [showKeyPlaintext, setShowKeyPlaintext] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [keyTestFeedback, setKeyTestFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [keySavedFeedback, setKeySavedFeedback] = useState<string | null>(null);

  useEffect(() => {
    geminiClient.checkHealth().then((res) => {
      setIsGeminiConfigured(res.geminiConfigured);
      setServerChecked(true);
      // Auto-open key input if neither server key nor custom key is set
      if (!res.geminiConfigured && !geminiClient.hasCustomApiKey()) {
        setShowApiKeyInput(true);
      }
    });
  }, []);

  // --- MANUAL FORM STATE ---
  const [manualType, setManualType] = useState<'multiple_choice' | 'true_false'>('multiple_choice');
  const [manualGrade, setManualGrade] = useState<GradeLevel>(4);
  const [manualSubject, setManualSubject] = useState('IPAS');
  const [manualTopic, setManualTopic] = useState('');
  const [manualSubtopic, setManualSubtopic] = useState('');
  const [manualObjective, setManualObjective] = useState('');
  const [manualDifficulty, setManualDifficulty] = useState<DifficultyLevel>('medium');
  const [manualQuestionText, setManualQuestionText] = useState('');
  const [manualOptions, setManualOptions] = useState<[string, string, string, string]>([
    '',
    '',
    '',
    '',
  ]);
  const [manualCorrectAnswer, setManualCorrectAnswer] = useState<number>(0);
  const [manualExplanation, setManualExplanation] = useState('');
  const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);

  // --- AI FORM STATE ---
  const [aiGrade, setAiGrade] = useState<GradeLevel>(4);
  const [aiSubject, setAiSubject] = useState('IPAS');
  const [aiCustomSubject, setAiCustomSubject] = useState('');
  const [aiTopic, setAiTopic] = useState('Bagian Tumbuhan dan Fungsinya');
  const [aiSubtopic, setAiSubtopic] = useState('');
  const [aiObjective, setAiObjective] = useState(
    'Memahami fungsi daun, batang, dan akar pada tumbuhan'
  );
  const [aiLanguage, setAiLanguage] = useState<Language>('id');
  const [aiCount, setAiCount] = useState<number>(4);
  const [aiDifficulty, setAiDifficulty] = useState<DifficultyLevel>('medium');
  const [aiStyle, setAiStyle] = useState<'conceptual' | 'everyday' | 'hots'>('conceptual');
  const [aiTeacherNotes, setAiTeacherNotes] = useState('');

  // AI Generation Execution State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  // Common SD Subjects
  const commonSubjects = [
    'IPAS',
    'Matematika',
    'Bahasa Indonesia',
    'Pendidikan Pancasila',
    'Bahasa Inggris',
    'Pendidikan Agama',
    'Seni Budaya',
    'PJOK',
    'Lainnya (Tulis Sendiri)',
  ];

  // --- MANUAL SAVE HANDLER ---
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const isTF = manualType === 'true_false';
    if (!manualQuestionText.trim()) {
      alert('Tuliskan teks pertanyaan atau pernyataan.');
      return;
    }
    if (!isTF && manualOptions.some((o) => !o.trim())) {
      alert('Lengkapi teks pertanyaan dan semua 4 pilihan jawaban.');
      return;
    }

    const newQ: Question = {
      id: `q-man-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      gradeLevel: manualGrade,
      subject: manualSubject.trim() || 'Umum',
      topic: manualTopic.trim() || 'Materi Umum',
      subtopic: manualSubtopic.trim() || undefined,
      learningObjective: manualObjective.trim() || undefined,
      difficulty: manualDifficulty,
      questionText: manualQuestionText.trim(),
      type: manualType,
      options: isTF
        ? ['BENAR', 'SALAH']
        : [
            manualOptions[0].trim(),
            manualOptions[1].trim(),
            manualOptions[2].trim(),
            manualOptions[3].trim(),
          ],
      correctAnswer: isTF ? (manualCorrectAnswer > 1 ? 0 : manualCorrectAnswer) : manualCorrectAnswer,
      explanation: manualExplanation.trim() || 'Pembahasan materi.',
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storageService.saveQuestion(newQ);
    await onQuestionsSaved();
    audioService.playCorrect();

    setManualSuccessMsg(
      isTF
        ? 'Pernyataan Benar/Salah berhasil disimpan ke Bank Soal!'
        : 'Soal pilihan ganda berhasil disimpan ke Bank Soal!'
    );
    setManualQuestionText('');
    setManualOptions(['', '', '', '']);
    setManualExplanation('');
    setManualCorrectAnswer(0);
    setTimeout(() => setManualSuccessMsg(null), 4000);
  };

  // --- CUSTOM API KEY HANDLERS ---
  const handleSaveCustomApiKey = () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      handleClearCustomApiKey();
      return;
    }
    geminiClient.setCustomApiKey(trimmed);
    setCustomApiKey(trimmed);
    setKeySavedFeedback('Kunci API Gemini berhasil disimpan!');
    setKeyTestFeedback(null);
    audioService.playCorrect();
    setTimeout(() => setKeySavedFeedback(null), 4000);
  };

  const handleClearCustomApiKey = () => {
    geminiClient.clearCustomApiKey();
    setCustomApiKey('');
    setInputKey('');
    setKeySavedFeedback('Kunci API kustom telah dihapus.');
    setKeyTestFeedback(null);
    audioService.playButtonClick();
    setTimeout(() => setKeySavedFeedback(null), 3000);
  };

  const handleTestApiKey = async () => {
    const keyToTest = inputKey.trim() || customApiKey;
    if (!keyToTest && !isGeminiConfigured) {
      setKeyTestFeedback({
        success: false,
        message: 'Masukkan Kunci API Gemini terlebih dahulu untuk diuji.',
      });
      return;
    }

    setIsTestingKey(true);
    setKeyTestFeedback(null);
    audioService.playButtonClick();

    const res = await geminiClient.testApiKey(keyToTest || undefined);
    setIsTestingKey(false);
    setKeyTestFeedback(res);

    if (res.success) {
      audioService.playCorrect();
    } else {
      audioService.playIncorrect();
    }
  };

  // --- AI GENERATE HANDLER ---
  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify key availability
    const hasKey = Boolean(customApiKey.trim()) || isGeminiConfigured;
    if (!hasKey) {
      setShowApiKeyInput(true);
      setAiError(
        'Kunci API Gemini belum diatur. Silakan masukkan Kunci API Gemini Anda pada formulir di bawah ini.'
      );
      audioService.playIncorrect();
      return;
    }

    const finalSubject =
      aiSubject === 'Lainnya (Tulis Sendiri)' ? aiCustomSubject.trim() : aiSubject;
    if (!finalSubject) {
      alert('Pilih atau tuliskan mata pelajaran.');
      return;
    }
    if (!aiTopic.trim()) {
      alert('Tuliskan topik materi yang ingin dibuatkan soal.');
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    setSavedCount(0);
    audioService.playButtonClick();

    const requestPayload: AIGenerationRequest = {
      gradeLevel: aiGrade,
      subject: finalSubject,
      topic: aiTopic.trim(),
      subtopic: aiSubtopic.trim() || undefined,
      learningObjective: aiObjective.trim() || undefined,
      language: aiLanguage,
      count: aiCount,
      difficulty: aiDifficulty,
      style: aiStyle,
      teacherNotes: aiTeacherNotes.trim() || undefined,
      apiKey: customApiKey.trim() || undefined,
    };

    const result = await geminiClient.generateQuestions(requestPayload);
    setIsGenerating(false);

    if (result.success && result.questions && result.questions.length > 0) {
      setGeneratedQuestions(result.questions);
      audioService.playCorrect();
    } else {
      setAiError(
        result.error ||
          'Gagal menghasilkan soal dari model AI. Pastikan Kunci API Gemini Anda valid atau periksa koneksi internet.'
      );
      audioService.playIncorrect();
    }
  };

  // --- SAVE SINGLE AI QUESTION ---
  const handleSaveSingleGenerated = async (q: Question) => {
    await storageService.saveQuestion(q);
    await onQuestionsSaved();
    setGeneratedQuestions((prev) => prev.filter((item) => item.id !== q.id));
    setSavedCount((prev) => prev + 1);
    audioService.playButtonClick();
  };

  // --- SAVE ALL AI QUESTIONS ---
  const handleSaveAllGenerated = async () => {
    await storageService.saveQuestionsBatch(generatedQuestions);
    await onQuestionsSaved();
    setSavedCount(generatedQuestions.length);
    setGeneratedQuestions([]);
    audioService.playCorrect();
  };

  // --- REMOVE SINGLE GENERATED ---
  const handleRemoveGenerated = (id: string) => {
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== id));
    audioService.playButtonClick();
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col gap-6 max-w-6xl mx-auto select-none">
      {/* Top Banner */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-6 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-500/40 text-xs font-mono text-cyan-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>STUDIO PENULIS & GENERATOR SOAL SD</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-mono text-cyan-300">
            {isEn ? 'Question Maker Studio' : 'Pembuat Soal EduQuest AR'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isEn
              ? 'Create high-quality elementary school questions manually or with Gemini AI assistance'
              : 'Susun butir soal berkualitas untuk SD Kelas 1–6 secara manual atau otomatis berbantuan Gemini AI'}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-1.5 font-mono text-xs font-bold">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Generasi AI (Gemini)</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Pembuatan Manual</span>
          </button>
        </div>
      </header>

      {/* --- TAB 1: AI-ASSISTED CREATION --- */}
      {activeTab === 'ai' && (
        <div className="flex flex-col gap-6">
          {/* --- CUSTOM GEMINI API KEY CARD --- */}
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col gap-4 font-mono text-xs md:text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-cyan-300">Kunci API Gemini (AI Generator)</span>
                    {customApiKey ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] text-emerald-300 font-bold">
                        <Check className="w-3 h-3" />
                        <span>Kustom Tersimpan: {geminiClient.getMaskedApiKey(customApiKey)}</span>
                      </span>
                    ) : isGeminiConfigured ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[10px] text-cyan-300">
                        <Check className="w-3 h-3" />
                        <span>Kunci Server Terdeteksi (.env)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[10px] text-amber-300 font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Kunci Belum Diisi</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gunakan kunci API Gemini pribadi Anda untuk menghasilkan soal kurikulum SD secara instan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowApiKeyInput((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors self-start sm:self-center cursor-pointer"
              >
                <span>{showApiKeyInput ? 'Tutup Pengaturan' : customApiKey ? 'Ubah Kunci' : 'Input Kunci API'}</span>
                {showApiKeyInput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Expandable Key Input Panel */}
            {showApiKeyInput && (
              <div className="flex flex-col gap-3.5 pt-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-300 text-xs font-bold flex items-center justify-between">
                    <span>Kunci API Gemini (Google AI Studio)</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 text-[11px] underline"
                    >
                      <span>Dapatkan Kunci Gratis di Google AI Studio</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </label>

                  <div className="relative flex items-center">
                    <input
                      type={showKeyPlaintext ? 'text' : 'password'}
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="Masukkan AIzaSy..."
                      className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 pr-20 text-slate-100 text-xs font-mono placeholder-slate-600 focus:outline-none tracking-wider"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowKeyPlaintext((v) => !v)}
                        title={showKeyPlaintext ? 'Sembunyikan' : 'Tampilkan'}
                        className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
                      >
                        {showKeyPlaintext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveCustomApiKey}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Kunci</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestApiKey}
                      disabled={isTestingKey}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingKey ? 'animate-spin' : ''}`} />
                      <span>{isTestingKey ? 'Menguji...' : 'Uji Koneksi'}</span>
                    </button>

                    {customApiKey && (
                      <button
                        type="button"
                        onClick={handleClearCustomApiKey}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-950/70 text-red-300 border border-red-800/50 text-xs transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Kunci</span>
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-500">
                    Tersimpan aman di browser lokal Anda
                  </span>
                </div>

                {/* Status Messages */}
                {keySavedFeedback && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{keySavedFeedback}</span>
                  </div>
                )}

                {keyTestFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                      keyTestFeedback.success
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                        : 'bg-red-950/60 border-red-500/50 text-red-300'
                    }`}
                  >
                    {keyTestFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    )}
                    <span>{keyTestFeedback.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Generator Form */}
          <form
            onSubmit={handleGenerateAI}
            className="bg-slate-900/80 border border-cyan-500/30 rounded-3xl p-6 md:p-8 flex flex-col gap-5 shadow-xl font-mono text-xs md:text-sm"
          >
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h2 className="text-base md:text-lg font-bold text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Parameter Kurikulum & Sasaran Pembelajaran SD</span>
              </h2>
              <span className="text-xs text-slate-500">Model: Gemini 3.8 Flash (Server-Side)</span>
            </div>

            {/* Grid 1: Grade, Subject, Language, Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-slate-400 mb-1.5 block">Jenjang Kelas SD</label>
                <select
                  value={aiGrade}
                  onChange={(e) => setAiGrade(parseInt(e.target.value) as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  <option value={1}>Kelas 1 SD (Fase A)</option>
                  <option value={2}>Kelas 2 SD (Fase A)</option>
                  <option value={3}>Kelas 3 SD (Fase B)</option>
                  <option value={4}>Kelas 4 SD (Fase B)</option>
                  <option value={5}>Kelas 5 SD (Fase C)</option>
                  <option value={6}>Kelas 6 SD (Fase C)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1.5 block">Mata Pelajaran</label>
                <select
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  {commonSubjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1.5 block">Bahasa Soal</label>
                <select
                  value={aiLanguage}
                  onChange={(e) => setAiLanguage(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English (Bahasa Inggris)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1.5 block">Jumlah Soal Dihasilkan</label>
                <select
                  value={aiCount}
                  onChange={(e) => setAiCount(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:border-cyan-400 focus:outline-none font-bold text-cyan-300"
                >
                  <option value={2}>2 Butir Soal</option>
                  <option value={3}>3 Butir Soal</option>
                  <option value={4}>4 Butir Soal</option>
                  <option value={5}>5 Butir Soal</option>
                  <option value={8}>8 Butir Soal</option>
                </select>
              </div>
            </div>

            {/* Custom Subject field if "Lainnya" chosen */}
            {aiSubject === 'Lainnya (Tulis Sendiri)' && (
              <div>
                <label className="text-slate-400 mb-1 block">Tuliskan Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muatan Lokal Bahasa Jawa / Koding Dasar"
                  value={aiCustomSubject}
                  onChange={(e) => setAiCustomSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100"
                />
              </div>
            )}

            {/* Topic & Subtopic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 mb-1.5 block">Topik / Tema Utama</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rantai Makanan di Sawah, Pecahan Desimal"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1.5 block">Subtopik / Pokok Bahasan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Peran Dekomposer, Pembagian Bersusun"
                  value={aiSubtopic}
                  onChange={(e) => setAiSubtopic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Pedagogical Style & Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 mb-1.5 block">Gaya Pedagogik Soal</label>
                <select
                  value={aiStyle}
                  onChange={(e) => setAiStyle(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="conceptual">Pemahaman Konseptual (Dasar & Jelas)</option>
                  <option value="everyday">Penerapan Sehari-hari (Konteks Nyata Anak)</option>
                  <option value="hots">HOTS Sesuai Usia Anak SD (Penalaran Logis)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1.5 block">Tingkat Kesulitan</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="easy">Mudah (Dasar Pengenalan)</option>
                  <option value="medium">Sedang (Standar Kelas)</option>
                  <option value="hard">Menantang (Pengayaan)</option>
                </select>
              </div>
            </div>

            {/* CP / TP & Teacher Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 mb-1.5 block">
                  Target Capaian Pembelajaran (CP) / Tujuan Pembelajaran (TP)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Peserta didik dapat menganalisis peran produsen dan konsumen"
                  value={aiObjective}
                  onChange={(e) => setAiObjective(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1.5 block">Catatan Tambahan Guru (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Masukkan contoh hewan khas Indonesia seperti Komodo atau Harimau"
                  value={aiTeacherNotes}
                  onChange={(e) => setAiTeacherNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Error Display */}
            {aiError && (
              <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-300 text-xs">
                {aiError}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isGenerating}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-sm tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.4)] disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>SEDANG MEMPROSES DENGAN GEMINI AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-950" />
                    <span>GENERATE SOAL SEKARANG</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* AI Result Cards Preview */}
          {generatedQuestions.length > 0 && (
            <section className="flex flex-col gap-4 bg-slate-900/60 border border-cyan-500/40 rounded-3xl p-6 md:p-8 shadow-2xl">
              {/* Mandatory Review Warning */}
              <div className="p-4 rounded-2xl bg-amber-950/60 border-2 border-amber-500/70 text-amber-200 text-xs md:text-sm font-mono flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">
                    PERINGATAN PENINJAUAN KONTEN PENDIDIKAN AI:
                  </span>
                  <p className="mt-1 text-slate-300">
                    Konten soal edukatif yang dihasilkan oleh AI wajib diperiksa dan disetujui oleh bapak/ibu guru sebelum digunakan dalam pembelajaran peserta didik. Anda dapat mengedit teks soal, opsi jawaban, atau menghapus butir soal di bawah ini.
                  </p>
                </div>
              </div>

              {/* Header and Bulk Save */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <h3 className="text-base md:text-lg font-bold font-mono text-cyan-300">
                  Pratinjau Hasil Generasi ({generatedQuestions.length} Butir Soal)
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveAllGenerated}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold font-mono text-xs md:text-sm shadow-[0_0_15px_rgba(52,211,153,0.4)] hover:brightness-110 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>SETUJUI & SIMPAN SEMUA KE BANK SOAL</span>
                  </button>
                </div>
              </div>

              {/* Question list */}
              <div className="flex flex-col gap-4">
                {generatedQuestions.map((q, qIndex) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  return (
                    <div
                      key={q.id}
                      className="bg-slate-950/80 border border-slate-700/80 hover:border-cyan-500/50 rounded-2xl p-5 flex flex-col gap-3 font-mono shadow-md"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-bold">
                          Butir #{qIndex + 1} • Kelas {q.gradeLevel} SD • {q.subject}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveSingleGenerated(q)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 hover:bg-emerald-900 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Simpan Butir Ini</span>
                          </button>
                          <button
                            onClick={() => handleRemoveGenerated(q.id)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-rose-400"
                            title="Hapus butir ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="text-base font-sans font-semibold text-slate-100">
                        {q.questionText}
                      </p>

                      {/* Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = oIdx === q.correctAnswer;
                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                                isCorrect
                                  ? 'bg-emerald-950/50 border-emerald-500/70 text-emerald-200 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              <span
                                className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs ${
                                  isCorrect
                                    ? 'bg-emerald-500 text-black'
                                    : 'bg-slate-950 border border-slate-700 text-slate-400'
                                }`}
                              >
                                {letters[oIdx]}
                              </span>
                              <span>{opt}</span>
                              {isCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      <div className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800 font-sans">
                        <span className="text-cyan-400 font-mono font-bold">Pembahasan Saintifik: </span>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Success Banner when saved */}
          {savedCount > 0 && generatedQuestions.length === 0 && (
            <div className="p-6 rounded-3xl bg-emerald-950/60 border-2 border-emerald-500/70 text-center flex flex-col items-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <h3 className="text-xl font-bold font-mono text-emerald-300">
                {savedCount} BUTIR SOAL BERHASIL DISIMPAN KE BANK SOAL!
              </h3>
              <p className="text-sm text-slate-300 max-w-md">
                Soal-soal baru Anda kini siap dimainkan dalam game EduQuest AR atau digabungkan ke dalam paket kuis kelas.
              </p>
              <button
                onClick={onNavigateToBank}
                className="mt-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-sm shadow-lg cursor-pointer"
              >
                Buka Bank Soal
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: MANUAL CREATION --- */}
      {activeTab === 'manual' && (
        <form
          onSubmit={handleSaveManual}
          className="bg-slate-900/80 border border-cyan-500/30 rounded-3xl p-6 md:p-8 flex flex-col gap-5 shadow-xl font-mono text-xs md:text-sm"
        >
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold text-cyan-300 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-cyan-400" />
              <span>Formulir Penyusunan Soal Manual</span>
            </h2>
            <span className="text-xs text-slate-500">Tersimpan Langsung di Perangkat (Offline)</span>
          </div>

          {manualSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{manualSuccessMsg}</span>
            </div>
          )}

          {/* Type, Grade, Subject, Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-slate-400 mb-1.5 block">Format / Tipe Soal</label>
              <select
                value={manualType}
                onChange={(e) => {
                  const t = e.target.value as 'multiple_choice' | 'true_false';
                  setManualType(t);
                  if (t === 'true_false') setManualCorrectAnswer(0);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 font-bold"
              >
                <option value="multiple_choice">Pilihan Ganda (4 Opsi)</option>
                <option value="true_false">Benar / Salah (True/False)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 mb-1.5 block">Jenjang Kelas SD</label>
              <select
                value={manualGrade}
                onChange={(e) => setManualGrade(parseInt(e.target.value) as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100"
              >
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>
                    Kelas {g} SD
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 mb-1.5 block">Mata Pelajaran</label>
              <input
                type="text"
                required
                placeholder="Contoh: Matematika, IPAS"
                value={manualSubject}
                onChange={(e) => setManualSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100"
              />
            </div>

            <div>
              <label className="text-slate-400 mb-1.5 block">Tingkat Kesulitan</label>
              <select
                value={manualDifficulty}
                onChange={(e) => setManualDifficulty(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100"
              >
                <option value="easy">Mudah</option>
                <option value="medium">Sedang</option>
                <option value="hard">Menantang</option>
              </select>
            </div>
          </div>

          {/* Topic & Learning Objective */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 mb-1.5 block">Topik Pembahasan</label>
              <input
                type="text"
                required
                placeholder="Contoh: Operasi Perkalian dan Pembagian"
                value={manualTopic}
                onChange={(e) => setManualTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100"
              />
            </div>
            <div>
              <label className="text-slate-400 mb-1.5 block">Tujuan Belajar / CP / TP (Opsional)</label>
              <input
                type="text"
                placeholder="Contoh: Menyelesaikan masalah perkalian sederhana"
                value={manualObjective}
                onChange={(e) => setManualObjective(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100"
              />
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="text-slate-400 mb-1.5 block">
              {manualType === 'true_false' ? 'Pernyataan Soal (Benar atau Salah)' : 'Teks Pertanyaan'}
            </label>
            <textarea
              required
              rows={3}
              placeholder={
                manualType === 'true_false'
                  ? 'Tuliskan pernyataan yang akan dinilai BENAR atau SALAH oleh siswa...'
                  : 'Tuliskan butir soal dengan bahasa yang ramah anak...'
              }
              value={manualQuestionText}
              onChange={(e) => setManualQuestionText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 font-sans"
            />
          </div>

          {/* Choices: True/False buttons OR 4 choices */}
          {manualType === 'true_false' ? (
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30">
              <label className="text-purple-200 font-bold">
                Kunci Jawaban Pernyataan Ini (Pilih BENAR atau SALAH):
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setManualCorrectAnswer(0)}
                  className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
                    manualCorrectAnswer === 0
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg'
                      : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>BENAR (True)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setManualCorrectAnswer(1)}
                  className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
                    manualCorrectAnswer === 1
                      ? 'bg-rose-500 text-white border-rose-400 shadow-lg'
                      : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <X className="w-5 h-5" />
                  <span>SALAH (False)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <label className="text-slate-400">
                4 Pilihan Jawaban (Klik bulatan untuk menandai KUNCI JAWABAN BENAR)
              </label>
              {(['A', 'B', 'C', 'D'] as const).map((letChar, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="manualCorrectChoice"
                    checked={manualCorrectAnswer === idx}
                    onChange={() => setManualCorrectAnswer(idx)}
                    className="w-5 h-5 accent-cyan-400 cursor-pointer"
                  />
                  <span className="w-8 font-bold text-center text-cyan-400 text-base">{letChar}</span>
                  <input
                    type="text"
                    required
                    placeholder={`Tuliskan teks pilihan ${letChar}`}
                    value={manualOptions[idx]}
                    onChange={(e) => {
                      const next = [...manualOptions] as [string, string, string, string];
                      next[idx] = e.target.value;
                      setManualOptions(next);
                    }}
                    className="grow bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="text-slate-400 mb-1.5 block">Pembahasan & Penjelasan Ilmiah</label>
            <textarea
              required
              rows={2}
              placeholder="Penjelasan mendidik mengapa jawaban tersebut benar..."
              value={manualExplanation}
              onChange={(e) => setManualExplanation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 font-sans"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-sm tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer"
            >
              <Save className="w-5 h-5" />
              <span>SIMPAN KE BANK SOAL</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
