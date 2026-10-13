import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';

export type BodyZone = 'left' | 'neutral' | 'right';

export interface DetectedStudent {
  id: string; // 'P1', 'P2', 'P3', ...
  index: number;
  label: string; // 'Murid 1', 'Murid 2', ...
  color: string; // Hex color for neon graphics
  colorName: string;
  rawX: number;
  rawY: number;
  smoothedX: number;
  smoothedY: number;
  zone: BodyZone;
  dwellProgress: number;
  isLocked: boolean;
  lockedZone: BodyZone | null;
}

export interface PoseTrackingState {
  isReady: boolean;
  isBodyDetected: boolean;
  /** Primary / leader center X (0 to 1, mirrored: 0 is left, 1 is right) */
  bodyCenterX: number;
  /** Primary / leader center Y (0 to 1) */
  bodyCenterY: number;
  /** Current zone based on horizontal position (or consensus zone) */
  zone: BodyZone;
  /** Zone progress / dwell progress (0 to 1) towards locking answer */
  dwellProgress: number;
  confidence: number;
  error: string | null;

  // Multi-Student properties
  students: DetectedStudent[];
  studentCount: number;
  leftCount: number;
  rightCount: number;
  neutralCount: number;
  consensusZone: BodyZone | null;
  consensusRatio: number; // 0.0 to 1.0
}

export type PoseTrackingCallback = (state: PoseTrackingState) => void;

interface TrackedStudentInternal {
  id: string;
  index: number;
  label: string;
  color: string;
  colorName: string;
  smoothedX: number;
  smoothedY: number;
  rawX: number;
  rawY: number;
  zone: BodyZone;
  dwellEnterTime: number;
  dwellProgress: number;
  isLocked: boolean;
  lockedZone: BodyZone | null;
  lastSeenMs: number;
}

const STUDENT_PALETTE = [
  { id: 'P1', label: 'Murid 1', color: '#06b6d4', colorName: 'cyan' },
  { id: 'P2', label: 'Murid 2', color: '#f43f5e', colorName: 'pink' },
  { id: 'P3', label: 'Murid 3', color: '#f59e0b', colorName: 'amber' },
  { id: 'P4', label: 'Murid 4', color: '#10b981', colorName: 'emerald' },
  { id: 'P5', label: 'Murid 5', color: '#a855f7', colorName: 'violet' },
  { id: 'P6', label: 'Murid 6', color: '#3b82f6', colorName: 'blue' },
];

class PoseTrackingEngine {
  private poseLandmarker: PoseLandmarker | null = null;
  private isInitializing = false;
  private animationFrameId: number | null = null;
  private videoElement: HTMLVideoElement | null = null;

  // Smoothing
  private smoothingAlpha = 0.6; // EMA factor: 0.1 rapid, 0.9 heavy smooth

  // Zone thresholds
  // 0.0 to leftThreshold = LEFT zone (SALAH)
  // leftThreshold to rightThreshold = NEUTRAL dead zone
  // rightThreshold to 1.0 = RIGHT zone (BENAR)
  private leftThreshold = 0.40;
  private rightThreshold = 0.60;

  // Dwell state (default 1.5 seconds / 1500ms as requested)
  private dwellRequiredMs = 1500;

  // Multi-student tracking map
  private trackedStudents = new Map<string, TrackedStudentInternal>();

  public setDwellDuration(seconds: number) {
    const clamped = Math.max(0.3, Math.min(30.0, seconds));
    this.dwellRequiredMs = Math.round(clamped * 1000);
  }

  public getDwellDuration(): number {
    return this.dwellRequiredMs / 1000;
  }

  public updateConfig(smoothing?: number, dwellMs?: number) {
    if (smoothing !== undefined) this.smoothingAlpha = smoothing;
    if (dwellMs !== undefined) this.dwellRequiredMs = dwellMs;
  }

  public async initialize(): Promise<{ success: boolean; error: string | null; loadedFrom: 'local' | 'cdn' | null }> {
    if (this.poseLandmarker) {
      return { success: true, error: null, loadedFrom: 'local' };
    }
    if (this.isInitializing) {
      return { success: false, error: 'Sedang menginisialisasi pose tracking...', loadedFrom: null };
    }

    this.isInitializing = true;

    // 1. Try local offline model and wasm (numPoses: 6 for multi-student simultaneous tracking)
    try {
      const vision = await FilesetResolver.forVisionTasks('/wasm');
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 6,
        minPoseDetectionConfidence: 0.45,
        minPosePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      });

