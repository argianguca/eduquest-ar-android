import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera } from '@capacitor/camera';

export interface CameraDevice {
  deviceId: string;
  label: string;
  groupId?: string;
}

export interface CameraStreamDetails {
  deviceId?: string;
  label?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  facingMode?: string;
  aspectRatio?: number;
}

class CameraService {
  private activeStream: MediaStream | null = null;

  /**
   * Request continuous camera permission.
   * Handles both Android native Capacitor permission dialog and browser getUserMedia permission.
   * Note: This requests permission for continuous live video stream, NOT photo capture.
   */
  public async requestCameraPermission(): Promise<{ granted: boolean; error: string | null }> {
    try {
      if (Capacitor.isNativePlatform()) {
        const check = await CapCamera.checkPermissions();
        if (check.camera !== 'granted') {
          const req = await CapCamera.requestPermissions({ permissions: ['camera'] });
          if (req.camera !== 'granted') {
            return {
              granted: false,
              error: 'Izin kamera ditolak di sistem Android. Buka Pengaturan > Aplikasi > EduQuest AR > Izin > Kamera, lalu pilih "Izinkan".',
            };
          }
        }
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          granted: false,
          error: 'Perangkat atau WebView ini tidak mendukung akses live video (getUserMedia).',
        };
      }

      return { granted: true, error: null };
    } catch (err: any) {
      console.warn('Error checking/requesting camera permission:', err);
      return { granted: false, error: err?.message || 'Gagal memeriksa izin kamera.' };
    }
  }

  /**
   * Enumerate all connected cameras (internal front/back or external USB webcams on IFP)
   */
  public async getAvailableCameras(): Promise<CameraDevice[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      // First ensure permissions have been prompted so device labels are visible
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      return videoDevices.map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Kamera ${index + 1}`,
        groupId: d.groupId,
      }));
    } catch (e) {
      console.warn('Gagal membaca daftar kamera:', e);
      return [];
    }
  }

  /**
   * Start continuous live camera feed for AR gesture tracking
   */
  public async startCamera(deviceId?: string): Promise<{ stream: MediaStream | null; error: string | null }> {
    this.stopCamera();

    // Check / prompt permissions first
    const perm = await this.requestCameraPermission();
    if (!perm.granted && perm.error) {
      return { stream: null, error: perm.error };
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        stream: null,
        error: 'Browser atau WebView ini tidak mendukung WebRTC camera stream (getUserMedia). Pastikan menggunakan Chromium / WebView terbaru.',
      };
    }

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: deviceId
        ? {
            deviceId: { exact: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          }
        : {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.activeStream = stream;
      return { stream, error: null };
    } catch (err: any) {
      console.error('Error opening camera stream:', err);
      let errorMsg = 'Tidak dapat mengakses live stream kamera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Izin kamera ditolak oleh pengguna atau sistem Android. Izinkan akses kamera agar deteksi gestur dapat bekerja.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'Tidak ada perangkat kamera / webcam yang terdeteksi di panel interaktif atau PC ini. Pastikan kamera USB terpasang dengan baik.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Kamera sedang sibuk atau digunakan oleh aplikasi lain di panel interaktif. Tutup aplikasi kamera lain lalu coba lagi.';
      } else if (err.name === 'OverconstrainedError') {
        // Fallback with minimal constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          this.activeStream = fallbackStream;
          return { stream: fallbackStream, error: null };
        } catch (fbErr: any) {
          errorMsg = `Kamera tidak mendukung resolusi yang diminta: ${err?.message || ''}`;
        }
      }
      return { stream: null, error: errorMsg };
    }
  }

  /**
   * Stop active camera stream and release all hardware locks
   */
  public stopCamera() {
    if (this.activeStream) {
      try {
        this.activeStream.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (err) {
        console.warn('Error stopping camera tracks:', err);
      }
      this.activeStream = null;
    }
  }

  /**
   * Inspect active stream details (resolution, actual frame rate, label)
   */
  public getStreamDetails(stream?: MediaStream | null): CameraStreamDetails | null {
    const s = stream || this.activeStream;
    if (!s) return null;

    const track = s.getVideoTracks()[0];
    if (!track) return null;

    const settings = track.getSettings();
    return {
      deviceId: settings.deviceId,
      label: track.label,
      width: settings.width,
      height: settings.height,
      frameRate: settings.frameRate,
      facingMode: settings.facingMode,
      aspectRatio: settings.aspectRatio,
    };
  }

  public isStreamActive(): boolean {
    return !!(this.activeStream && this.activeStream.active);
  }

  public getActiveStream(): MediaStream | null {
    return this.activeStream;
  }
}

export const cameraService = new CameraService();
