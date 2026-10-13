import React, { useState, useEffect } from 'react';
import { GameConfig, Language } from '../../types/question';
import { cameraService, CameraDevice } from '../../services/camera';
import { audioService } from '../../services/audio';
import {
  Settings,
  Sliders,
  Camera,
  Hand,
  Touchpad,
  MousePointer,
  Volume2,
  Type,
  X,
  Check,
  Shield,
  Clock,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Save,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Footprints,
  Users,
  Infinity as InfinityIcon,
  Zap,
  Gauge,
  Layers,
} from 'lucide-react';
import { geminiClient } from '../../services/gemini';

interface SettingsModalProps {
  config: GameConfig;
  language: Language;
  onUpdateConfig: (newConfig: Partial<GameConfig>) => void;
  onUpdateLanguage: (lang: Language) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  language,
  onUpdateConfig,
  onUpdateLanguage,
  onClose,
}) => {
  const isEn = language === 'en';
  const [cameras, setCameras] = useState<CameraDevice[]>([]);

  // Custom Gemini API key state
  const [customApiKey, setCustomApiKey] = useState<string>(() => geminiClient.getCustomApiKey());
  const [inputKey, setInputKey] = useState<string>(() => geminiClient.getCustomApiKey());
  const [showKeyPlaintext, setShowKeyPlaintext] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [isGeminiServerConfigured, setIsGeminiServerConfigured] = useState<boolean>(false);

  useEffect(() => {
    cameraService.getAvailableCameras().then((list) => setCameras(list));
    geminiClient.checkHealth().then((res) => setIsGeminiServerConfigured(res.geminiConfigured));
  }, []);

  const handleSaveKey = () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      handleClearKey();
      return;
    }
    geminiClient.setCustomApiKey(trimmed);
    setCustomApiKey(trimmed);
    setSaveFeedback('Kunci API Gemini berhasil disimpan!');
    setTestFeedback(null);
    audioService.playCorrect();
    setTimeout(() => setSaveFeedback(null), 4000);
  };

  const handleClearKey = () => {
    geminiClient.clearCustomApiKey();
    setCustomApiKey('');
    setInputKey('');
    setSaveFeedback('Kunci API kustom telah dihapus.');
    setTestFeedback(null);
    audioService.playButtonClick();
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleTestKey = async () => {
    const keyToTest = inputKey.trim() || customApiKey;
    if (!keyToTest && !isGeminiServerConfigured) {
      setTestFeedback({
        success: false,
        message: 'Masukkan Kunci API Gemini terlebih dahulu untuk diuji.',
      });
      return;
    }

    setIsTestingKey(true);
    setTestFeedback(null);
    audioService.playButtonClick();

    const res = await geminiClient.testApiKey(keyToTest || undefined);
    setIsTestingKey(false);
    setTestFeedback(res);

    if (res.success) {
      audioService.playCorrect();
    } else {
      audioService.playIncorrect();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="max-w-2xl w-full bg-slate-900 border-2 border-cyan-500 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-cyan-400" />
            <h3 className="text-xl font-bold font-mono text-cyan-300">
              {isEn ? 'Game & Classroom Settings' : 'Pengaturan Game & Kelas'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5 font-mono text-xs md:text-sm">
          {/* Section 1: Input Mode */}
          <div className="flex flex-col gap-2">
            <span className="text-slate-300 font-bold flex items-center gap-2">
              <Hand className="w-4 h-4 text-cyan-400" />
              <span>Metode Kontrol Utama</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => onUpdateConfig({ inputMode: 'gesture' })}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                  config.inputMode === 'gesture'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Hand className="w-6 h-6 mb-1 text-cyan-400" />
                <span className="font-bold text-xs">Gestur Kamera (AR)</span>
                <span className="text-[10px] text-slate-500">Arahkan & Cubit Jari</span>
              </button>

              <button
                onClick={() => onUpdateConfig({ inputMode: 'touch' })}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                  config.inputMode === 'touch'
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-200 shadow-md ring-1 ring-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Touchpad className="w-6 h-6 mb-1 text-emerald-400" />
                <span className="font-bold text-xs">Layar Sentuh (IFP)</span>
                <span className="text-[10px] text-slate-500">Sentuh Langsung Panel</span>
              </button>

              <button
                onClick={() => onUpdateConfig({ inputMode: 'mouse' })}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                  config.inputMode === 'mouse'
                    ? 'bg-amber-950 border-amber-400 text-amber-200 shadow-md ring-1 ring-amber-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <MousePointer className="w-6 h-6 mb-1 text-amber-400" />
                <span className="font-bold text-xs">Mouse & Pointer</span>
                <span className="text-[10px] text-slate-500">Klik Standar Laptop</span>
              </button>
            </div>
          </div>

          {/* Section 2: Camera Device Selection (for external USB webcam on IFP) */}
          {cameras.length > 1 && (
            <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <label className="text-slate-300 font-bold flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Pilih Kamera / Webcam (Laptop vs Eksternal IFP)</span>
              </label>
              <select
                value={config.preferredCameraId || ''}
                onChange={(e) => onUpdateConfig({ preferredCameraId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none"
              >
                <option value="">Kamera Default Sistem</option>
                {cameras.map((c) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section 3: Gameplay Rules, Flexible Time Limits & Difficulties */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-4">
            <span className="font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Pengaturan Waktu Permainan (Semua Game)</span>
              </span>
              {config.unlimitedTime ? (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold flex items-center gap-1">
                  <InfinityIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Waktu Tak Terbatas</span>
                </span>
              ) : (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-bold font-mono">
                  {config.timeLimitPerQuestion} Detik
                </span>
              )}
            </span>

            {/* Unlimited Time Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <InfinityIcon className="w-4 h-4 text-cyan-400" />
                  <span>Mode Waktu Tak Terbatas (Santai / Diskusi Kelas)</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Soal tidak dibatasi countdown detik. Murid dapat berdiskusi tanpa tekanan waktu.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateConfig({ unlimitedTime: !config.unlimitedTime })}
                className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.unlimitedTime ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    config.unlimitedTime ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Custom Seconds Input if not unlimited */}
            {!config.unlimitedTime && (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-300 font-semibold">
                    Durasi Hitung Mundur per Soal (Detik Bebas):
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig({
                          timeLimitPerQuestion: Math.max(5, (config.timeLimitPerQuestion || 25) - 5),
                        })
                      }
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                    >
                      -5s
                    </button>
                    <input
                      type="number"
                      min={5}
                      max={600}
                      value={config.timeLimitPerQuestion || 25}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 1) {
                          onUpdateConfig({ timeLimitPerQuestion: val });
                        }
                      }}
                      className="w-16 text-center font-mono font-bold bg-slate-950 border border-cyan-500/50 rounded-lg py-1 text-cyan-300 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig({
                          timeLimitPerQuestion: Math.min(600, (config.timeLimitPerQuestion || 25) + 5),
                        })
                      }
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                    >
                      +5s
                    </button>
                  </div>
                </div>

                {/* Quick preset chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-500 mr-1">Preset Cepat:</span>
                  {[10, 15, 20, 25, 35, 45, 60, 90, 120].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onUpdateConfig({ timeLimitPerQuestion: sec })}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                        config.timeLimitPerQuestion === sec
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Round Size, Lives & Text Size */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Soal per Putaran</label>
                <select
                  value={config.questionsPerRound}
                  onChange={(e) => onUpdateConfig({ questionsPerRound: parseInt(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-200"
                >
                  <option value={3}>3 Soal (Cepat)</option>
                  <option value={5}>5 Soal (Standar)</option>
                  <option value={8}>8 Soal</option>
                  <option value={10}>10 Soal</option>
                  <option value={15}>15 Soal</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1 block">Energi Nyawa / Perisai</label>
                <select
                  value={config.initialLives}
                  onChange={(e) => onUpdateConfig({ initialLives: parseInt(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-200"
                >
                  <option value={1}>1 Perisai (Tantangan)</option>
                  <option value={3}>3 Perisai (Standar)</option>
                  <option value={5}>5 Perisai</option>
                  <option value={99}>Tak Terbatas</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1 block">Ukuran Huruf Layar</label>
                <select
                  value={config.textSize}
                  onChange={(e) => onUpdateConfig({ textSize: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-200"
                >
                  <option value="normal">Standar (Laptop)</option>
                  <option value="large">Besar (Proyektor)</option>
                  <option value="xl">Sangat Besar (IFP)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Visual Transparency & Camera / Reticle Controls */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
            <span className="font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Pengaturan Transparansi Tampilan & Kamera</span>
              </span>
              <span className="text-[10px] text-slate-400">Menyesuaikan feed webcam & overlay soal</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Camera Video Transparency */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Transparansi Video Kamera</span>
                  </span>
                  <span className="text-cyan-300 font-bold font-mono">
                    {Math.round(config.cameraOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.cameraOpacity}
                  onChange={(e) => onUpdateConfig({ cameraOpacity: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>10% (Redup)</span>
                  <span>65% (Standar)</span>
                  <span>100% (Terang Penuh)</span>
                </div>
              </div>

              {/* Game Overlay Cards & HUD Transparency */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Transparansi Kartu Overlay Game</span>
                  </span>
                  <span className="text-amber-300 font-bold font-mono">
                    {Math.round((config.overlayCardOpacity ?? 0.85) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.overlayCardOpacity ?? 0.85}
                  onChange={(e) => onUpdateConfig({ overlayCardOpacity: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>10% (Sangat Tembus)</span>
                  <span>85% (Standar)</span>
                  <span>100% (Solid Penuh)</span>
                </div>
              </div>
            </div>

            {/* Reticle Smoothing */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Kehalusan Pelacakan Reticle (Smoothing)</span>
                <span className="text-cyan-300 font-bold font-mono">
                  {Math.round(config.reticleSmoothing * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.85"
                step="0.05"
                value={config.reticleSmoothing}
                onChange={(e) => onUpdateConfig({ reticleSmoothing: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* Section 4.0: Catch Quest AR - Opsi Kecepatan Jatuh (Speed Option) */}
          <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Catch Quest AR: Pengaturan Kecepatan Jatuh (Speed Option)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold font-mono">
                {(config.catchQuestSpeed ?? 1.0).toFixed(1)}x Kecepatan
              </span>
            </div>

            <p className="text-[11px] text-slate-300">
              Atur kecepatan jatuhnya gelembung/token jawaban di arena Catch Quest agar sesuai dengan tingkat usia murid dan kecepatan respons kelas.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Slider Kecepatan Fleksibel</span>
                  <span className="text-cyan-300 font-bold font-mono">
                    {(config.catchQuestSpeed ?? 1.0).toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.2"
                  step="0.1"
                  value={config.catchQuestSpeed ?? 1.0}
                  onChange={(e) => onUpdateConfig({ catchQuestSpeed: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>0.4x (Sangat Santai)</span>
                  <span className="text-cyan-400 font-bold">1.0x (Normal)</span>
                  <span>2.2x (Cepat)</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 mb-1 block">Pilihan Preset Cepat</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateConfig({ catchQuestSpeed: 0.6 })}
                    className={`px-2 py-2 rounded-xl border text-xs flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      (config.catchQuestSpeed ?? 1.0) <= 0.7
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold">🐢 Santai</span>
                    <span className="text-[9px] text-slate-400">0.6x Speed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateConfig({ catchQuestSpeed: 1.0 })}
                    className={`px-2 py-2 rounded-xl border text-xs flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      Math.abs((config.catchQuestSpeed ?? 1.0) - 1.0) < 0.15
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold">⚡ Normal</span>
                    <span className="text-[9px] text-slate-400">1.0x Speed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateConfig({ catchQuestSpeed: 1.5 })}
                    className={`px-2 py-2 rounded-xl border text-xs flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      (config.catchQuestSpeed ?? 1.0) >= 1.4
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold">🚀 Cepat</span>
                    <span className="text-[9px] text-slate-400">1.5x Speed</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4.1: Truth Dash AR - Durasi Stay & Mode Multi-Murid */}
          <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/40 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-200 flex items-center gap-2">
                <Footprints className="w-4 h-4 text-purple-400" />
                <span>Truth Dash AR: Durasi Stay & Mode Kelas</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 border border-purple-500/40 text-purple-300 font-bold">
                {(config.truthDashDwellDuration || 1.5).toFixed(1)}s Dwell
              </span>
            </div>

            <p className="text-[11px] text-slate-300">
              Atur berapa lama murid harus bertahan di zona Kiri (SALAH) atau Kanan (BENAR) untuk mengunci jawaban, serta mode partisipasi murid serentak di depan layar.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center text-xs text-slate-300 mb-1.5">
                  <span className="font-semibold">Durasi Stay / Dwell Kustom</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0.5"
                      max="30"
                      step="0.5"
                      value={config.truthDashDwellDuration ?? config.globalDwellDuration ?? 1.5}
                      onChange={(e) => {
                        const val = Math.max(0.5, Math.min(30, parseFloat(e.target.value) || 1.5));
                        onUpdateConfig({ truthDashDwellDuration: val, globalDwellDuration: val });
                      }}
                      className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-purple-500/50 text-purple-300 font-bold font-mono text-xs text-center"
                    />
                    <span className="text-purple-400 font-mono text-xs">detik</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.5"
                  value={config.truthDashDwellDuration ?? config.globalDwellDuration ?? 1.5}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateConfig({ truthDashDwellDuration: val, globalDwellDuration: val });
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-5 gap-1 text-center mt-2">
                  {[1.0, 1.5, 2.5, 4.0, 6.0].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onUpdateConfig({ truthDashDwellDuration: sec, globalDwellDuration: sec })}
                      className={`py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                        Math.abs((config.truthDashDwellDuration ?? 1.5) - sec) < 0.1
                          ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Bebas mengatur durasi (bisa lebih dari 3 detik untuk diskusi kelas yang santai).
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-300 mb-1 block">Mode Partisipasi Murid</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onUpdateConfig({ truthDashMode: 'consensus' })}
                    className={`px-2.5 py-2 rounded-xl border text-xs flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      (config.truthDashMode || 'consensus') === 'consensus'
                        ? 'bg-purple-950 border-purple-400 text-purple-200 ring-1 ring-purple-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1">
                      <Users className="w-3 h-3 text-purple-400" />
                      <span>Konsensus</span>
                    </span>
                    <span className="text-[9px] text-slate-400">Mayoritas Murid</span>
                  </button>

                  <button
                    onClick={() => onUpdateConfig({ truthDashMode: 'all_active' })}
                    className={`px-2.5 py-2 rounded-xl border text-xs flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      config.truthDashMode === 'all_active'
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1">
                      <Footprints className="w-3 h-3 text-cyan-400" />
                      <span>Semua Aktif</span>
                    </span>
                    <span className="text-[9px] text-slate-400">Deteksi P1–P6</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4.5: Gemini AI Integration */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-950 border border-cyan-500/30">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>Kunci Gemini API (Generator Soal AI)</span>
              </span>
              {customApiKey ? (
                <span className="text-[10px] text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/40">
                  Kustom: {geminiClient.getMaskedApiKey(customApiKey)}
                </span>
              ) : isGeminiServerConfigured ? (
                <span className="text-[10px] text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-500/40">
                  Server Aktif (.env)
                </span>
              ) : (
                <span className="text-[10px] text-amber-300 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-500/40">
                  Belum Diatur
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Masukkan kunci API Gemini pribadi Anda untuk menghasilkan butir soal otomatis untuk SD Kelas 1–6.
            </p>

            <div className="relative flex items-center">
              <input
                type={showKeyPlaintext ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Masukkan AIzaSy..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2 pr-16 text-slate-100 text-xs font-mono placeholder-slate-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKeyPlaintext((v) => !v)}
                className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-200"
              >
                {showKeyPlaintext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={isTestingKey}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingKey ? 'animate-spin' : ''}`} />
                  <span>{isTestingKey ? 'Menguji...' : 'Uji Kunci'}</span>
                </button>
                {customApiKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-950/70 text-red-300 border border-red-800/50 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1"
              >
                <span>Dapatkan Kunci di AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {saveFeedback && (
              <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>{saveFeedback}</span>
              </div>
            )}

            {testFeedback && (
              <div
                className={`p-2 rounded-xl text-xs flex items-center gap-2 border ${
                  testFeedback.success
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-red-950/60 border-red-500/50 text-red-300'
                }`}
              >
                {testFeedback.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                )}
                <span>{testFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Section 5: Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <span className="text-xs text-slate-300">Tampilkan Pembahasan Setiap Soal</span>
              <input
                type="checkbox"
                checked={config.showExplanationAfterAnswer}
                onChange={(e) => onUpdateConfig({ showExplanationAfterAnswer: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <span className="text-xs text-slate-300">Salah Menjawab Kurangi Nyawa</span>
              <input
                type="checkbox"
                checked={config.costLifeOnWrong}
                onChange={(e) => onUpdateConfig({ costLifeOnWrong: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <span className="text-xs text-slate-300">Efek Suara Sintetis (Web Audio)</span>
              <input
                type="checkbox"
                checked={config.enableSound}
                onChange={(e) => onUpdateConfig({ enableSound: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <span className="text-xs text-slate-300">Bahasa Antarmuka</span>
              <select
                value={language}
                onChange={(e) => onUpdateLanguage(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs"
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={() => {
              audioService.playButtonClick();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs cursor-pointer"
          >
            Selesai & Terapkan
          </button>
        </div>
      </div>
    </div>
  );
};
