import { AIGenerationRequest, Question } from '../types/question';

export interface HealthCheckResponse {
  status: string;
  geminiConfigured: boolean;
  timestamp: number;
}

export const CUSTOM_GEMINI_KEY_STORAGE = 'eduquest_custom_gemini_api_key';

class GeminiClientService {
  /**
   * Check server health & whether GEMINI_API_KEY is configured on server
   */
  public async checkHealth(): Promise<HealthCheckResponse> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check error');
      return await res.json();
    } catch {
      return {
        status: 'offline',
        geminiConfigured: false,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get user-defined custom Gemini API key from browser storage
   */
  public getCustomApiKey(): string {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(CUSTOM_GEMINI_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  }

  /**
   * Save user-defined custom Gemini API key to browser storage
   */
  public setCustomApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      const trimmed = key.trim();
      if (trimmed) {
        localStorage.setItem(CUSTOM_GEMINI_KEY_STORAGE, trimmed);
      } else {
        localStorage.removeItem(CUSTOM_GEMINI_KEY_STORAGE);
      }
    } catch {}
  }

  /**
   * Remove custom Gemini API key from browser storage
   */
  public clearCustomApiKey(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(CUSTOM_GEMINI_KEY_STORAGE);
    } catch {}
  }

  /**
   * Check whether user has configured a custom key
   */
  public hasCustomApiKey(): boolean {
    return Boolean(this.getCustomApiKey());
  }

  /**
   * Get masked representation of API key for safe display in UI
   */
  public getMaskedApiKey(key?: string): string {
    const raw = key || this.getCustomApiKey();
    if (!raw) return '';
    if (raw.length <= 8) return '••••••••';
    return `${raw.slice(0, 6)}••••••••${raw.slice(-4)}`;
  }

  /**
   * Test a Gemini API key by making a lightweight verification call
   */
  public async testApiKey(apiKeyCandidate?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!navigator.onLine) {
      return {
        success: false,
        message: 'Perangkat offline. Pengujian Kunci API memerlukan koneksi internet.',
      };
    }

    const keyToTest = apiKeyCandidate !== undefined ? apiKeyCandidate.trim() : this.getCustomApiKey();

    try {
      const response = await fetch('/api/test-gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToTest || undefined }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsed = errorText;
        try {
          const json = JSON.parse(errorText);
          parsed = json.message || json.error || errorText;
        } catch {}
        return {
          success: false,
          message: `Gagal verifikasi (${response.status}): ${parsed}`,
        };
      }

      const result = await response.json();
      return {
        success: Boolean(result.success),
        message: result.message || (result.success ? 'Kunci API valid!' : 'Kunci API tidak valid.'),
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal menghubungi server verifikasi: ${err.message || 'Kesalahan jaringan.'}`,
      };
    }
  }

  /**
   * Generate educational quiz questions using Gemini API
   */
  public async generateQuestions(params: AIGenerationRequest): Promise<{
    success: boolean;
    questions?: Question[];
    error?: string;
  }> {
    if (!navigator.onLine) {
      return {
        success: false,
        error:
          'Perangkat sedang berada dalam Mode Offline (tanpa internet). Pembuatan soal AI memerlukan koneksi internet. Anda tetap dapat menggunakan pembuatan soal manual dan memainkan bank soal lokal.',
      };
    }

    // Attach custom API key if available and not explicitly provided in params
    const customKey = this.getCustomApiKey();
    const finalPayload: AIGenerationRequest = {
      ...params,
      apiKey: params.apiKey || (customKey ? customKey : undefined),
    };

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedMessage = errorText;
        try {
          const jsonErr = JSON.parse(errorText);
          parsedMessage = jsonErr.error || errorText;
        } catch {}
        return {
          success: false,
          error: `Gagal memproses permintaan (${response.status}): ${parsedMessage}`,
        };
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: `Kesalahan koneksi ke server AI: ${err.message || 'Tidak dapat menghubungi server lokal.'}`,
      };
    }
  }
}

export const geminiClient = new GeminiClientService();
