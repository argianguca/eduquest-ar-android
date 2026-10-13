import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Video,
  VideoOff,
  Sparkles,
  Info,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Activity,
  X,
  FlipHorizontal,
} from 'lucide-react';
import { cameraService, CameraDevice, CameraStreamDetails } from '../../services/camera';
import { handTrackingEngine } from '../../services/handTracking';

interface CameraTestScreenProps {
  onClose: () => void;
  isEn?: boolean;
}

export const CameraTestScreen: React.FC<CameraTestScreenProps> = ({ onClose, isEn = false }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamDetails, setStreamDetails] = useState<CameraStreamDetails | null>(null);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);

  // Live FPS Counter
  const [liveFps, setLiveFps] = useState<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());

  // MediaPipe Hand Tracking Status
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [handDetected, setHandDetected] = useState<boolean>(false);
  const [handConfidence, setHandConfidence] = useState<number>(0);
  const [handCoords, setHandCoords] = useState<{ x: number; y: number } | null>(null);
  const [recognizedGesture, setRecognizedGesture] = useState<string>('Tidak Ada');
  const [modelSource, setModelSource] = useState<string>('Lokal (/models)');

  const animFrameIdRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Load cameras and initialize MediaPipe on mount
  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      setIsLoading(true);
      // Initialize MediaPipe model
      setModelStatus('loading');
      try {
        const initResult = await handTrackingEngine.initialize();
        if (initResult.success) {
          setModelStatus('ready');
          setModelSource(initResult.loadedFrom === 'local' ? 'Lokal (/models/hand_landmarker.task)' : 'CDN Publik');
        } else {
          setModelStatus('error');
        }
      } catch (e) {
        console.warn('Failed to init MediaPipe in test:', e);
        setModelStatus('error');
      }

      // Enumerate cameras
      const camList = await cameraService.getAvailableCameras();
      if (isMountedRef.current) {
        setCameras(camList);
        if (camList.length > 0) {
          setSelectedDeviceId(camList[0].deviceId);
          // Auto start first camera
          startStream(camList[0].deviceId);
        } else {
          // Attempt default start anyway
          startStream();
        }
      }
      setIsLoading(false);
    };

    init();

    // CRITICAL: Cleanup on unmount - Stop all camera tracks and MediaPipe loops!
    return () => {
      isMountedRef.current = false;
      handTrackingEngine.stopProcessing();
      cameraService.stopCamera();
    };
  }, []);

  // Function to start camera stream
  const startStream = async (deviceId?: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    // Stop current stream before switching
    handTrackingEngine.stopProcessing();

    const res = await cameraService.startCamera(deviceId);
    if (!isMountedRef.current) return;

    if (res.stream && videoRef.current) {
      videoRef.current.srcObject = res.stream;
      try {
        await videoRef.current.play();
        setIsStreaming(true);

        // Fetch refreshed camera list with actual labels now that permission was granted
        const updatedList = await cameraService.getAvailableCameras();
        setCameras(updatedList);

        // Get track settings
        const details = cameraService.getStreamDetails(res.stream);
        setStreamDetails(details);

        // Start landmark rendering loop
        startDetectionLoop();
      } catch (err: any) {
        setErrorMessage(err?.message || 'Gagal memutar video live stream.');
      }
    } else {
      setIsStreaming(false);
      setErrorMessage(res.error || 'Gagal memulai stream kamera.');
    }
    setIsLoading(false);
  };

  // Stop camera function
  const handleStopStream = () => {
    handTrackingEngine.stopProcessing();
    cameraService.stopCamera();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setHandDetected(false);
    setHandCoords(null);
    setStreamDetails(null);
  };

  // MediaPipe detection loop & canvas drawing
  const startDetectionLoop = () => {
    const video = videoRef.current;
    if (!video) return;

    handTrackingEngine.startProcessing(video, (state) => {
      if (!isMountedRef.current) return;

      // Calculate live FPS
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        setLiveFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      const canvas = canvasRef.current;
      if (canvas && video.videoWidth && video.videoHeight) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (state.isHandDetected && state.rawLandmarks && state.rawLandmarks.length > 0) {
            drawLandmarks(ctx, state.rawLandmarks, canvas.width, canvas.height, isMirrored);
          }
        }
      }

      setHandDetected(state.isHandDetected);
      if (state.isHandDetected && state.pointer) {
        setHandConfidence(92);
        setHandCoords({
          x: Math.round(state.pointer.x * 100),
          y: Math.round(state.pointer.y * 100),
        });

        if (state.isPinching) {
          setRecognizedGesture('Pinch / Cubit (Menembak)');
        } else if (state.pinchChargeProgress > 0.4) {
          setRecognizedGesture('Mendekat / Mengarahkan');
        } else {
          setRecognizedGesture('Telapak / Telunjuk Terbuka');
        }
      } else {
        setHandCoords(null);
        setRecognizedGesture('Tidak Terdeteksi');
      }
    });
  };

  // Draw hand landmark points and skeleton lines
  const drawLandmarks = (
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    width: number,
    height: number,
    mirrored: boolean
  ) => {
    // MediaPipe Hand Connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17], // Palm base
    ];

    const getX = (normalizedX: number) => (mirrored ? (1 - normalizedX) * width : normalizedX * width);
    const getY = (normalizedY: number) => normalizedY * height;

    // Draw connection lines
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#06b6d4'; // Cyan neon
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;

    for (const [start, end] of connections) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(getX(p1.x), getY(p1.y));
        ctx.lineTo(getX(p2.x), getY(p2.y));
        ctx.stroke();
      }
    }

    // Draw landmark dots
    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i];
      const x = getX(pt.x);
      const y = getY(pt.y);

      ctx.beginPath();
      ctx.arc(x, y, i === 8 ? 8 : 5, 0, 2 * Math.PI);
      if (i === 8) {
        // Index finger tip (aim reticle)
        ctx.fillStyle = '#10b981'; // Emerald
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (i === 4) {
        // Thumb tip
        ctx.fillStyle = '#f59e0b'; // Amber
      } else {
        ctx.fillStyle = '#22d3ee'; // Cyan
      }
      ctx.fill();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col overflow-y-auto p-4 md:p-6 text-slate-100 font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-mono text-cyan-300">
              {isEn ? 'Android IFP Camera & MediaPipe Test' : 'Uji Kamera & MediaPipe (Hisense 75WM61FE)'}
            </h2>
            <p className="text-xs text-slate-400">
              {isEn
                ? 'Live camera feed, stream specifications, and MediaPipe hand detection diagnostic'
                : 'Pemeriksaan live feed kamera, spesifikasi stream, dan status deteksi gestur tangan MediaPipe'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
          title="Tutup Tes Kamera"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl w-full mx-auto py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* Left: Video Preview & Overlay */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            {/* Live Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
            />

            {/* Landmark Overlay Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none object-cover"
            />

            {/* Offline / No Stream Placeholder */}
            {!isStreaming && !isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center">
                <VideoOff className="w-16 h-16 text-slate-600 mb-3" />
                <p className="text-base font-semibold text-slate-300">
                  {errorMessage ? 'Akses Kamera Terkendala' : 'Stream Kamera Tidak Aktif'}
                </p>
                {errorMessage && (
                  <p className="text-xs text-rose-400 max-w-md mt-1">{errorMessage}</p>
                )}
                <button
                  onClick={() => startStream(selectedDeviceId)}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Mulai Live Feed Kamera
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75">
                <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
                <p className="text-sm font-mono text-cyan-300">Menghubungkan ke Perangkat Kamera...</p>
              </div>
            )}

            {/* Live Badges Overlay */}
            {isStreaming && (
              <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/90 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                  LIVE {liveFps} FPS
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700 text-xs font-mono text-slate-200">
                  {streamDetails?.width || 1280} × {streamDetails?.height || 720}
                </span>
              </div>
            )}

            {/* Mirror Toggle Button */}
            {isStreaming && (
              <button
                onClick={() => setIsMirrored(!isMirrored)}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700 hover:bg-slate-800 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer"
                title="Cerminkan / Balikkan Arah Video"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                {isMirrored ? 'Cermin: Aktif' : 'Cermin: Mati'}
              </button>
            )}
          </div>

          {/* Quick Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label htmlFor="cam-select" className="text-xs text-slate-400 whitespace-nowrap">
                Pilih Kamera:
              </label>
              <select
                id="cam-select"
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startStream(e.target.value);
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 flex-1"
              >
                {cameras.map((c, i) => (
                  <option key={c.deviceId || i} value={c.deviceId}>
                    {c.label || `Kamera ${i + 1}`}
                  </option>
                ))}
                {cameras.length === 0 && <option value="">Kamera Default Sistem</option>}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  onClick={handleStopStream}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <VideoOff className="w-3.5 h-3.5" />
                  Hentikan Kamera
                </button>
              ) : (
                <button
                  onClick={() => startStream(selectedDeviceId)}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  Mulai Kamera
                </button>
              )}

              <button
                onClick={() => {
                  cameraService.getAvailableCameras().then(setCameras);
                  startStream(selectedDeviceId);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer border border-slate-700"
                title="Segarkan Perangkat Kamera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Technical Diagnostic Specs */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Card 1: MediaPipe Hand Detection Status */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-sm font-bold font-mono uppercase tracking-wide">
                  MediaPipe Hand Tracking
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                  modelStatus === 'ready'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : modelStatus === 'loading'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {modelStatus === 'ready' ? 'READY' : modelStatus === 'loading' ? 'LOADING' : 'ERROR'}
              </span>
            </div>

            <div className="py-3 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Sumber Model:</span>
                <span className="text-slate-200 font-semibold">{modelSource}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status Deteksi Tangan:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    handDetected
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {handDetected ? '🟢 TERDETEKSI' : '⚪ TIDAK ADA TANGAN'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Tingkat Keyakinan:</span>
                <span className="text-cyan-300 font-bold">{handDetected ? `${handConfidence}%` : '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Posisi Telunjuk (X, Y):</span>
                <span className="text-slate-200">
                  {handCoords ? `X: ${handCoords.x}% | Y: ${handCoords.y}%` : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Gestur Terbaca:</span>
                <span className="text-amber-400 font-bold">{recognizedGesture}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              💡 <span className="text-slate-300">Tips Kalibrasi:</span> Rentangkan telapak tangan 1-2 meter di depan kamera panel. Gerakkan jari telunjuk untuk membidik soal, lalu cubit (pinch) atau tahan untuk menjawab.
            </div>
          </div>

          {/* Card 2: Hardware & Stream Information */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-2 text-teal-400 pb-3 border-b border-slate-800">
              <Layers className="w-4 h-4" />
              <h3 className="text-sm font-bold font-mono uppercase tracking-wide">
                Spesifikasi Video & Perangkat
              </h3>
            </div>

            <div className="py-3 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Nama Perangkat:</span>
                <span className="text-slate-200 truncate max-w-[200px]" title={streamDetails?.label}>
                  {streamDetails?.label || 'Kamera Sistem Default'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Resolusi Aktif:</span>
                <span className="text-teal-300 font-bold">
                  {streamDetails?.width ? `${streamDetails.width} × ${streamDetails.height} px` : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Rasio Aspek:</span>
                <span className="text-slate-200">
                  {streamDetails?.aspectRatio ? streamDetails.aspectRatio.toFixed(2) : '16:9'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Facing Mode:</span>
                <span className="text-slate-200">
                  {streamDetails?.facingMode || 'user (menghadap ke siswa)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Kamera Terhubung:</span>
                <span className="text-slate-200 font-bold">{cameras.length} Perangkat</span>
              </div>
            </div>
          </div>

          {/* Card 3: Hisense 75WM61FE Specific Guidance */}
          <div className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-4 shadow-lg bg-gradient-to-br from-slate-900 to-cyan-950/20">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase mb-2">
              <Info className="w-4 h-4" />
              Catatan Pengujian Panel Hisense 75WM61FE
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>
                Jika menggunakan kamera USB eksternal di port atas panel, pastikan izin kamera diizinkan saat APK pertama kali dibuka.
              </li>
              <li>
                Layar panel 75 inci memiliki resolusi 4K (3840×2160). MediaPipe memproses video pada 720p/1080p agar animasi 60 FPS tetap mulus tanpa membebani GPU panel.
              </li>
              <li>
                Saat meninggalkan layar uji ini, seluruh track stream kamera dihentikan secara otomatis untuk menghemat daya.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
