import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export interface HandPoint {
  x: number; // 0 to 1 normalized, mirrored
  y: number; // 0 to 1 normalized
  screenX: number; // in pixels
  screenY: number; // in pixels
}

export interface HandTrackingState {
  isReady: boolean;
  isHandDetected: boolean;
  pointer: HandPoint | null;
  thumb: HandPoint | null;
  pinchDistanceNormalized: number;
  pinchChargeProgress: number; // 0 to 1 (0 = open, 1 = touching)
  isPinching: boolean;
  isPinchTriggered: boolean; // true for single frame when pinch starts
  handedness: string;
  palmSize: number;
  rawLandmarks?: any[];
  error: string | null;
}

export type TrackingCallback = (state: HandTrackingState) => void;

class HandTrackingEngine {
  private handLandmarker: HandLandmarker | null = null;
  private isInitializing = false;
  private animationFrameId: number | null = null;
  private videoElement: HTMLVideoElement | null = null;

  // Smoothing state
  private smoothedX = 0.5;
  private smoothedY = 0.5;
  private hasPreviousPoint = false;

  // Pinch trigger state
  private wasPinching = false;
  private lastTriggerTime = 0;
  private pinchCooldownMs = 450; // debounce cooldown

  // Configurable thresholds
  private pinchThreshold = 0.48; // normalized distance below which is considered pinch
  private smoothingFactor = 0.65; // 0.1 (rapid) to 0.9 (heavy smoothing)

  public updateConfig(pinchThreshold?: number, smoothingFactor?: number) {
    if (pinchThreshold !== undefined) this.pinchThreshold = pinchThreshold;
    if (smoothingFactor !== undefined) this.smoothingFactor = smoothingFactor;
  }

