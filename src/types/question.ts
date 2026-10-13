export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type QuestionSource = 'manual' | 'ai' | 'imported';

export type QuestionType = 'multiple_choice' | 'true_false';

export type GameMode = 'shooter' | 'truth_dash' | 'catch_quest';

export interface Question {
  id: string;
  gradeLevel: GradeLevel;
  subject: string;
  topic: string;
  subtopic?: string;
  learningObjective?: string; // Capaian Pembelajaran (CP) / Tujuan Pembelajaran (TP)
  difficulty: DifficultyLevel;
  questionText: string;
  imageUrl?: string;
  type?: QuestionType; // Defaults to 'multiple_choice' if missing for backward compatibility
  options: [string, string, string, string] | [string, string] | string[]; // 4 choices for multiple choice, or ['BENAR', 'SALAH'] for true_false
  correctAnswer: number; // For multiple_choice: 0-3. For true_false: 0 ('BENAR' / True) or 1 ('SALAH' / False)
  explanation: string;
  tags?: string[];
  source: QuestionSource;
  createdAt: number;
  updatedAt: number;
}

export interface QuestionCollection {
  id: string;
  name: string;
  description: string;
  gradeLevel: GradeLevel;
  subject: string;
  topic: string;
  questionIds: string[];
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
}

export type InputMode = 'gesture' | 'touch' | 'mouse';

export type TextSize = 'normal' | 'large' | 'xl';

export type Language = 'id' | 'en';

export type ClassroomPresetId = 'practice' | 'challenge' | 'quick_quiz';

export interface ClassroomPreset {
  id: ClassroomPresetId;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  config: Partial<GameConfig>;
}

export const CLASSROOM_PRESETS: Record<ClassroomPresetId, ClassroomPreset> = {
  practice: {
    id: 'practice',
    name: 'Latihan Santai',
    nameEn: 'Practice',
    description: 'Tanpa pengurangan nyawa, waktu lebih leluasa (45s), pembahasan aktif.',
    descriptionEn: 'No life deduction, relaxed timer (45s), explanations enabled.',
    config: {
      costLifeOnWrong: false,
      showExplanationAfterAnswer: true,
      timeLimitPerQuestion: 45,
      initialLives: 99,
      questionsPerRound: 8,
    },
  },
  challenge: {
    id: 'challenge',
    name: 'Tantangan Kompetisi',
    nameEn: 'Challenge',
    description: '3 nyawa perisai, timer 25s, skor kombo dan efek standar aktif.',
    descriptionEn: '3 shield lives, standard timer (25s), combo bonuses enabled.',
    config: {
      costLifeOnWrong: true,
      showExplanationAfterAnswer: true,
      timeLimitPerQuestion: 25,
      initialLives: 3,
      comboMultiplierBonus: true,
      enableEffects: true,
      questionsPerRound: 5,
    },
  },
  quick_quiz: {
    id: 'quick_quiz',
    name: 'Kuis Cepat (5 Soal)',
    nameEn: 'Quick Quiz',
    description: 'Putaran ringkas 5 soal cepat (15s) dengan transisi langsung.',
    descriptionEn: 'Short 5-question round with fast 15s timer.',
    config: {
      costLifeOnWrong: true,
      showExplanationAfterAnswer: false,
      timeLimitPerQuestion: 15,
      initialLives: 3,
      questionsPerRound: 5,
    },
  },
};

export interface GameConfig {
  questionsPerRound: number;
  timeLimitPerQuestion: number; // seconds
  initialLives: number;
  costLifeOnWrong: boolean;
  showExplanationAfterAnswer: boolean;
  enableSound: boolean;
  enableEffects: boolean;
  pointPerQuestion: number;
  comboMultiplierBonus: boolean;
  inputMode: InputMode;
  cameraOpacity: number; // 0.1 to 1.0
  reticleSmoothing: number; // 0.1 to 0.9 (EMA smoothing factor)
  pinchThreshold: number; // normalized distance threshold (e.g. 0.35 to 0.65)
  textSize: TextSize;
  preferredCameraId?: string;
  activePreset?: ClassroomPresetId;
  classroomDisplayMode?: boolean;
  truthDashDwellDuration?: number; // seconds, custom duration (default: 1.5, no 3s limit)
  truthDashMode?: 'consensus' | 'all_active'; // 'consensus' = voting mayoritas kelas, 'all_active' = skor multi-pemain
  unlimitedTime?: boolean; // true = tanpa batas waktu (mode santai/diskusi)
  overlayCardOpacity?: number; // 0.1 to 1.0 (default 0.85)
  catchQuestSpeed?: number; // 0.4 to 2.5 multiplier (default 1.0)
  globalDwellDuration?: number; // seconds (default 1.5, free input 0.5 - 15.0s+)
  shooterDwellDuration?: number; // custom hover dwell time for shooter quest
  catchQuestDwellDuration?: number; // custom dwell duration for catch quest
  enableDwellSelection?: boolean; // true = auto-select answer after hovering during dwell time (no click/pinch needed)
  kioskModeEnabled?: boolean; // true = simple 3-step kiosk view for beginners & teachers
}

export interface AnswerRecord {
  questionId: string;
  questionText: string;
  options: [string, string, string, string] | [string, string] | string[];
  chosenOption: number;
  correctAnswer: number;
  isCorrect: boolean;
  timeTaken: number;
  explanation: string;
  pointsAwarded: number;
}

export interface GameSessionState {
  status: 'briefing' | 'playing' | 'answered' | 'paused' | 'game_over' | 'completed';
  currentQuestionIndex: number;
  questions: Question[];
  score: number;
  combo: number;
  maxCombo: number;
  lives: number;
  selectedAnswer: number | null;
  isAnswerSubmitted: boolean;
  isCorrect: boolean | null;
  timeRemaining: number;
  isPaused: boolean;
  answersHistory: AnswerRecord[];
  collectionName: string;
  subject: string;
  gradeLevel: GradeLevel;
  topic: string;
}

export interface AIGenerationRequest {
  gradeLevel: GradeLevel;
  subject: string;
  topic: string;
  subtopic?: string;
  learningObjective?: string;
  language: Language;
  count: number;
  difficulty: DifficultyLevel;
  style: 'conceptual' | 'everyday' | 'hots';
  teacherNotes?: string;
  apiKey?: string; // Optional custom Gemini API key
}
