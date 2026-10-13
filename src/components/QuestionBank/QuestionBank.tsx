import React, { useState, useMemo, useRef } from 'react';
import {
  Question,
  QuestionCollection,
  GradeLevel,
  DifficultyLevel,
  Language,
  GameMode,
} from '../../types/question';
import { storageService } from '../../services/storage';
import { excelService, ExcelImportPreview, ExcelImportMode } from '../../services/excelService';
import { audioService } from '../../services/audio';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Copy,
  Trash2,
  Download,
  Upload,
  Eye,
  CheckCircle2,
  FolderPlus,
  BookOpen,
  RefreshCw,
  FileSpreadsheet,
  FileCode,
  AlertTriangle,
  X,
  Sparkles,
  Save,
  FileDown,
  Info,
  Check,
  ChevronDown,
} from 'lucide-react';

interface QuestionBankProps {
  questions: Question[];
  collections: QuestionCollection[];
  language: Language;
  onRefreshData: () => Promise<void>;
  onPlayCollection: (col: QuestionCollection, mode?: GameMode) => void;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({
  questions,
  collections,
  language,
  onRefreshData,
  onPlayCollection,
}) => {
  const isEn = language === 'en';

  // --- Filtering & Search ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [activeCollectionId, setActiveCollectionId] = useState<string>('all');

  // --- Modal States ---
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [deleteConfirmQId, setDeleteConfirmQId] = useState<string | null>(null);
  const [deleteConfirmColId, setDeleteConfirmColId] = useState<string | null>(null);

  // --- Collection Management Modals ---
  const [showCreateColModal, setShowCreateColModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColGrade, setNewColGrade] = useState<GradeLevel>(4);
  const [newColSubject, setNewColSubject] = useState('IPAS');
  const [newColTopic, setNewColTopic] = useState('');

  // --- FEATURE 3: JSON Backup & Restore Preview State ---
  const [jsonBackupPreview, setJsonBackupPreview] = useState<{
    rawJson: string;
    version?: string;
    exportedAt?: string;
    questionsCount: number;
    collectionsCount: number;
    duplicateIdCount: number;
    errors: string[];
  } | null>(null);
  const [jsonImportMode, setJsonImportMode] = useState<'add_new' | 'update_existing' | 'replace_all'>('add_new');

  // --- FEATURE 6: Excel (.xlsx) Import Preview State ---
  const [excelPreview, setExcelPreview] = useState<ExcelImportPreview | null>(null);
  const [excelImportMode, setExcelImportMode] = useState<ExcelImportMode>('add_new');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // --- Import / Export Status ---
  const [importNotification, setImportNotification] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const excelFileInputRef = useRef<HTMLInputElement | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  // Active collection object if filtered
  const activeCollection = collections.find((c) => c.id === activeCollectionId) || null;

  // Distinct subjects in dataset
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => set.add(q.subject));
    return Array.from(set).sort();
  }, [questions]);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedGrade !== 'all' && q.gradeLevel !== selectedGrade) return false;
      if (selectedSubject !== 'all' && q.subject !== selectedSubject) return false;
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;

      if (activeCollectionId !== 'all') {
        const col = collections.find((c) => c.id === activeCollectionId);
        if (col && !col.questionIds.includes(q.id)) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const textMatch = q.questionText.toLowerCase().includes(query);
        const topicMatch = q.topic.toLowerCase().includes(query);
        const optionMatch = q.options.some((o) => o.toLowerCase().includes(query));
        const tagMatch = q.tags?.some((t) => t.toLowerCase().includes(query));
        if (!textMatch && !topicMatch && !optionMatch && !tagMatch) return false;
      }

      return true;
    });
  }, [
    questions,
    selectedGrade,
    selectedSubject,
    selectedDifficulty,
    activeCollectionId,
    searchQuery,
    collections,
  ]);

  // --- CRUD Handlers ---
  const handleDeleteQuestion = async (id: string) => {
    await storageService.deleteQuestion(id);
    await onRefreshData();
    setDeleteConfirmQId(null);
    audioService.playButtonClick();
  };

  const handleDuplicateQuestion = async (q: Question) => {
    const dup: Question = {
      ...q,
      id: `q-dup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      questionText: `${q.questionText} (Salinan)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await storageService.saveQuestion(dup);
    await onRefreshData();
    audioService.playButtonClick();
  };

  const handleSaveQuestionForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingQuestion) return;

    await storageService.saveQuestion(editingQuestion);
    await onRefreshData();
    setEditingQuestion(null);
    setIsCreatingNew(false);
    audioService.playButtonClick();
  };

  // --- Collection Actions ---
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const newCol: QuestionCollection = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newColName.trim(),
      description: `Koleksi ${newColSubject} Kelas ${newColGrade} SD`,
      gradeLevel: newColGrade,
      subject: newColSubject,
      topic: newColTopic.trim() || 'Topik Umum',
      questionIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storageService.saveCollection(newCol);
    await onRefreshData();
    setActiveCollectionId(newCol.id);
    setShowCreateColModal(false);
    setNewColName('');
    setNewColTopic('');
    audioService.playButtonClick();
  };

  const handleDeleteCollection = async (id: string) => {
    await storageService.deleteCollection(id);
    await onRefreshData();
    setActiveCollectionId('all');
    setDeleteConfirmColId(null);
    audioService.playButtonClick();
  };

  // --- FEATURE 3: JSON BACKUP & RESTORE HANDLERS ---
  const handleExportJSON = async () => {
    const jsonStr = await storageService.exportAllToJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EduQuestAR_Cadangan_BankSoal_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    audioService.playButtonClick();
    setImportNotification({
      msg: 'Berkas cadangan JSON berhasil diunduh ke komputer Anda.',
      type: 'success',
    });
  };

  const handleSelectJSONFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const validation = storageService.validateJSONBackup(text);

    if (!validation.isValid && validation.errors.length > 0) {
      setImportNotification({
        msg: `Gagal memvalidasi JSON: ${validation.errors.join('; ')}`,
        type: 'error',
      });
      if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
      return;
    }

    setJsonBackupPreview({
      rawJson: text,
      version: validation.version,
      exportedAt: validation.exportedAt,
      questionsCount: validation.questionsCount,
      collectionsCount: validation.collectionsCount,
      duplicateIdCount: validation.duplicateIdCount,
      errors: validation.errors,
    });

    if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
  };

  const handleConfirmJSONRestore = async () => {
    if (!jsonBackupPreview) return;

    const res = await storageService.importFromJSONWithMode(
      jsonBackupPreview.rawJson,
      jsonImportMode
    );
    await onRefreshData();
    audioService.playCorrect();

    setImportNotification({
      msg: `Berhasil memulihkan ${res.questionsProcessed} butir soal dan ${res.collectionsProcessed} paket kuis (Mode: ${
        jsonImportMode === 'replace_all'
          ? 'Ganti Seluruh Bank Soal'
          : jsonImportMode === 'update_existing'
          ? 'Perbarui ID yang Cocok'
          : 'Tambah Soal Baru'
      }).`,
      type: 'success',
    });

    setJsonBackupPreview(null);
  };

  // --- FEATURE 6: EXCEL (.XLSX) IMPORT & EXPORT HANDLERS ---
  const handleExportAllExcel = () => {
    excelService.exportAllToExcel(questions, collections);
    audioService.playButtonClick();
    setShowExportMenu(false);
    setImportNotification({
      msg: `Berhasil mengekspor seluruh ${questions.length} butir soal ke berkas Excel (.xlsx).`,
      type: 'success',
    });
  };

  const handleExportActiveCollectionExcel = () => {
    if (!activeCollection) return;
    excelService.exportCollectionToExcel(activeCollection, questions);
    audioService.playButtonClick();
    setShowExportMenu(false);
    setImportNotification({
      msg: `Berhasil mengekspor paket "${activeCollection.name}" ke berkas Excel (.xlsx).`,
      type: 'success',
    });
  };

  const handleDownloadExcelTemplate = () => {
    excelService.downloadTemplate();
    audioService.playButtonClick();
    setShowExportMenu(false);
    setImportNotification({
      msg: 'Template Excel (.xlsx) dengan petunjuk lengkap dan contoh soal berhasil diunduh.',
      type: 'success',
    });
  };

  const handleSelectExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const preview = await excelService.parseExcelFile(file);
      setExcelPreview(preview);
    } catch (err: any) {
      setImportNotification({
        msg: `Gagal membaca file Excel: ${err.message || 'Format tidak dikenali.'}`,
        type: 'error',
      });
    }

    if (excelFileInputRef.current) excelFileInputRef.current.value = '';
  };

  const handleConfirmExcelImport = async () => {
    if (!excelPreview || !excelPreview.canProceed) return;

    const res = await storageService.saveExcelImport(
      excelPreview.validQuestions,
      excelPreview.collectionNames,
      excelImportMode
    );

    await onRefreshData();
    audioService.playCorrect();

    setImportNotification({
      msg: `Berhasil mengimpor ${res.questionsSaved} butir soal dan ${res.collectionsCreated} paket kuis dari file Excel "${excelPreview.fileName}"!`,
      type: 'success',
    });

    setExcelPreview(null);
  };

  // --- CSV Handlers (Legacy fallback) ---
  const handleExportCSV = async () => {
    const csvStr = await storageService.exportQuestionsToCSV();
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EduQuestAR_Soal_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    audioService.playButtonClick();
  };

  const handleResetSamples = async () => {
    if (
      window.confirm(
        'Pulihkan koleksi soal bawaan SD (IPAS, Matematika, Bahasa Indonesia, Pendidikan Pancasila)? Data contoh akan ditambahkan kembali.'
      )
    ) {
      await storageService.resetToDefaultSamples();
      await onRefreshData();
      audioService.playCorrect();
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto select-none">
      {/* Top Title and Actions Bar */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-6 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-500/40 text-xs font-mono text-cyan-400 mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>MODUL GURU & PENYUSUN KUIS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-mono text-cyan-300">
            {isEn ? 'Question Bank Management' : 'Bank Soal EduQuest AR'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isEn
              ? 'Organize, edit, import/export Excel (.xlsx) and JSON backups across Grades 1–6 SD'
              : 'Kelola butir soal SD Kelas 1–6, paket kuis, cadangan JSON, serta ekspor/impor Excel (.xlsx)'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              const emptyQ: Question = {
                id: `q-man-${Date.now()}`,
                gradeLevel: 4,
                subject: 'IPAS',
                topic: '',
                difficulty: 'medium',
                questionText: '',
                type: 'multiple_choice',
                options: ['', '', '', ''],
                correctAnswer: 0,
                explanation: '',
                source: 'manual',
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              setEditingQuestion(emptyQ);
              setIsCreatingNew(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold font-mono text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:brightness-110 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? 'Add Question' : 'Tambah Soal Baru'}</span>
          </button>

          <button
            onClick={() => setShowCreateColModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-cyan-400" />
            <span>{isEn ? 'New Collection' : 'Paket Kuis Baru'}</span>
          </button>

          {/* Excel & JSON Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs font-semibold cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Excel & Cadangan</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 font-mono text-xs">
                {/* Excel Export */}
                <button
                  onClick={handleExportAllExcel}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-emerald-300 text-left cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Ekspor Semua ke Excel (.xlsx)</span>
                </button>

                {activeCollection && (
                  <button
                    onClick={handleExportActiveCollectionExcel}
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-emerald-300 text-left cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Ekspor Paket Ini ke Excel (.xlsx)</span>
                  </button>
                )}

                <button
                  onClick={handleDownloadExcelTemplate}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-emerald-300 text-left cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-emerald-400" />
                  <span>Unduh Format Template Excel</span>
                </button>

                <div className="my-1 border-t border-slate-800" />

                {/* Excel Import */}
                <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-emerald-300 text-left cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Impor Berkas Excel (.xlsx)</span>
                  <input
                    ref={excelFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleSelectExcelFile}
                    className="hidden"
                  />
                </label>

                <div className="my-1 border-t border-slate-800" />

                {/* JSON Backup & Restore */}
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-cyan-300 text-left cursor-pointer"
                >
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span>Cadangkan ke JSON (Backup)</span>
                </button>

                <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-cyan-300 text-left cursor-pointer">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Pulihkan dari JSON (Restore)</span>
                  <input
                    ref={jsonFileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleSelectJSONFile}
                    className="hidden"
                  />
                </label>

                <div className="my-1 border-t border-slate-800" />

                {/* CSV Fallback */}
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white text-left cursor-pointer text-[11px]"
                >
                  <span>Ekspor Alternatif CSV</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleResetSamples}
            title="Pulihkan Bank Soal Contoh SD"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Notification banner */}
      {importNotification && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border text-sm font-mono ${
            importNotification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500 text-rose-300'
          }`}
        >
          <span>{importNotification.msg}</span>
          <button
            onClick={() => setImportNotification(null)}
            className="p-1 hover:bg-black/20 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Collections Carousel / Selector Bar */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            {isEn ? 'Active Quiz Collection' : 'Pilih Paket Kuis Aktif'}
          </span>
          <span className="text-xs font-mono text-cyan-400">
            {collections.length} Paket Terdaftar
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCollectionId('all')}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeCollectionId === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Semua Soal ({questions.length})
          </button>

          {collections.map((col) => {
            const isSelected = activeCollectionId === col.id;
            return (
              <div
                key={col.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                  isSelected
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <button
                  onClick={() => setActiveCollectionId(col.id)}
                  className="flex items-center gap-2 font-mono text-xs font-medium cursor-pointer"
                >
                  <span className="text-emerald-400 font-bold">K{col.gradeLevel}</span>
                  <span className="max-w-[140px] truncate">{col.name}</span>
                  <span className="text-[10px] text-slate-500">({col.questionIds.length})</span>
                </button>

                {/* Play Button for this collection */}
                {(() => {
                  const colQuestions = questions.filter((q) => col.questionIds.includes(q.id));
                  const isTF = colQuestions.some(
                    (q) => q.type === 'true_false' || (Array.isArray(q.options) && q.options.length === 2)
                  );
                  const targetMode: GameMode = isTF ? 'truth_dash' : 'shooter';
                  return (
                    <button
                      onClick={() => onPlayCollection(col, targetMode)}
                      title={`Mainkan Paket Ini di ${isTF ? 'Truth Dash (Benar/Salah)' : 'Shooter Quest AR'}`}
                      className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                        isTF
                          ? 'bg-emerald-500/20 hover:bg-emerald-500/40 border-emerald-500/50 text-emerald-300'
                          : 'bg-cyan-500/20 hover:bg-cyan-500/40 border-cyan-500/50 text-cyan-300'
                      }`}
                    >
                      {isTF ? '⚡ Truth Dash' : '🎯 Main AR'}
                    </button>
                  );
                })()}

                {/* Delete collection if not default */}
                {!col.isDefault && (
                  <button
                    onClick={() => setDeleteConfirmColId(col.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        {/* Search Input */}
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isEn ? 'Search questions or topics...' : 'Cari teks soal atau topik...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs md:text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Grade Filter */}
        <div>
          <select
            value={selectedGrade}
            onChange={(e) =>
              setSelectedGrade(e.target.value === 'all' ? 'all' : (parseInt(e.target.value) as any))
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
          >
            <option value="all">Semua Kelas (1–6 SD)</option>
            <option value="1">Kelas 1 SD</option>
            <option value="2">Kelas 2 SD</option>
            <option value="3">Kelas 3 SD</option>
            <option value="4">Kelas 4 SD</option>
            <option value="5">Kelas 5 SD</option>
            <option value="6">Kelas 6 SD</option>
          </select>
        </div>

        {/* Subject Filter */}
        <div>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
          >
            <option value="all">Semua Mata Pelajaran</option>
            {availableSubjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty Filter */}
        <div>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
          >
            <option value="all">Semua Tingkat Kesulitan</option>
            <option value="easy">Mudah (Easy)</option>
            <option value="medium">Sedang (Medium)</option>
            <option value="hard">Menantang (Challenging)</option>
          </select>
        </div>
      </section>

      {/* Questions Table / List */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
          <span>Menampilkan {filteredQuestions.length} butir soal</span>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-400 flex flex-col items-center">
            <BookOpen className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-base font-semibold">Tidak ada butir soal yang sesuai filter</p>
            <p className="text-xs text-slate-500 mt-1">
              Ubah kriteria pencarian atau tambahkan soal baru.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredQuestions.map((q) => {
              const letters = ['A', 'B', 'C', 'D'];
              return (
                <div
                  key={q.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 md:p-5 transition-all shadow-md flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-cyan-300">
                        Kelas {q.gradeLevel} SD
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 font-mono text-xs font-bold text-emerald-300">
                        {q.subject}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
                        q.type === 'true_false'
                          ? 'bg-purple-950/70 border-purple-500/50 text-purple-300'
                          : 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
                      }`}>
                        {q.type === 'true_false' ? 'Benar / Salah (True/False)' : 'Pilihan Ganda (4 Opsi)'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {q.topic} {q.subtopic ? `• ${q.subtopic}` : ''}
                      </span>
                      {q.source === 'ai' && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded">
                          <Sparkles className="w-3 h-3" /> Dibuat AI
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewQuestion(q)}
                        title="Pratinjau Tampilan Game"
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingQuestion(q);
                          setIsCreatingNew(false);
                        }}
                        title="Edit Soal"
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicateQuestion(q)}
                        title="Duplikat Soal"
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmQId(q.id)}
                        title="Hapus Soal"
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <h3 className="text-base md:text-lg font-semibold text-slate-100 leading-snug">
                    {q.questionText}
                  </h3>

                  {/* 4 Choices Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm font-mono">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correctAnswer;
                      return (
                        <div
                          key={oIdx}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                            isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-200 font-semibold'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold ${
                              isCorrect
                                ? 'bg-emerald-500 text-black'
                                : 'bg-slate-900 border border-slate-700 text-slate-400'
                            }`}
                          >
                            {letters[oIdx]}
                          </span>
                          <span className="truncate">{opt}</span>
                          {isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation snippet */}
                  <div className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                    <span className="text-cyan-400 font-mono font-bold">Pembahasan: </span>
                    {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* --- FEATURE 3: MODAL PREVIEW & CONFIRM RESTORE JSON --- */}
      {jsonBackupPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border-2 border-cyan-400 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-4 font-mono text-xs md:text-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <FileCode className="w-5 h-5" />
                <span>Pratinjau Cadangan JSON</span>
              </div>
              <button
                onClick={() => setJsonBackupPreview(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Versi Skema:</span>
                <span className="text-cyan-300 font-bold">{jsonBackupPreview.version}</span>
              </div>
              {jsonBackupPreview.exportedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Tanggal Ekspor:</span>
                  <span className="text-slate-200">{new Date(jsonBackupPreview.exportedAt).toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Jumlah Soal Terdeteksi:</span>
                <span className="text-emerald-300 font-bold">{jsonBackupPreview.questionsCount} Butir</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jumlah Paket Kuis:</span>
                <span className="text-emerald-300 font-bold">{jsonBackupPreview.collectionsCount} Paket</span>
              </div>
              {jsonBackupPreview.duplicateIdCount > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>ID Duplikat Ditemukan:</span>
                  <span>{jsonBackupPreview.duplicateIdCount} (Akan dibuatkan ID baru)</span>
                </div>
              )}
            </div>

            {/* Import Mode Selector */}
            <div className="flex flex-col gap-2 pt-2">
              <label className="text-slate-300 font-bold">Pilih Mode Pemulihan:</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer">
                  <input
                    type="radio"
                    name="jsonMode"
                    value="add_new"
                    checked={jsonImportMode === 'add_new'}
                    onChange={() => setJsonImportMode('add_new')}
                    className="mt-0.5 accent-cyan-400"
                  />
                  <div>
                    <span className="font-bold text-cyan-300 block">Tambah Soal Baru (Merge / Tambah) [Rekomendasi]</span>
                    <span className="text-[11px] text-slate-400">Pertahankan seluruh soal yang ada. ID duplikat akan dibuatkan ID unik baru.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer">
                  <input
                    type="radio"
                    name="jsonMode"
                    value="update_existing"
                    checked={jsonImportMode === 'update_existing'}
                    onChange={() => setJsonImportMode('update_existing')}
                    className="mt-0.5 accent-cyan-400"
                  />
                  <div>
                    <span className="font-bold text-amber-300 block">Perbarui Soal yang Cocok (Update Matching IDs)</span>
                    <span className="text-[11px] text-slate-400">Perbarui soal jika ID-nya cocok, tambahkan jika baru.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-900 bg-rose-950/20 cursor-pointer">
                  <input
                    type="radio"
                    name="jsonMode"
                    value="replace_all"
                    checked={jsonImportMode === 'replace_all'}
                    onChange={() => setJsonImportMode('replace_all')}
                    className="mt-0.5 accent-rose-500"
                  />
                  <div>
                    <span className="font-bold text-rose-300 block">Ganti Seluruh Bank Soal (Destruktif)</span>
                    <span className="text-[11px] text-rose-400/80">PERINGATAN: Menghapus seluruh soal yang ada dan menggantinya dengan cadangan ini.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setJsonBackupPreview(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmJSONRestore}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold font-mono text-xs shadow-lg hover:brightness-110 cursor-pointer"
              >
                Konfirmasi & Pulihkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FEATURE 6: MODAL PREVIEW & CONFIRM IMPORT EXCEL (.XLSX) --- */}
      {excelPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border-2 border-emerald-400 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-4 font-mono text-xs md:text-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <FileSpreadsheet className="w-5 h-5" />
                <span>Pratinjau Impor Excel ({excelPreview.fileName})</span>
              </div>
              <button
                onClick={() => setExcelPreview(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Total Baris</span>
                <span className="text-base font-bold text-slate-200">{excelPreview.totalRows}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Soal Valid</span>
                <span className="text-base font-bold text-emerald-300">{excelPreview.validQuestions.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Baris Tidak Valid</span>
                <span className={`text-base font-bold ${excelPreview.invalidRows.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {excelPreview.invalidRows.length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Paket Dibuat</span>
                <span className="text-base font-bold text-cyan-300">{excelPreview.collectionNames.length}</span>
              </div>
            </div>

            {/* Invalid rows warning list if any */}
            {excelPreview.invalidRows.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/60 flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                <span className="font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Daftar Baris Tidak Valid ({excelPreview.invalidRows.length} baris dilewati):</span>
                </span>
                {excelPreview.invalidRows.map((err, idx) => (
                  <div key={idx} className="text-[11px] text-rose-200/90 pl-5">
                    • <strong>Baris {err.rowNumber}:</strong> {err.message}
                  </div>
                ))}
              </div>
            )}

            {/* Import Mode */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="text-slate-300 font-bold">Pilih Mode Impor Excel:</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer">
                  <input
                    type="radio"
                    name="excelMode"
                    value="add_new"
                    checked={excelImportMode === 'add_new'}
                    onChange={() => setExcelImportMode('add_new')}
                    className="mt-0.5 accent-emerald-400"
                  />
                  <div>
                    <span className="font-bold text-emerald-300 block">Tambah Soal Baru [Rekomendasi]</span>
                    <span className="text-[11px] text-slate-400">Pertahankan soal lama dan tambahkan soal baru. Jika ID sudah ada, akan dibuatkan ID unik baru.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer">
                  <input
                    type="radio"
                    name="excelMode"
                    value="update_existing"
                    checked={excelImportMode === 'update_existing'}
                    onChange={() => setExcelImportMode('update_existing')}
                    className="mt-0.5 accent-emerald-400"
                  />
                  <div>
                    <span className="font-bold text-amber-300 block">Perbarui Soal yang Cocok</span>
                    <span className="text-[11px] text-slate-400">Timpa konten soal jika QuestionID sama, dan tambahkan sisanya.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-900 bg-rose-950/20 cursor-pointer">
                  <input
                    type="radio"
                    name="excelMode"
                    value="replace_all"
                    checked={excelImportMode === 'replace_all'}
                    onChange={() => setExcelImportMode('replace_all')}
                    className="mt-0.5 accent-rose-500"
                  />
                  <div>
                    <span className="font-bold text-rose-300 block">Ganti Seluruh Bank Soal</span>
                    <span className="text-[11px] text-rose-400/80">Hapus seluruh data yang ada dan gantikan hanya dengan isi file Excel ini.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setExcelPreview(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmExcelImport}
                disabled={!excelPreview.canProceed}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold font-mono text-xs shadow-lg hover:brightness-110 cursor-pointer disabled:opacity-50"
              >
                Simpan {excelPreview.validQuestions.length} Soal ke Bank Soal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT / CREATE QUESTION --- */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full bg-slate-900 border-2 border-cyan-500 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xl font-bold font-mono text-cyan-300">
                {isCreatingNew ? 'Tambah Soal Baru' : 'Edit Butir Soal'}
              </h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestionForm} className="flex flex-col gap-4 text-sm font-mono">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tipe Soal</label>
                  <select
                    value={editingQuestion.type || 'multiple_choice'}
                    onChange={(e) => {
                      const newType = e.target.value as 'multiple_choice' | 'true_false';
                      if (newType === 'true_false') {
                        setEditingQuestion({
                          ...editingQuestion,
                          type: 'true_false',
                          options: ['BENAR', 'SALAH'],
                          correctAnswer: editingQuestion.correctAnswer > 1 ? 0 : editingQuestion.correctAnswer,
                        });
                      } else {
                        const existingOpts = editingQuestion.options;
                        const fourOpts: [string, string, string, string] = [
                          existingOpts[0] || '',
                          existingOpts[1] || '',
                          existingOpts[2] || '',
                          existingOpts[3] || '',
                        ];
                        setEditingQuestion({
                          ...editingQuestion,
                          type: 'multiple_choice',
                          options: fourOpts,
                          correctAnswer: 0,
                        });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                  >
                    <option value="multiple_choice">Pilihan Ganda (4 Opsi)</option>
                    <option value="true_false">Benar / Salah (True/False)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Jenjang Kelas SD</label>
                  <select
                    value={editingQuestion.gradeLevel}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        gradeLevel: parseInt(e.target.value) as any,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                  >
                    {[1, 2, 3, 4, 5, 6].map((g) => (
                      <option key={g} value={g}>
                        Kelas {g} SD
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Mata Pelajaran</label>
                  <input
                    type="text"
                    required
                    value={editingQuestion.subject}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, subject: e.target.value })
                    }
                    placeholder="Contoh: IPAS, Matematika"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Kesulitan</label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as any })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                  >
                    <option value="easy">Mudah</option>
                    <option value="medium">Sedang</option>
                    <option value="hard">Menantang</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Topik Materi</label>
                  <input
                    type="text"
                    required
                    value={editingQuestion.topic}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, topic: e.target.value })
                    }
                    placeholder="Contoh: Fotosintesis"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tujuan Belajar / CP / TP (Opsional)</label>
                  <input
                    type="text"
                    value={editingQuestion.learningObjective || ''}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, learningObjective: e.target.value })
                    }
                    placeholder="Capaian Pembelajaran"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  {editingQuestion.type === 'true_false' ? 'Pernyataan Soal (Benar atau Salah)' : 'Teks Pertanyaan'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={editingQuestion.questionText}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, questionText: e.target.value })
                  }
                  placeholder={
                    editingQuestion.type === 'true_false'
                      ? 'Tuliskan pernyataan yang akan dinilai Benar atau Salah oleh siswa...'
                      : 'Tuliskan teks pertanyaan dengan jelas...'
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 font-sans"
                />
              </div>

              {/* Choices depending on Question Type */}
              {editingQuestion.type === 'true_false' ? (
                <div className="flex flex-col gap-2 p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30">
                  <label className="text-xs text-purple-200 font-bold">
                    Kunci Jawaban Pernyataan Ini (Pilih Benar atau Salah):
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingQuestion({ ...editingQuestion, correctAnswer: 0 })}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold font-mono transition-all cursor-pointer ${
                        editingQuestion.correctAnswer === 0
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                          : 'bg-slate-950/80 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>BENAR (True)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingQuestion({ ...editingQuestion, correctAnswer: 1 })}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold font-mono transition-all cursor-pointer ${
                        editingQuestion.correctAnswer === 1
                          ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                          : 'bg-slate-950/80 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      <span>SALAH (False)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-400">
                    Pilihan Jawaban (Pilih radio untuk menandai kunci jawaban yang benar)
                  </label>
                  {(['A', 'B', 'C', 'D'] as const).map((letChar, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswerOption"
                        checked={editingQuestion.correctAnswer === idx}
                        onChange={() =>
                          setEditingQuestion({ ...editingQuestion, correctAnswer: idx })
                        }
                        className="accent-cyan-400 w-4 h-4 cursor-pointer"
                      />
                      <span className="w-6 font-bold text-cyan-400 text-center">{letChar}</span>
                      <input
                        type="text"
                        required
                        value={editingQuestion.options[idx] || ''}
                        onChange={(e) => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[idx] = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options: newOpts });
                        }}
                        placeholder={`Pilihan Jawaban ${letChar}`}
                        className="grow bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-200"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Pembahasan / Penjelasan</label>
                <textarea
                  required
                  rows={2}
                  value={editingQuestion.explanation}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                  }
                  placeholder="Penjelasan mengapa jawaban tersebut benar..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 font-sans"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold shadow-lg hover:brightness-110 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan ke Bank Soal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE COLLECTION --- */}
      {showCreateColModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-cyan-500 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="text-lg font-bold font-mono text-cyan-300">Buat Paket Kuis Baru</h3>
            <form onSubmit={handleCreateCollection} className="flex flex-col gap-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Nama Paket Kuis</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ulangan Harian IPAS Bab 1"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 mb-1 block">Jenjang Kelas</label>
                  <select
                    value={newColGrade}
                    onChange={(e) => setNewColGrade(parseInt(e.target.value) as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                  >
                    {[1, 2, 3, 4, 5, 6].map((g) => (
                      <option key={g} value={g}>
                        Kelas {g} SD
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Mata Pelajaran</label>
                  <input
                    type="text"
                    required
                    value={newColSubject}
                    onChange={(e) => setNewColSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Topik</label>
                <input
                  type="text"
                  placeholder="Topik pembahasan"
                  value={newColTopic}
                  onChange={(e) => setNewColTopic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateColModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  Simpan Paket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PREVIEW MODAL --- */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border-2 border-cyan-400 rounded-3xl p-6 md:p-8 shadow-[0_0_40px_rgba(6,182,212,0.3)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400">
                PRATINJAU TAMPILAN GAME AR • Kelas {previewQuestion.gradeLevel} SD • {previewQuestion.subject}
              </span>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/80 border border-cyan-500/40 rounded-2xl p-6 text-center">
              <h3 className="text-xl md:text-2xl font-bold text-slate-100">
                {previewQuestion.questionText}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-sm">
              {previewQuestion.options.map((opt, i) => {
                const isCor = i === previewQuestion.correctAnswer;
                return (
                  <div
                    key={i}
                    className={`p-3.5 rounded-xl border flex items-center gap-2 ${
                      isCor
                        ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-cyan-300">
                      {['A', 'B', 'C', 'D'][i]}
                    </span>
                    <span>{opt}</span>
                    {isCor && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />}
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
              <span className="text-cyan-400 font-bold">Pembahasan: </span>
              {previewQuestion.explanation}
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE MODALS --- */}
      {deleteConfirmQId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 text-center flex flex-col gap-4">
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
            <h4 className="text-lg font-bold font-mono text-rose-300">Hapus Butir Soal Ini?</h4>
            <p className="text-xs text-slate-300">
              Tindakan ini tidak dapat dibatalkan. Soal akan dihapus secara permanen dari penyimpanan lokal.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmQId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteQuestion(deleteConfirmQId)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmColId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 text-center flex flex-col gap-4">
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
            <h4 className="text-lg font-bold font-mono text-rose-300">Hapus Paket Kuis Ini?</h4>
            <p className="text-xs text-slate-300">
              Paket kuis akan dihapus, namun butir-butir soal yang ada di dalamnya akan tetap tersimpan di bank soal.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmColId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteCollection(deleteConfirmColId)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono"
              >
                Ya, Hapus Paket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