  public async initialize(): Promise<{ success: boolean; error: string | null; loadedFrom: 'local' | 'cdn' | null }> {
    if (this.handLandmarker) {
      return { success: true, error: null, loadedFrom: 'local' };
    }
    if (this.isInitializing) {
      return { success: false, error: 'Sedang memuat model...', loadedFrom: null };
    }

    this.isInitializing = true;

    // First attempt: Local offline bundle
    try {
      const vision = await FilesetResolver.forVisionTasks('/wasm');
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.isInitializing = false;
      return { success: true, error: null, loadedFrom: 'local' };
    } catch (localErr) {
      console.warn('Gagal memuat MediaPipe lokal, mencoba CDN publik...', localErr);
      // Fallback: CDN
      try {
        const cdnVision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        this.handLandmarker = await HandLandmarker.createFromOptions(cdnVision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        this.isInitializing = false;
        return { success: true, error: null, loadedFrom: 'cdn' };
      } catch (cdnErr: any) {
        this.isInitializing = false;
        console.error('Semua pemuatan MediaPipe gagal:', cdnErr);
        return {
          success: false,
          error: 'Gagal memuat modul Hand Landmarker. Periksa koneksi atau beralih ke Mode Sentuh/Mouse.',
          loadedFrom: null,
        };
      }
    }
  }

  public startProcessing(video: HTMLVideoElement, onUpdate: TrackingCallback) {
    this.stopProcessing();
    this.videoElement = video;
    this.hasPreviousPoint = false;
    this.wasPinching = false;

    let lastVideoTime = -1;

    const processFrame = () => {
      if (!this.videoElement || !this.handLandmarker) return;

      if (
        this.videoElement.readyState >= 2 &&
        this.videoElement.currentTime !== lastVideoTime &&
        !this.videoElement.paused &&
        !this.videoElement.ended
      ) {
        lastVideoTime = this.videoElement.currentTime;
        const startTimeMs = performance.now();

        try {
          const results = this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);

          if (results && results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const handedness =
              results.handedness && results.handedness[0] && results.handedness[0][0]
                ? results.handedness[0][0].displayName
                : 'Hand';

            // Landmark 8: Index fingertip
            const rawIndex = landmarks[8];
            // Landmark 4: Thumb tip
            const rawThumb = landmarks[4];
            // Landmark 0: Wrist
            const rawWrist = landmarks[0];
            // Landmark 9: Middle finger MCP
            const rawMiddleMCP = landmarks[9];

            // Mirrored horizontal coordinates for front-facing webcam display
            const mirroredIndexX = 1.0 - rawIndex.x;
            const mirroredThumbX = 1.0 - rawThumb.x;

            // Apply Exponential Moving Average (EMA) smoothing to index fingertip
            if (!this.hasPreviousPoint) {
              this.smoothedX = mirroredIndexX;
              this.smoothedY = rawIndex.y;
              this.hasPreviousPoint = true;
            } else {
              const alpha = Math.max(0.1, Math.min(0.9, this.smoothingFactor));
              this.smoothedX = this.smoothedX * alpha + mirroredIndexX * (1 - alpha);
              this.smoothedY = this.smoothedY * alpha + rawIndex.y * (1 - alpha);
            }

            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;

            const pointerPoint: HandPoint = {
              x: this.smoothedX,
              y: this.smoothedY,
              screenX: Math.round(this.smoothedX * screenWidth),
              screenY: Math.round(this.smoothedY * screenHeight),
            };

            const thumbPoint: HandPoint = {
              x: mirroredThumbX,
              y: rawThumb.y,
              screenX: Math.round(mirroredThumbX * screenWidth),
              screenY: Math.round(rawThumb.y * screenHeight),
            };

            // Calculate palm reference scale (distance between wrist & middle MCP)
            const palmDist = Math.hypot(
              rawMiddleMCP.x - rawWrist.x,
              rawMiddleMCP.y - rawWrist.y,
              (rawMiddleMCP.z || 0) - (rawWrist.z || 0)
            );
            const palmSize = Math.max(0.04, palmDist);

            // Euclidean distance between thumb tip and index tip in 3D
            const tipDist = Math.hypot(
              rawIndex.x - rawThumb.x,
              rawIndex.y - rawThumb.y,
              (rawIndex.z || 0) - (rawThumb.z || 0)
            );

            // Normalized pinch distance relative to palm size
            const pinchDistanceNormalized = tipDist / palmSize;

            // Pinch charge progress: 0 when far apart, 1 when pinched
            // Far apart is ~1.1 * palmSize, fully closed is ~0.45 * palmSize
            const maxOpenDist = 1.1;
            const closedDist = this.pinchThreshold;
            const chargeProgress = Math.max(
              0,
              Math.min(1, (maxOpenDist - pinchDistanceNormalized) / (maxOpenDist - closedDist))
            );

            const isCurrentlyPinching = pinchDistanceNormalized <= this.pinchThreshold;
            const now = performance.now();
            let isPinchTriggered = false;

            // Edge trigger: new pinch begins and cooldown has elapsed
            if (isCurrentlyPinching && !this.wasPinching) {
              if (now - this.lastTriggerTime > this.pinchCooldownMs) {
                isPinchTriggered = true;
                this.lastTriggerTime = now;
              }
            }
            this.wasPinching = isCurrentlyPinching;

            onUpdate({
              isReady: true,
              isHandDetected: true,
              pointer: pointerPoint,
              thumb: thumbPoint,
              pinchDistanceNormalized,
              pinchChargeProgress: chargeProgress,
              isPinching: isCurrentlyPinching,
              isPinchTriggered,
              handedness,
              palmSize,
              rawLandmarks: landmarks,
              error: null,
            });
          } else {
            // Hand lost
            this.hasPreviousPoint = false;
            this.wasPinching = false;
            onUpdate({
              isReady: true,
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
          }
        } catch (err: any) {
          console.warn('Frame processing glitch:', err);
        }
      }

      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    this.animationFrameId = requestAnimationFrame(processFrame);
  }

  public stopProcessing() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.videoElement = null;
    this.hasPreviousPoint = false;
    this.wasPinching = false;
  }

  public isModelReady(): boolean {
    return !!this.handLandmarker;
  }

  public destroy() {
    this.stopProcessing();
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
  }
}

export const handTrackingEngine = new HandTrackingEngine();