      this.isInitializing = false;
      return { success: true, error: null, loadedFrom: 'local' };
    } catch (localErr) {
      console.warn('Gagal memuat Pose Landmarker lokal, mencoba fallback CDN...', localErr);

      // 2. Fallback to CDN
      try {
        const cdnVision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        this.poseLandmarker = await PoseLandmarker.createFromOptions(cdnVision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 6,
          minPoseDetectionConfidence: 0.45,
          minPosePresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });

        this.isInitializing = false;
        return { success: true, error: null, loadedFrom: 'cdn' };
      } catch (cdnErr: any) {
        this.isInitializing = false;
        console.error('Semua pemuatan Pose Landmarker gagal:', cdnErr);
        return {
          success: false,
          error: 'Gagal memuat modul Pose Landmarker. Gunakan mode Sentuh / Keyboard.',
          loadedFrom: null,
        };
      }
    }
  }

  public startProcessing(video: HTMLVideoElement, onUpdate: PoseTrackingCallback) {
    this.stopProcessing();
    this.videoElement = video;
    this.trackedStudents.clear();

    let lastVideoTime = -1;

    const processFrame = () => {
      if (!this.videoElement || !this.poseLandmarker) return;

      if (
        this.videoElement.readyState >= 2 &&
        this.videoElement.currentTime !== lastVideoTime &&
        !this.videoElement.paused &&
        !this.videoElement.ended
      ) {
        lastVideoTime = this.videoElement.currentTime;
        const now = performance.now();

        try {
          const results: PoseLandmarkerResult = this.poseLandmarker.detectForVideo(
            this.videoElement,
            now
          );

          // Extract raw positions for all detected poses
          const detectedPoses: { rawX: number; rawY: number }[] = [];

          if (results && results.landmarks && results.landmarks.length > 0) {
            for (const lm of results.landmarks) {
              const leftShoulder = lm[11];
              const rightShoulder = lm[12];
              const leftHip = lm[23];
              const rightHip = lm[24];
              const nose = lm[0];

              let sumX = 0;
              let sumY = 0;
              let validCount = 0;

              if (leftShoulder && rightShoulder) {
                sumX += (leftShoulder.x + rightShoulder.x) / 2;
                sumY += (leftShoulder.y + rightShoulder.y) / 2;
                validCount++;
              }
              if (leftHip && rightHip) {
                sumX += (leftHip.x + rightHip.x) / 2;
                sumY += (leftHip.y + rightHip.y) / 2;
                validCount++;
              }

              let posX = 0.5;
              let posY = 0.5;

              if (validCount > 0) {
                posX = sumX / validCount;
                posY = sumY / validCount;
              } else if (nose) {
                posX = nose.x;
                posY = nose.y;
              }

              // Mirror horizontally because front webcam view is mirrored
              const mirroredX = Math.max(0, Math.min(1, 1.0 - posX));
              const clampedY = Math.max(0, Math.min(1, posY));

              detectedPoses.push({ rawX: mirroredX, rawY: clampedY });
            }
          }

          // Stable tracking association: Match detected poses with existing tracked students
          const matchedIds = new Set<string>();
          const unmatchedDetected = [...detectedPoses];

          // 1. Try to associate with existing active students within distance threshold
          this.trackedStudents.forEach((student, id) => {
            let bestIdx = -1;
            let bestDist = 0.35; // Maximum distance threshold for matching same student

            for (let i = 0; i < unmatchedDetected.length; i++) {
              const det = unmatchedDetected[i];
              if (!det) continue;
              const dx = det.rawX - student.smoothedX;
              const dy = det.rawY - student.smoothedY;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
              }
            }

            if (bestIdx !== -1) {
              const det = unmatchedDetected[bestIdx];
              unmatchedDetected.splice(bestIdx, 1);
              matchedIds.add(id);

              // Update EMA smoothed position
              const a = this.smoothingAlpha;
              student.smoothedX = student.smoothedX * a + det.rawX * (1 - a);
              student.smoothedY = student.smoothedY * a + det.rawY * (1 - a);
              student.rawX = det.rawX;
              student.rawY = det.rawY;
              student.lastSeenMs = now;

              // Zone determination
              let detectedZone: BodyZone = 'neutral';
              if (student.smoothedX <= this.leftThreshold) {
                detectedZone = 'left';
              } else if (student.smoothedX >= this.rightThreshold) {
                detectedZone = 'right';
              } else {
                detectedZone = 'neutral';
              }

              // Update student dwell
              if (detectedZone !== student.zone) {
                student.zone = detectedZone;
                student.dwellEnterTime = now;
                student.dwellProgress = 0;
                student.isLocked = false;
                student.lockedZone = null;
              } else if (student.zone !== 'neutral') {
                const elapsed = now - student.dwellEnterTime;
                student.dwellProgress = Math.min(1, elapsed / this.dwellRequiredMs);
                if (student.dwellProgress >= 1) {
                  student.isLocked = true;
                  student.lockedZone = student.zone;
                }
              } else {
                student.dwellProgress = 0;
                student.isLocked = false;
                student.lockedZone = null;
              }
            }
          });

          // 2. Remove students not seen for > 600ms
          const pruneIds: string[] = [];
          this.trackedStudents.forEach((student, id) => {
            if (!matchedIds.has(id)) {
              if (now - student.lastSeenMs > 600) {
                pruneIds.push(id);
              }
            }
          });
          pruneIds.forEach((id) => this.trackedStudents.delete(id));

          // 3. For any remaining unmatched detections, assign a new student slot (up to 6)
          for (const det of unmatchedDetected) {
            // Find lowest available index
            let freeSlot: (typeof STUDENT_PALETTE)[0] | undefined;
            for (let i = 0; i < STUDENT_PALETTE.length; i++) {
              const candidate = STUDENT_PALETTE[i];
              if (!this.trackedStudents.has(candidate.id)) {
                freeSlot = candidate;
                break;
              }
            }

            if (freeSlot) {
              let initialZone: BodyZone = 'neutral';
              if (det.rawX <= this.leftThreshold) {
                initialZone = 'left';
              } else if (det.rawX >= this.rightThreshold) {
                initialZone = 'right';
              }

              const newStudent: TrackedStudentInternal = {
                id: freeSlot.id,
                index: STUDENT_PALETTE.indexOf(freeSlot) + 1,
                label: freeSlot.label,
                color: freeSlot.color,
                colorName: freeSlot.colorName,
                smoothedX: det.rawX,
                smoothedY: det.rawY,
                rawX: det.rawX,
                rawY: det.rawY,
                zone: initialZone,
                dwellEnterTime: now,
                dwellProgress: 0,
                isLocked: false,
                lockedZone: null,
                lastSeenMs: now,
              };

              this.trackedStudents.set(freeSlot.id, newStudent);
            }
          }

          // Build public student list sorted by ID (P1, P2, ...)
          const studentList: DetectedStudent[] = Array.from(this.trackedStudents.values())
            .sort((a, b) => a.index - b.index)
            .map((s) => ({
              id: s.id,
              index: s.index,
              label: s.label,
              color: s.color,
              colorName: s.colorName,
              rawX: s.rawX,
              rawY: s.rawY,
              smoothedX: s.smoothedX,
              smoothedY: s.smoothedY,
              zone: s.zone,
              dwellProgress: s.dwellProgress,
              isLocked: s.isLocked,
              lockedZone: s.lockedZone,
            }));

          // Multi-student stats & consensus calculation
          let leftCount = 0;
          let rightCount = 0;
          let neutralCount = 0;

          studentList.forEach((s) => {
            if (s.zone === 'left') leftCount++;
            else if (s.zone === 'right') rightCount++;
            else neutralCount++;
          });

          const totalStudents = studentList.length;
          let consensusZone: BodyZone | null = null;
          let consensusRatio = 0;

          if (totalStudents > 0) {
            if (leftCount > rightCount) {
              consensusZone = 'left';
              consensusRatio = leftCount / totalStudents;
            } else if (rightCount > leftCount) {
              consensusZone = 'right';
              consensusRatio = rightCount / totalStudents;
            } else if (leftCount > 0 && leftCount === rightCount) {
              consensusZone = null; // Tied
              consensusRatio = leftCount / totalStudents;
            }
          }

          // Primary values (compatible with single player & legacy code)
          const primaryStudent = studentList[0];
          const isBodyDetected = totalStudents > 0;

          // Highest dwell progress among active students in the leading/consensus zone
          let leadDwellProgress = 0;
          if (consensusZone) {
            const studentsInConsensus = studentList.filter((s) => s.zone === consensusZone);
            if (studentsInConsensus.length > 0) {
              leadDwellProgress = Math.max(...studentsInConsensus.map((s) => s.dwellProgress));
            }
          } else if (primaryStudent && primaryStudent.zone !== 'neutral') {
            leadDwellProgress = primaryStudent.dwellProgress;
          }

          onUpdate({
            isReady: true,
            isBodyDetected,
            bodyCenterX: primaryStudent ? primaryStudent.smoothedX : 0.5,
            bodyCenterY: primaryStudent ? primaryStudent.smoothedY : 0.5,
            zone: consensusZone || (primaryStudent ? primaryStudent.zone : 'neutral'),
            dwellProgress: leadDwellProgress,
            confidence: isBodyDetected ? 0.9 : 0,
            error: null,
            students: studentList,
            studentCount: totalStudents,
            leftCount,
            rightCount,
            neutralCount,
            consensusZone,
            consensusRatio,
          });
        } catch (err: any) {
          console.warn('Pose processing error:', err);
        }
      }

      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    this.animationFrameId = requestAnimationFrame(processFrame);
  }

  public resetDwell() {
    const now = performance.now();
    this.trackedStudents.forEach((student) => {
      student.dwellEnterTime = now;
      student.dwellProgress = 0;
      student.isLocked = false;
      student.lockedZone = null;
    });
  }

  public stopProcessing() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.videoElement = null;
    this.trackedStudents.clear();
  }

  public isModelReady(): boolean {
    return !!this.poseLandmarker;
  }

  public destroy() {
    this.stopProcessing();
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }
  }
}

export const poseTrackingEngine = new PoseTrackingEngine();
