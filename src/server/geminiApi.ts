import { GoogleGenAI, Type } from '@google/genai';
import { AIGenerationRequest, Question } from '../types/question';

export interface GenerationResult {
  success: boolean;
  questions?: Question[];
  error?: string;
  code?: 'NO_API_KEY' | 'API_ERROR' | 'INVALID_RESPONSE';
}

function formatGeminiErrorMessage(err: any): string {
  if (!err) return 'Kesalahan tidak diketahui.';
  const rawMsg = err.message || String(err);
  try {
    const parsed = typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg;
    if (parsed.error?.message) {
      if (parsed.error.message.includes('API key not valid')) {
        return 'Kunci API Gemini tidak valid. Harap periksa kembali karakter kunci Anda.';
      }
      return parsed.error.message;
    }
  } catch {}
  if (rawMsg.includes('API key not valid')) {
    return 'Kunci API Gemini tidak valid. Harap periksa kembali karakter kunci Anda.';
  }
  return rawMsg;
}

export async function testGeminiApiKey(apiKey?: string): Promise<{ success: boolean; message: string; error?: string }> {
  const effectiveApiKey =
    apiKey && apiKey.trim() !== '' ? apiKey.trim() : process.env.GEMINI_API_KEY;

  if (!effectiveApiKey || effectiveApiKey === 'MY_GEMINI_API_KEY') {
    return {
      success: false,
      message: 'Kunci API tidak ditemukan. Silakan masukkan Kunci API Gemini Anda.',
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Ping',
    });

    if (response.text) {
      return {
        success: true,
        message: 'Kunci API Gemini valid dan siap digunakan!',
      };
    } else {
      return {
        success: false,
        message: 'Respons kosong dari layanan Gemini.',
      };
    }
  } catch (err: any) {
    const readable = formatGeminiErrorMessage(err);
    return {
      success: false,
      message: readable,
      error: err.message,
    };
  }
}

