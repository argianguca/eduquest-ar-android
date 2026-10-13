import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export interface CatchHand {
  id: string; // 'left_side' or 'right_side' or 'hand_0'
  team: 'teamA' | 'teamB' | 'neutral'; // teamA is left half (< 0.48), teamB is right half (> 0.52)
  x: number; // 0 to 1 normalized (mirrored)
  y: number; // 0 to 1 normalized
  screenX: number;
  screenY: number;
  radius: number; // collision radius in pixels
}

export interface DualHandTrackingState {
  isReady: boolean;
  hands: CatchHand[];
  error: string | null;
}

export type DualHandCallback = (state: DualHandTrackingState) => void;

class CatchTrackingEngine {
  private handLandmarker: HandLandmarker | null = null;
  private isInitializing = false;
  private animationFrameId: number | null = null;
  private videoElement: HTMLVideoElement | null = null;

  // Smoothing states per hand index
  private smoothedHands: Map<number, { x: number; y: number }> = new Map();
  private smoothingAlpha = 0.6;

  public async initialize(): Promise<{ success: boolean; error: string | null }> {
    if (this.handLandmarker) {
      return { success: true, error: null };
    }
    if (this.isInitializing) {
      return { success: false, error: 'Sedang menginisialisasi pelacak tangan tim...' };
    }

    this.isInitializing = true;

    try {
      const vision = await FilesetResolver.forVisionTasks('/wasm');
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2, // Enable two hands for simultaneous two-team catching!
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.isInitializing = false;
      return { success: true, error: null };
    } catch (localErr) {
      console.warn('Gagal memuat HandLandmarker lokal untuk dua tangan, mencoba CDN...', localErr);
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
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        this.isInitializing = false;
        return { success: true, error: null };
      } catch (cdnErr: any) {
        this.isInitializing = false;
        return { success: false, error: 'Gagal memuat modul Hand Landmarker dua tangan.' };
      }
    }
  }

  public startProcessing(video: HTMLVideoElement, onUpdate: DualHandCallback) {
    this.stopProcessing();
    this.videoElement = video;
    this.smoothedHands.clear();

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

          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;
          const detectedHands: CatchHand[] = [];

          if (results && results.landmarks && results.landmarks.length > 0) {
            results.landmarks.forEach((landmarks, idx) => {
              // Calculate palm center: average of wrist (0), MCPs (5, 9, 13, 17)
              const wrist = landmarks[0];
              const indexMCP = landmarks[5];
              const middleMCP = landmarks[9];
              const ringMCP = landmarks[13];
              const pinkyMCP = landmarks[17];

              const palmX =
                (wrist.x + indexMCP.x + middleMCP.x + ringMCP.x + pinkyMCP.x) / 5;
              const palmY =
                (wrist.y + indexMCP.y + middleMCP.y + ringMCP.y + pinkyMCP.y) / 5;

              // Mirrored horizontal coordinates
              const mirroredX = 1.0 - palmX;
              const rawY = palmY;

              // Smooth with EMA
              let currentSmooth = this.smoothedHands.get(idx);
              if (!currentSmooth) {
                currentSmooth = { x: mirroredX, y: rawY };
                this.smoothedHands.set(idx, currentSmooth);
              } else {
                const a = this.smoothingAlpha;
                currentSmooth.x = currentSmooth.x * a + mirroredX * (1 - a);
                currentSmooth.y = currentSmooth.y * a + rawY * (1 - a);
              }

              // Determine Team ownership based on horizontal arena split:
              // Team A (Left arena): 0.00 to 0.48
              // Dead boundary zone: 0.48 to 0.52 (cannot catch for either to prevent dispute)
              // Team B (Right arena): 0.52 to 1.00
              let team: 'teamA' | 'teamB' | 'neutral' = 'neutral';
              if (currentSmooth.x < 0.48) {
                team = 'teamA';
              } else if (currentSmooth.x > 0.52) {
                team = 'teamB';
              }

              detectedHands.push({
                id: `hand_${idx}`,
                team,
                x: currentSmooth.x,
                y: currentSmooth.y,
                screenX: Math.round(currentSmooth.x * screenWidth),
                screenY: Math.round(currentSmooth.y * screenHeight),
                radius: 45, // 45px collision hit sphere around palm
              });
            });
          }

          onUpdate({
            isReady: true,
            hands: detectedHands,
            error: null,
          });
        } catch (err: any) {
          console.warn('Catch processing glitch:', err);
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
    this.smoothedHands.clear();
  }

  public destroy() {
    this.stopProcessing();
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
  }
}

export const catchTrackingEngine = new CatchTrackingEngine();
