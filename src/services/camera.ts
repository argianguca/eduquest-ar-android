export interface CameraDevice {
  deviceId: string;
  label: string;
}

class CameraService {
  private activeStream: MediaStream | null = null;

  public async getAvailableCameras(): Promise<CameraDevice[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      return videoDevices.map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Kamera ${index + 1}`,
      }));
    } catch (e) {
      console.warn('Gagal membaca daftar kamera:', e);
      return [];
    }
  }

  public async startCamera(deviceId?: string): Promise<{ stream: MediaStream | null; error: string | null }> {
    this.stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        stream: null,
        error: 'Browser ini tidak mendukung akses kamera (getUserMedia). Pastikan menggunakan Google Chrome / Microsoft Edge.',
      };
    }

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
        : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.activeStream = stream;
      return { stream, error: null };
    } catch (err: any) {
      console.error('Error opening camera:', err);
      let errorMsg = 'Tidak dapat mengakses kamera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Izin kamera ditolak oleh pengguna atau sistem. Klik ikon gembok di bilah alamat browser untuk mengizinkan kamera.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'Tidak ada perangkat kamera / webcam yang ditemukan di komputer atau layar interaktif ini.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Kamera sedang digunakan oleh aplikasi lain (seperti Zoom, Teams, atau tab browser lain). Tutup aplikasi tersebut lalu coba lagi.';
      }
      return { stream: null, error: errorMsg };
    }
  }

  public stopCamera() {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => track.stop());
      this.activeStream = null;
    }
  }

  public isStreamActive(): boolean {
    return !!(this.activeStream && this.activeStream.active);
  }
}

export const cameraService = new CameraService();