export async function generateEducationalQuestions(req: AIGenerationRequest): Promise<GenerationResult> {
  const effectiveApiKey =
    req.apiKey && req.apiKey.trim() !== '' ? req.apiKey.trim() : process.env.GEMINI_API_KEY;

  if (!effectiveApiKey || effectiveApiKey.trim() === '' || effectiveApiKey === 'MY_GEMINI_API_KEY') {
    return {
      success: false,
      code: 'NO_API_KEY',
      error: 'GEMINI_API_KEY belum dikonfigurasi. Silakan masukkan Kunci API Gemini Anda di Studio Pembuat Soal atau Pengaturan aplikasi.',
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

    const styleInstructions = {
      conceptual: 'Fokus pada pemahaman konsep dasar, prinsip ilmiah/logis, dan penalaran sederhana yang mudah dipahami anak SD.',
      everyday: 'Kaitkan dengan situasi nyata kehidupan sehari-hari anak Indonesia, di rumah, sekolah, lingkungan sekitar, atau pasar.',
      hots: 'Sajikan Higher-Order Thinking Skills (HOTS) yang disesuaikan untuk usia anak SD: analisis situasi singkat, pemecahan masalah sederhana, atau sebab-akibat langsung.',
    }[req.style] || 'Pahami konsep dasar secara interaktif dan menyenangkan.';

    const systemInstruction = `Anda adalah pakar kurikulum pendidikan dasar (SD) Indonesia dan pengembang game edukasi interaktif EduQuest AR.
Tugas Anda adalah membuat soal pilihan ganda berkualitas tinggi untuk peserta didik Sekolah Dasar (SD) Kelas ${req.gradeLevel}.
Karakteristik peserta didik SD Kelas ${req.gradeLevel}:
- Gunakan bahasa ${req.language === 'id' ? 'Indonesia' : 'Inggris'} yang jelas, komunikatif, baku, dan sesuai tingkat kosakata anak kelas ${req.gradeLevel}.
- Hindari kata-kata yang terlalu abstrak atau berbelit-belit.
- Setiap soal HARUS memiliki tepat 4 pilihan jawaban yang masuk akal dan adil.
- Tentukan 1 kunci jawaban yang mutlak benar (indeks 0, 1, 2, atau 3).
- Berikan penjelasan/pembahasan saintifik yang edukatif, ringkas, dan memotivasi peserta didik.
- Gaya soal: ${styleInstructions}
${req.learningObjective ? `- Target Capaian/Tujuan Pembelajaran: ${req.learningObjective}` : ''}
${req.teacherNotes ? `- Catatan Khusus Guru: ${req.teacherNotes}` : ''}`;

    const promptText = `Buatlah sebanyak ${req.count} butir soal pilihan ganda untuk:
- Jenjang: SD Kelas ${req.gradeLevel}
- Mata Pelajaran: ${req.subject}
- Topik: ${req.topic}
${req.subtopic ? `- Subtopik: ${req.subtopic}` : ''}
- Tingkat Kesulitan: ${req.difficulty === 'easy' ? 'Mudah' : req.difficulty === 'medium' ? 'Sedang' : 'Menantang'}
- Bahasa: ${req.language === 'id' ? 'Bahasa Indonesia' : 'English'}

Pastikan setiap soal memiliki 4 opsi jawaban dan kunci jawaban yang tepat.`;

    const generateConfig = {
      systemInstruction,
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        description: 'Daftar butir soal pilihan ganda edukatif',
        items: {
          type: Type.OBJECT,
          properties: {
            questionText: {
              type: Type.STRING,
              description: 'Teks pertanyaan yang jelas dan ramah anak',
            },
            options: {
              type: Type.ARRAY,
              description: 'Tepat 4 pilihan jawaban',
              items: { type: Type.STRING },
            },
            correctAnswer: {
              type: Type.INTEGER,
              description: 'Indeks jawaban yang benar (0 untuk pilihan pertama, 1 untuk kedua, 2 untuk ketiga, 3 untuk keempat)',
            },
            explanation: {
              type: Type.STRING,
              description: 'Penjelasan atau pembahasan singkat mengapa jawaban tersebut benar',
            },
            subtopic: {
              type: Type.STRING,
              description: 'Subtopik terkait',
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['questionText', 'options', 'correctAnswer', 'explanation'],
        },
      },
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptText,
        config: generateConfig,
      });
    } catch (modelErr: any) {
      const errMsg = modelErr.message || '';
      if (errMsg.includes('high demand') || errMsg.includes('503') || errMsg.includes('overloaded')) {
        console.warn('Fallback to gemini-flash-latest due to high demand:', errMsg);
        response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: promptText,
          config: generateConfig,
        });
      } else {
        throw modelErr;
      }
    }

    const responseText = response.text;
    if (!responseText) {
      return {
        success: false,
        code: 'INVALID_RESPONSE',
        error: 'Model Gemini mengembalikan respons kosong.',
      };
    }

    const rawArray = JSON.parse(responseText);
    if (!Array.isArray(rawArray) || rawArray.length === 0) {
      return {
        success: false,
        code: 'INVALID_RESPONSE',
        error: 'Format keluaran AI tidak sesuai dengan skema soal yang diminta.',
      };
    }

    const questions: Question[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < rawArray.length; i++) {
      const item = rawArray[i];
      if (!item.questionText || !Array.isArray(item.options) || item.options.length < 4) {
        continue;
      }

      // Ensure options has exactly 4 items
      const optionsTuple: [string, string, string, string] = [
        String(item.options[0] || 'Opsi A'),
        String(item.options[1] || 'Opsi B'),
        String(item.options[2] || 'Opsi C'),
        String(item.options[3] || 'Opsi D'),
      ];

      const correctIndex =
        typeof item.correctAnswer === 'number' && item.correctAnswer >= 0 && item.correctAnswer < 4
          ? item.correctAnswer
          : 0;

      const q: Question = {
        id: `ai-q-${timestamp}-${i + 1}-${Math.random().toString(36).substring(2, 6)}`,
        gradeLevel: req.gradeLevel,
        subject: req.subject,
        topic: req.topic,
        subtopic: item.subtopic || req.subtopic,
        learningObjective: req.learningObjective,
        difficulty: req.difficulty,
        questionText: String(item.questionText),
        type: 'multiple_choice',
        options: optionsTuple,
        correctAnswer: correctIndex,
        explanation: String(item.explanation || 'Pembahasan materi terkait.'),
        tags: Array.isArray(item.tags) ? item.tags : [req.subject.toLowerCase(), req.topic.toLowerCase()],
        source: 'ai',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      questions.push(q);
    }

    if (questions.length === 0) {
      return {
        success: false,
        code: 'INVALID_RESPONSE',
        error: 'Gagal memvalidasi butir soal hasil generasi AI.',
      };
    }

    return {
      success: true,
      questions,
    };
  } catch (err: any) {
    console.error('Gemini API execution error:', err);
    const readable = formatGeminiErrorMessage(err);
    return {
      success: false,
      code: 'API_ERROR',
      error: `Gagal memanggil layanan Gemini: ${readable}`,
    };
  }
}
