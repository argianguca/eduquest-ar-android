import { Question, QuestionCollection, GameConfig } from '../types/question';

const DB_NAME = 'EduQuestAR_DB';
const DB_VERSION = 1;

export const DEFAULT_GAME_CONFIG: GameConfig = {
  questionsPerRound: 5,
  timeLimitPerQuestion: 25,
  initialLives: 3,
  costLifeOnWrong: true,
  showExplanationAfterAnswer: true,
  enableSound: true,
  enableEffects: true,
  pointPerQuestion: 100,
  comboMultiplierBonus: true,
  inputMode: 'gesture',
  cameraOpacity: 0.65,
  reticleSmoothing: 0.6,
  pinchThreshold: 0.45,
  textSize: 'normal',
  truthDashDwellDuration: 1.5,
  truthDashMode: 'consensus',
  unlimitedTime: false,
  overlayCardOpacity: 0.85,
  catchQuestSpeed: 1.0,
  globalDwellDuration: 1.5,
  enableDwellSelection: true,
  kioskModeEnabled: true,
};

// Rich default sample questions across SD grades 1-6 and various subjects
export const INITIAL_SAMPLE_QUESTIONS: Question[] = [
  // --- IPAS KELAS 4: Tumbuhan Sumber Kehidupan ---
  {
    id: 'sample-ipas-4-1',
    gradeLevel: 4,
    subject: 'IPAS',
    topic: 'Tumbuhan Sumber Kehidupan',
    subtopic: 'Fotosintesis',
    learningObjective: 'Memahami proses fotosintesis pada tumbuhan dan zat yang dihasilkannya',
    difficulty: 'medium',
    questionText: 'Gas apakah yang diserap oleh daun tumbuhan dari udara saat melakukan proses fotosintesis?',
    type: 'multiple_choice',
    options: ['Oksigen', 'Karbon Dioksida', 'Nitrogen', 'Hidrogen'],
    correctAnswer: 1,
    explanation: 'Tumbuhan menyerap karbon dioksida (CO2) dari udara dan air dari tanah, lalu dengan bantuan cahaya matahari menghasilkan oksigen dan glukosa.',
    tags: ['fotosintesis', 'daun', 'tumbuhan'],
    source: 'manual',
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000,
  },
  {
    id: 'sample-ipas-4-2',
    gradeLevel: 4,
    subject: 'IPAS',
    topic: 'Tumbuhan Sumber Kehidupan',
    subtopic: 'Bagian Tumbuhan',
    learningObjective: 'Mengidentifikasi fungsi akar pada tumbuhan',
    difficulty: 'easy',
    questionText: 'Bagian tumbuhan yang bertugas menyerap air dan mineral dari dalam tanah adalah...',
    type: 'multiple_choice',
    options: ['Batang', 'Bunga', 'Akar', 'Daun'],
    correctAnswer: 2,
    explanation: 'Akar berfungsi mencengkeram tanah dan menyerap air serta unsur hara mineral untuk disalurkan ke seluruh bagian tumbuhan.',
    tags: ['akar', 'bagian-tumbuhan'],
    source: 'manual',
    createdAt: Date.now() - 95000,
    updatedAt: Date.now() - 95000,
  },
  {
    id: 'sample-ipas-4-3',
    gradeLevel: 4,
    subject: 'IPAS',
    topic: 'Tumbuhan Sumber Kehidupan',
    subtopic: 'Klorofil',
    learningObjective: 'Mengenal zat hijau daun dan fungsinya',
    difficulty: 'easy',
    questionText: 'Zat hijau pada daun yang berfungsi menangkap energi cahaya matahari disebut...',
    type: 'multiple_choice',
    options: ['Stomata', 'Klorofil', 'Floem', 'Xilem'],
    correctAnswer: 1,
    explanation: 'Klorofil adalah pigmen hijau pada daun yang bertindak menangkap energi foton matahari untuk proses pembuatan makanan.',
    tags: ['klorofil', 'daun'],
    source: 'manual',
    createdAt: Date.now() - 90000,
    updatedAt: Date.now() - 90000,
  },
  {
    id: 'sample-ipas-4-4',
    gradeLevel: 4,
    subject: 'IPAS',
    topic: 'Tumbuhan Sumber Kehidupan',
    subtopic: 'Pernapasan Tumbuhan',
    learningObjective: 'Mengidentifikasi lubang pertukaran gas pada daun',
    difficulty: 'hard',
    questionText: 'Lubang-lubang kecil pada permukaan daun tempat keluar masuknya udara disebut...',
    type: 'multiple_choice',
    options: ['Stomata', 'Lentisel', 'Kambium', 'Kutikula'],
    correctAnswer: 0,
    explanation: 'Stomata (mulut daun) adalah pori-pori mikroskopis pada daun tempat pertukaran oksigen, karbon dioksida, dan uap air.',
    tags: ['stomata', 'daun'],
    source: 'manual',
    createdAt: Date.now() - 85000,
    updatedAt: Date.now() - 85000,
  },
  {
    id: 'sample-ipas-4-5',
    gradeLevel: 4,
    subject: 'IPAS',
    topic: 'Tumbuhan Sumber Kehidupan',
    subtopic: 'Hasil Fotosintesis',
    learningObjective: 'Menyebutkan zat hasil proses fotosintesis',
    difficulty: 'medium',
    questionText: 'Selain karbohidrat (glukosa), hasil fotosintesis yang sangat dibutuhkan manusia dan hewan untuk bernapas adalah...',
    type: 'multiple_choice',
    options: ['Karbon Monoksida', 'Oksigen', 'Uap Belerang', 'Nitrogen Cair'],
    correctAnswer: 1,
    explanation: 'Oksigen dilepaskan ke udara sebagai hasil fotosintesis dan dihirup oleh semua makhluk hidup untuk bernapas.',
    tags: ['oksigen', 'manfaat'],
    source: 'manual',
    createdAt: Date.now() - 80000,
    updatedAt: Date.now() - 80000,
  },

  // --- MATEMATIKA KELAS 3: Pecahan & Operasi Hitung ---
  {
    id: 'sample-mat-3-1',
    gradeLevel: 3,
    subject: 'Matematika',
    topic: 'Pecahan Sederhana',
    subtopic: 'Mengenal Pecahan',
    learningObjective: 'Menyatakan bagian suatu benda utuh dalam bentuk pecahan sederhana',
    difficulty: 'easy',
    questionText: 'Sebuah semangka dipotong menjadi 4 bagian sama besar. Satu potong semangka bernilai...',
    type: 'multiple_choice',
    options: ['1/2', '1/3', '1/4', '2/4'],
    correctAnswer: 2,
    explanation: 'Karena semangka dibagi menjadi 4 bagian sama rata, maka setiap potong mewakili satu dari empat bagian, yaitu 1/4.',
    tags: ['pecahan', 'dasar'],
    source: 'manual',
    createdAt: Date.now() - 75000,
    updatedAt: Date.now() - 75000,
  },
  {
    id: 'sample-mat-3-2',
    gradeLevel: 3,
    subject: 'Matematika',
    topic: 'Pecahan Sederhana',
    subtopic: 'Perbandingan Pecahan',
    learningObjective: 'Membandingkan dua pecahan dengan penyebut sama',
    difficulty: 'medium',
    questionText: 'Manakah tanda yang tepat untuk membandingkan: 2/5 ... 4/5 ?',
    type: 'multiple_choice',
    options: ['Lebih besar ( > )', 'Lebih kecil ( < )', 'Sama dengan ( = )', 'Tidak bisa dibandingkan'],
    correctAnswer: 1,
    explanation: 'Karena penyebutnya sama (5), kita bandingkan pembilangnya. 2 lebih kecil dari 4, sehingga 2/5 < 4/5.',
    tags: ['perbandingan', 'pecahan'],
    source: 'manual',
    createdAt: Date.now() - 70000,
    updatedAt: Date.now() - 70000,
  },
  {
    id: 'sample-mat-3-3',
    gradeLevel: 3,
    subject: 'Matematika',
    topic: 'Operasi Hitung',
    subtopic: 'Perkalian Dasar',
    learningObjective: 'Menyelesaikan perkalian sebagai penjumlahan berulang',
    difficulty: 'easy',
    questionText: 'Berapakah hasil dari 7 × 8?',
    type: 'multiple_choice',
    options: ['48', '54', '56', '64'],
    correctAnswer: 2,
    explanation: '7 dikalikan 8 sama dengan 56 (7 x 8 = 56).',
    tags: ['perkalian', 'hitung'],
    source: 'manual',
    createdAt: Date.now() - 65000,
    updatedAt: Date.now() - 65000,
  },
  {
    id: 'sample-mat-3-4',
    gradeLevel: 3,
    subject: 'Matematika',
    topic: 'Operasi Hitung',
    subtopic: 'Penjumlahan Pecahan',
    learningObjective: 'Menjumlahkan pecahan berpenyebut sama',
    difficulty: 'medium',
    questionText: 'Berapakah hasil penjumlahan dari 2/7 + 3/7 ?',
    type: 'multiple_choice',
    options: ['5/14', '5/7', '6/7', '1/7'],
    correctAnswer: 1,
    explanation: 'Pada pecahan berpenyebut sama, jumlahkan pembilangnya: 2 + 3 = 5, sedangkan penyebut tetap 7. Jadi hasilnya 5/7.',
    tags: ['penjumlahan', 'pecahan'],
    source: 'manual',
    createdAt: Date.now() - 60000,
    updatedAt: Date.now() - 60000,
  },

  // --- BAHASA INDONESIA KELAS 2: Kosakata & Menyimak ---
  {
    id: 'sample-bind-2-1',
    gradeLevel: 2,
    subject: 'Bahasa Indonesia',
    topic: 'Kosakata & Kalimat',
    subtopic: 'Kata Tanya',
    learningObjective: 'Menggunakan kata tanya yang tepat sesuai konteks kalimat',
    difficulty: 'easy',
    questionText: 'Kata tanya yang digunakan untuk menanyakan tempat kejadian adalah...',
    type: 'multiple_choice',
    options: ['Siapa', 'Kapan', 'Di mana', 'Berapa'],
    correctAnswer: 2,
    explanation: 'Kata tanya "Di mana" digunakan khusus untuk menanyakan letak atau tempat suatu peristiwa berlangsung.',
    tags: ['kata-tanya', 'kalimat'],
    source: 'manual',
    createdAt: Date.now() - 55000,
    updatedAt: Date.now() - 55000,
  },
  {
    id: 'sample-bind-2-2',
    gradeLevel: 2,
    subject: 'Bahasa Indonesia',
    topic: 'Kosakata & Kalimat',
    subtopic: 'Lawan Kata',
    learningObjective: 'Menentukan antonim (lawan kata) kata sifat sederhana',
    difficulty: 'easy',
    questionText: 'Lawan kata dari "rajin" adalah...',
    type: 'multiple_choice',
    options: ['Pandai', 'Malas', 'Cepat', 'Hemat'],
    correctAnswer: 1,
    explanation: 'Lawan kata (antonim) dari sifat rajin adalah malas.',
    tags: ['antonim', 'kosakata'],
    source: 'manual',
    createdAt: Date.now() - 50000,
    updatedAt: Date.now() - 50000,
  },
  {
    id: 'sample-bind-2-3',
    gradeLevel: 2,
    subject: 'Bahasa Indonesia',
    topic: 'Tanda Baca',
    subtopic: 'Tanda Titik dan Tanya',
    learningObjective: 'Mengenal fungsi tanda baca pada akhir kalimat tanya',
    difficulty: 'easy',
    questionText: 'Tanda baca yang harus diletakkan pada akhir kalimat tanya adalah...',
    type: 'multiple_choice',
    options: ['Tanda Titik ( . )', 'Tanda Koma ( , )', 'Tanda Seru ( ! )', 'Tanda Tanya ( ? )'],
    correctAnswer: 3,
    explanation: 'Kalimat tanya selalu diakhiri dengan tanda tanya (?).',
    tags: ['tanda-baca'],
    source: 'manual',
    createdAt: Date.now() - 45000,
    updatedAt: Date.now() - 45000,
  },

  // --- PENDIDIKAN PANCASILA KELAS 5: Nilai-Nilai Pancasila ---
  {
    id: 'sample-pp-5-1',
    gradeLevel: 5,
    subject: 'Pendidikan Pancasila',
    topic: 'Penerapan Nilai Pancasila',
    subtopic: 'Sila Pertama',
    learningObjective: 'Menunjukkan contoh sikap yang mencerminkan Sila Pertama Pancasila',
    difficulty: 'easy',
    questionText: 'Menghormati teman yang sedang menjalankan ibadah sesuai agamanya merupakan pengamalan sila ke-...',
    type: 'multiple_choice',
    options: ['Satu', 'Dua', 'Tiga', 'Empat'],
    correctAnswer: 0,
    explanation: 'Sila Pertama "Ketuhanan Yang Maha Esa" mengajarkan sikap saling menghormati dan toleransi antarumat beragama.',
    tags: ['sila-1', 'toleransi'],
    source: 'manual',
    createdAt: Date.now() - 40000,
    updatedAt: Date.now() - 40000,
  },
  {
    id: 'sample-pp-5-2',
    gradeLevel: 5,
    subject: 'Pendidikan Pancasila',
    topic: 'Penerapan Nilai Pancasila',
    subtopic: 'Musyawarah Mufakat',
    learningObjective: 'Memahami prinsip pengambilan keputusan bersama sesuai Sila Keempat',
    difficulty: 'medium',
    questionText: 'Musyawarah untuk mufakat dalam pemilihan ketua kelas mencerminkan nilai Pancasila sila ke-...',
    type: 'multiple_choice',
    options: ['Kedua', 'Ketiga', 'Keempat', 'Kelima'],
    correctAnswer: 2,
    explanation: 'Sila ke-4 "Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan dalam Permusyawaratan/Perwakilan" mengutamakan musyawarah untuk mencapai mufakat.',
    tags: ['sila-4', 'musyawarah'],
    source: 'manual',
    createdAt: Date.now() - 35000,
    updatedAt: Date.now() - 35000,
  },
  {
    id: 'sample-pp-5-3',
    gradeLevel: 5,
    subject: 'Pendidikan Pancasila',
    topic: 'Simbol Pancasila',
    subtopic: 'Lambang Sila',
    learningObjective: 'Mengenal lambang dari setiap sila pada Burung Garuda',
    difficulty: 'easy',
    questionText: 'Lambang sila ketiga Pancasila "Persatuan Indonesia" adalah...',
    type: 'multiple_choice',
    options: ['Bintang Emas', 'Rantai Baja', 'Pohon Beringin', 'Kepala Banteng'],
    correctAnswer: 2,
    explanation: 'Pohon Beringin adalah simbol sila ketiga Pancasila yang melambangkan perlindungan dan persatuan seluruh rakyat Indonesia.',
    tags: ['simbol', 'garuda'],
    source: 'manual',
    createdAt: Date.now() - 30000,
    updatedAt: Date.now() - 30000,
  },

  // --- BAHASA INGGRIS KELAS 4: School Activities & Telling Time ---
  {
    id: 'sample-bing-4-1',
    gradeLevel: 4,
    subject: 'Bahasa Inggris',
    topic: 'Telling Time',
    subtopic: 'Daily Routine',
    learningObjective: 'Membaca dan menyebutkan waktu dalam bahasa Inggris',
    difficulty: 'easy',
    questionText: 'If the clock shows 07:00 in the morning, how do you say it in English?',
    type: 'multiple_choice',
    options: ['It is seven o\'clock', 'It is half past seven', 'It is seven fifteen', 'It is quarter to seven'],
    correctAnswer: 0,
    explanation: 'Pukul 07.00 tepat dibaca "It is seven o\'clock".',
    tags: ['time', 'english'],
    source: 'manual',
    createdAt: Date.now() - 25000,
    updatedAt: Date.now() - 25000,
  },
  {
    id: 'sample-bing-4-2',
    gradeLevel: 4,
    subject: 'Bahasa Inggris',
    topic: 'School Activities',
    subtopic: 'Action Verbs',
    learningObjective: 'Mengidentifikasi kosakata kegiatan di perpustakaan',
    difficulty: 'medium',
    questionText: 'What activity do students usually do in the library?',
    type: 'multiple_choice',
    options: ['Playing football', 'Borrowing and reading books', 'Cooking food', 'Swimming'],
    correctAnswer: 1,
    explanation: 'Di perpustakaan (library), siswa meminjam dan membaca buku (borrowing and reading books).',
    tags: ['library', 'verbs'],
    source: 'manual',
    createdAt: Date.now() - 20000,
    updatedAt: Date.now() - 20000,
  },

  // --- IPAS KELAS 5: Ekosistem & Rantai Makanan ---
  {
    id: 'sample-ipas-5-1',
    gradeLevel: 5,
    subject: 'IPAS',
    topic: 'Rantai Makanan & Ekosistem',
    subtopic: 'Peran Makhluk Hidup',
    learningObjective: 'Mengidentifikasi peran organisme dalam rantai makanan',
    difficulty: 'medium',
    questionText: 'Dalam rantai makanan di sawah: Padi -> Belalang -> Katak -> Ular, yang bertindak sebagai konsumen tingkat II (sekunder) adalah...',
    type: 'multiple_choice',
    options: ['Padi', 'Belalang', 'Katak', 'Ular'],
    correctAnswer: 2,
    explanation: 'Padi adalah produsen, Belalang adalah konsumen I (herbivora), Katak adalah konsumen II (karnivora pemakan belalang), dan Ular konsumen III.',
    tags: ['ekosistem', 'rantai-makanan'],
    source: 'manual',
    createdAt: Date.now() - 15000,
    updatedAt: Date.now() - 15000,
  },
  {
    id: 'sample-ipas-5-2',
    gradeLevel: 5,
    subject: 'IPAS',
    topic: 'Rantai Makanan & Ekosistem',
    subtopic: 'Pengurai (Dekomposer)',
    learningObjective: 'Memahami peran dekomposer bagi kesuburan tanah',
    difficulty: 'hard',
    questionText: 'Makhluk hidup seperti bakteri dan jamur yang menguraikan bangkai serta sisa organisme mati disebut...',
    type: 'multiple_choice',
    options: ['Produsen', 'Predator', 'Dekomposer / Pengurai', 'Herbivora'],
    correctAnswer: 2,
    explanation: 'Dekomposer (pengurai) menguraikan materi organik dari sisa makhluk hidup menjadi zat hara penyubur tanah.',
    tags: ['dekomposer', 'jamur'],
    source: 'manual',
    createdAt: Date.now() - 10000,
    updatedAt: Date.now() - 10000,
  },

  // --- SOAL BENAR/SALAH (TRUE/FALSE) UNTUK MODE TRUTH DASH ---
  {
    id: 'sample-tf-ipas-1',
    gradeLevel: 4,
    subject: 'IPAS',
    topic: 'Tumbuhan & Fotosintesis',
    subtopic: 'Klorofil',
    learningObjective: 'Memahami zat hijau daun dan fotosintesis',
    difficulty: 'easy',
    questionText: 'Tumbuhan memerlukan cahaya matahari dan klorofil untuk melakukan fotosintesis.',
    type: 'true_false',
    options: ['BENAR', 'SALAH'],
    correctAnswer: 0, // 0 = BENAR
    explanation: 'BENAR. Klorofil menyerap energi cahaya matahari untuk mengubah air dan karbon dioksida menjadi glukosa serta oksigen.',
    tags: ['fotosintesis', 'klorofil', 'true_false'],
    source: 'manual',
    createdAt: Date.now() - 8000,
    updatedAt: Date.now() - 8000,
  },
  {
    id: 'sample-tf-ipas-2',
    gradeLevel: 4,
    subject: 'IPAS',
    topic: 'Tumbuhan & Fotosintesis',
    subtopic: 'Gas Pernapasan',
    learningObjective: 'Mengidentifikasi gas yang dihasilkan fotosintesis',
    difficulty: 'easy',
    questionText: 'Gas yang dikeluarkan oleh daun tumbuhan sebagai hasil fotosintesis adalah Karbon Monoksida.',
    type: 'true_false',
    options: ['BENAR', 'SALAH'],
    correctAnswer: 1, // 1 = SALAH
    explanation: 'SALAH. Gas yang dihasilkan oleh proses fotosintesis adalah Oksigen (O2), bukan karbon monoksida.',
    tags: ['oksigen', 'gas', 'true_false'],
    source: 'manual',
    createdAt: Date.now() - 7000,
    updatedAt: Date.now() - 7000,
  },
  {
    id: 'sample-tf-mat-1',
    gradeLevel: 3,
    subject: 'Matematika',
    topic: 'Operasi Bilangan',
    subtopic: 'Perkalian Dasar',
    learningObjective: 'Menghitung perkalian dasar dengan tepat',
    difficulty: 'easy',
    questionText: 'Hasil dari 7 dikalikan 8 adalah 56.',
    type: 'true_false',
    options: ['BENAR', 'SALAH'],
    correctAnswer: 0, // 0 = BENAR
    explanation: 'BENAR. 7 × 8 = 56.',
    tags: ['perkalian', 'matematika', 'true_false'],
    source: 'manual',
    createdAt: Date.now() - 6000,
    updatedAt: Date.now() - 6000,
  },
  {
    id: 'sample-tf-pp-1',
    gradeLevel: 5,
    subject: 'Pendidikan Pancasila',
    topic: 'Simbol Sila',
    subtopic: 'Pancasila',
    learningObjective: 'Mengenal lambang sila Pancasila',
    difficulty: 'medium',
    questionText: 'Lambang sila kedua Pancasila (Kemanusiaan yang Adil dan Beradab) adalah Pohon Beringin.',
    type: 'true_false',
    options: ['BENAR', 'SALAH'],
    correctAnswer: 1, // 1 = SALAH
    explanation: 'SALAH. Lambang sila kedua adalah Rantai Emas. Pohon Beringin adalah lambang sila ketiga.',
    tags: ['pancasila', 'simbol', 'true_false'],
    source: 'manual',
    createdAt: Date.now() - 5000,
    updatedAt: Date.now() - 5000,
  },
  {
    id: 'sample-tf-bing-1',
    gradeLevel: 4,
    subject: 'Bahasa Inggris',
    topic: 'Animals & Nature',
    subtopic: 'Vocabulary',
    learningObjective: 'Mengenal kosakata hewan dalam bahasa Inggris',
    difficulty: 'easy',
    questionText: 'In English, "Kucing" is translated as "Elephant".',
    type: 'true_false',
    options: ['BENAR', 'SALAH'],
    correctAnswer: 1, // 1 = SALAH
    explanation: 'SALAH. Kucing dalam bahasa Inggris adalah "Cat", sedangkan "Elephant" artinya gajah.',
    tags: ['animals', 'vocabulary', 'true_false'],
    source: 'manual',
    createdAt: Date.now() - 4000,
    updatedAt: Date.now() - 4000,
  },
  {
    id: 'sample-tf-ipas-3',
    gradeLevel: 4,
    subject: 'IPAS',
    topic: 'Wujud Zat & Materi',
    subtopic: 'Perubahan Wujud',
    learningObjective: 'Mengenal peristiwa mencair dan membeku',
    difficulty: 'easy',
    questionText: 'Peristiwa es batu yang berubah menjadi air ketika dipanaskan disebut mencair.',
    type: 'true_false',
    options: ['BENAR', 'SALAH'],
    correctAnswer: 0, // 0 = BENAR
    explanation: 'BENAR. Mencair adalah perubahan wujud benda padat menjadi cair karena menerima panas kalor.',
    tags: ['wujud-zat', 'perubahan', 'true_false'],
    source: 'manual',
    createdAt: Date.now() - 3000,
    updatedAt: Date.now() - 3000,
  },
];

export const INITIAL_SAMPLE_COLLECTIONS: QuestionCollection[] = [
  {
    id: 'col-tf-truthdash',
    name: 'Truth Dash SD - Pengetahuan Umum & IPAS (Benar / Salah)',
    description: 'Koleksi pernyataan Benar/Salah untuk tantangan gerak badan Truth Dash (6 Soal)',
    gradeLevel: 4,
    subject: 'IPAS',
    topic: 'Pernyataan Benar atau Salah',
    questionIds: [
      'sample-tf-ipas-1',
      'sample-tf-ipas-2',
      'sample-tf-mat-1',
      'sample-tf-pp-1',
      'sample-tf-bing-1',
      'sample-tf-ipas-3',
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true,
  },
  {
    id: 'col-ipas-4',
    name: 'IPAS Kelas 4 - Tumbuhan Sumber Kehidupan',
    description: 'Misi AR fotosintesis, organ tumbuhan, dan fungsi klorofil (5 Soal)',
    gradeLevel: 4,
    subject: 'IPAS',
    topic: 'Tumbuhan Sumber Kehidupan',
    questionIds: ['sample-ipas-4-1', 'sample-ipas-4-2', 'sample-ipas-4-3', 'sample-ipas-4-4', 'sample-ipas-4-5'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true,
  },
  {
    id: 'col-mat-3',
    name: 'Matematika Kelas 3 - Pecahan & Perkalian',
    description: 'Petualangan angka pecahan sederhana dan hitung cepat perkalian (4 Soal)',
    gradeLevel: 3,
    subject: 'Matematika',
    topic: 'Pecahan Sederhana',
    questionIds: ['sample-mat-3-1', 'sample-mat-3-2', 'sample-mat-3-3', 'sample-mat-3-4'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true,
  },
  {
    id: 'col-pp-5',
    name: 'Pendidikan Pancasila Kelas 5 - Nilai & Simbol',
    description: 'Tantangan pemahaman penerapan sila Pancasila dalam keseharian (3 Soal)',
    gradeLevel: 5,
    subject: 'Pendidikan Pancasila',
    topic: 'Penerapan Nilai Pancasila',
    questionIds: ['sample-pp-5-1', 'sample-pp-5-2', 'sample-pp-5-3'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true,
  },
  {
    id: 'col-bind-2',
    name: 'Bahasa Indonesia Kelas 2 - Kosakata & Tanda Baca',
    description: 'Eksplorasi kata tanya, antonim kata sifat, dan tanda baca (3 Soal)',
    gradeLevel: 2,
    subject: 'Bahasa Indonesia',
    topic: 'Kosakata & Kalimat',
    questionIds: ['sample-bind-2-1', 'sample-bind-2-2', 'sample-bind-2-3'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true,
  },
  {
    id: 'col-bing-4',
    name: 'Bahasa Inggris Kelas 4 - Daily Activities',
    description: 'Practicing telling time and school library activities (2 Soal)',
    gradeLevel: 4,
    subject: 'Bahasa Inggris',
    topic: 'Telling Time',
    questionIds: ['sample-bing-4-1', 'sample-bing-4-2'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true,
  },
  {
    id: 'col-ipas-5',
    name: 'IPAS Kelas 5 - Rantai Makanan & Ekosistem',
    description: 'Misi jaring-jaring makanan dan dekomposer sawah (2 Soal)',
    gradeLevel: 5,
    subject: 'IPAS',
    topic: 'Rantai Makanan & Ekosistem',
    questionIds: ['sample-ipas-5-1', 'sample-ipas-5-2'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true,
  },
];

class StorageService {
  private db: IDBDatabase | null = null;
  private initialized = false;

  private async openDB(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return null;
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result as IDBDatabase;
          if (!db.objectStoreNames.contains('questions')) {
            db.createObjectStore('questions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('collections')) {
            db.createObjectStore('collections', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        };
        req.onsuccess = () => {
          resolve(req.result);
        };
        req.onerror = () => {
          console.warn('IndexedDB open error, falling back to localStorage');
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB unavailable:', err);
        resolve(null);
      }
    });
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    this.db = await this.openDB();
    this.initialized = true;

    // Check if initial seeding is needed
    const existingQuestions = await this.getAllQuestions();
    if (existingQuestions.length === 0) {
      await this.saveQuestionsBatch(INITIAL_SAMPLE_QUESTIONS);
      await this.saveCollectionsBatch(INITIAL_SAMPLE_COLLECTIONS);
    } else {
      // Non-destructive addition: check if col-tf-truthdash is present, otherwise add it and its sample questions
      const existingCollections = await this.getAllCollections();
      const hasTruthDash = existingCollections.some((c) => c.id === 'col-tf-truthdash');
      if (!hasTruthDash) {
        const tfSampleQuestions = INITIAL_SAMPLE_QUESTIONS.filter((q) => q.type === 'true_false');
        await this.saveQuestionsBatch(tfSampleQuestions);
        const tfCol = INITIAL_SAMPLE_COLLECTIONS.find((c) => c.id === 'col-tf-truthdash');
        if (tfCol) {
          await this.saveCollection(tfCol);
        }
      }
    }
  }

  // --- Questions CRUD ---
  public async getAllQuestions(): Promise<Question[]> {
    await this.init();
    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction('questions', 'readonly');
          const store = tx.objectStore('questions');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve(this.getQuestionsFromLocalStorage());
        } catch {
          resolve(this.getQuestionsFromLocalStorage());
        }
      });
    }
    return this.getQuestionsFromLocalStorage();
  }

  public async getQuestionById(id: string): Promise<Question | null> {
    await this.init();
    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction('questions', 'readonly');
          const store = tx.objectStore('questions');
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => {
            const list = this.getQuestionsFromLocalStorage();
            resolve(list.find((q) => q.id === id) || null);
          };
        } catch {
          const list = this.getQuestionsFromLocalStorage();
          resolve(list.find((q) => q.id === id) || null);
        }
      });
    }
    const list = this.getQuestionsFromLocalStorage();
    return list.find((q) => q.id === id) || null;
  }

  public async saveQuestion(question: Question): Promise<void> {
    await this.init();
    const updated = { ...question, updatedAt: Date.now() };
    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const tx = this.db!.transaction('questions', 'readwrite');
          const store = tx.objectStore('questions');
          const req = store.put(updated);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch (e) {
          reject(e);
        }
      }).catch((e) => {
        console.warn('IDB put error, falling back to localStorage', e);
      });
    }
    // Mirror to localStorage
    const list = this.getQuestionsFromLocalStorage();
    const idx = list.findIndex((q) => q.id === question.id);
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.saveQuestionsToLocalStorage(list);
  }

  public async saveQuestionsBatch(questions: Question[]): Promise<void> {
    await this.init();
    for (const q of questions) {
      await this.saveQuestion(q);
    }
  }

  public async deleteQuestion(id: string): Promise<void> {
    await this.init();
    if (this.db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction('questions', 'readwrite');
          const store = tx.objectStore('questions');
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
    const list = this.getQuestionsFromLocalStorage().filter((q) => q.id !== id);
    this.saveQuestionsToLocalStorage(list);

    // Also remove from any collection referencing it
    const collections = await this.getAllCollections();
    for (const col of collections) {
      if (col.questionIds.includes(id)) {
        col.questionIds = col.questionIds.filter((qid) => qid !== id);
        await this.saveCollection(col);
      }
    }
  }

  // --- Collections CRUD ---
  public async getAllCollections(): Promise<QuestionCollection[]> {
    await this.init();
    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction('collections', 'readonly');
          const store = tx.objectStore('collections');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve(this.getCollectionsFromLocalStorage());
        } catch {
          resolve(this.getCollectionsFromLocalStorage());
        }
      });
    }
    return this.getCollectionsFromLocalStorage();
  }

  public async saveCollection(col: QuestionCollection): Promise<void> {
    await this.init();
    const updated = { ...col, updatedAt: Date.now() };
    if (this.db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction('collections', 'readwrite');
          const store = tx.objectStore('collections');
          const req = store.put(updated);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
    const list = this.getCollectionsFromLocalStorage();
    const idx = list.findIndex((c) => c.id === col.id);
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.saveCollectionsToLocalStorage(list);
  }

  public async saveCollectionsBatch(cols: QuestionCollection[]): Promise<void> {
    for (const c of cols) {
      await this.saveCollection(c);
    }
  }

  public async deleteCollection(id: string): Promise<void> {
    await this.init();
    if (this.db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction('collections', 'readwrite');
          const store = tx.objectStore('collections');
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
    const list = this.getCollectionsFromLocalStorage().filter((c) => c.id !== id);
    this.saveCollectionsToLocalStorage(list);
  }

  // --- Settings Persistence ---
  public async getGameConfig(): Promise<GameConfig> {
    try {
      const saved = localStorage.getItem('eduquest_ar_config');
      if (saved) return { ...DEFAULT_GAME_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return { ...DEFAULT_GAME_CONFIG };
  }

  public async saveGameConfig(config: GameConfig): Promise<void> {
    try {
      localStorage.setItem('eduquest_ar_config', JSON.stringify(config));
    } catch {}
  }

  // --- Reset to Sample Questions ---
  public async resetToDefaultSamples(): Promise<void> {
    await this.saveQuestionsBatch(INITIAL_SAMPLE_QUESTIONS);
    await this.saveCollectionsBatch(INITIAL_SAMPLE_COLLECTIONS);
  }

  // --- JSON Export / Import ---
  public async exportAllToJSON(): Promise<string> {
    const questions = await this.getAllQuestions();
    const collections = await this.getAllCollections();
    const config = await this.getGameConfig();
    const payload = {
      app: 'EduQuest AR',
      version: '1.1',
      exportedAt: new Date().toISOString(),
      metadata: {
        totalQuestions: questions.length,
        totalCollections: collections.length,
      },
      questions,
      collections,
      config,
    };
    return JSON.stringify(payload, null, 2);
  }

  public validateJSONBackup(jsonString: string): {
    isValid: boolean;
    version?: string;
    exportedAt?: string;
    questionsCount: number;
    collectionsCount: number;
    validQuestions: Question[];
    validCollections: QuestionCollection[];
    duplicateIdCount: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let data: any;

    try {
      data = JSON.parse(jsonString);
    } catch {
      return {
        isValid: false,
        questionsCount: 0,
        collectionsCount: 0,
        validQuestions: [],
        validCollections: [],
        duplicateIdCount: 0,
        errors: ['Format file bukan JSON yang valid. Pastikan file berakhiran .json dan tidak rusak.'],
      };
    }

    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        questionsCount: 0,
        collectionsCount: 0,
        validQuestions: [],
        validCollections: [],
        duplicateIdCount: 0,
        errors: ['Isi JSON tidak berisi objek data EduQuest AR yang valid.'],
      };
    }

    const version = data.version || '1.0';
    const exportedAt = data.exportedAt;
    const questionsRaw = Array.isArray(data.questions) ? data.questions : [];
    const collectionsRaw = Array.isArray(data.collections) ? data.collections : [];

    const validQuestions: Question[] = [];
    const validCollections: QuestionCollection[] = [];
    const seenIds = new Set<string>();
    let duplicateIdCount = 0;

    questionsRaw.forEach((item: any, idx: number) => {
      const isTF = item.type === 'true_false' || (Array.isArray(item.options) && item.options.length === 2);
      const expectedOptionsLen = isTF ? 2 : 4;

      if (!item.questionText || !Array.isArray(item.options) || (item.options.length !== 2 && item.options.length !== 4)) {
        errors.push(`Butir ke-${idx + 1} ("${item.questionText || 'Tanpa Teks'}") tidak memiliki opsi jawaban yang valid.`);
        return;
      }

      let qId = item.id || `imp-q-${Date.now()}-${idx}`;
      if (seenIds.has(qId)) {
        duplicateIdCount++;
        qId = `${qId}-dup-${Math.random().toString(36).substring(2, 6)}`;
      }
      seenIds.add(qId);

      const maxAnswerIdx = isTF ? 1 : 3;
      const correctAns =
        typeof item.correctAnswer === 'number' && item.correctAnswer >= 0 && item.correctAnswer <= maxAnswerIdx
          ? item.correctAnswer
          : 0;

      const qOptions = isTF
        ? [String(item.options[0] || 'BENAR'), String(item.options[1] || 'SALAH')]
        : [String(item.options[0]), String(item.options[1]), String(item.options[2]), String(item.options[3])];

      const validQ: Question = {
        id: qId,
        gradeLevel: ([1, 2, 3, 4, 5, 6].includes(item.gradeLevel) ? item.gradeLevel : 4) as any,
        subject: String(item.subject || 'Umum'),
        topic: String(item.topic || 'Topik Umum'),
        subtopic: item.subtopic ? String(item.subtopic) : undefined,
        learningObjective: item.learningObjective ? String(item.learningObjective) : undefined,
        difficulty: ['easy', 'medium', 'hard'].includes(item.difficulty) ? item.difficulty : 'medium',
        questionText: String(item.questionText),
        imageUrl: item.imageUrl,
        type: isTF ? 'true_false' : 'multiple_choice',
        options: qOptions,
        correctAnswer: correctAns,
        explanation: String(item.explanation || 'Pembahasan materi.'),
        tags: Array.isArray(item.tags) ? item.tags : [],
        source: 'imported',
        createdAt: item.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      validQuestions.push(validQ);
    });

    collectionsRaw.forEach((col: any, idx: number) => {
      if (!col.name) return;
      const validCol: QuestionCollection = {
        id: col.id || `imp-col-${Date.now()}-${idx}`,
        name: String(col.name),
        description: String(col.description || ''),
        gradeLevel: ([1, 2, 3, 4, 5, 6].includes(col.gradeLevel) ? col.gradeLevel : 4) as any,
        subject: String(col.subject || 'Umum'),
        topic: String(col.topic || 'Topik Umum'),
        questionIds: Array.isArray(col.questionIds) ? col.questionIds : [],
        createdAt: col.createdAt || Date.now(),
        updatedAt: Date.now(),
        isDefault: false,
      };
      validCollections.push(validCol);
    });

    return {
      isValid: validQuestions.length > 0 || validCollections.length > 0,
      version,
      exportedAt,
      questionsCount: validQuestions.length,
      collectionsCount: validCollections.length,
      validQuestions,
      validCollections,
      duplicateIdCount,
      errors,
    };
  }

  public async clearDatabase(): Promise<void> {
    await this.init();
    if (this.db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction(['questions', 'collections'], 'readwrite');
          tx.objectStore('questions').clear();
          tx.objectStore('collections').clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
    localStorage.removeItem('eduquest_ar_questions');
    localStorage.removeItem('eduquest_ar_collections');
  }

  public async importFromJSONWithMode(
    jsonString: string,
    mode: 'add_new' | 'update_existing' | 'replace_all' = 'add_new'
  ): Promise<{ questionsProcessed: number; collectionsProcessed: number; errors: string[] }> {
    const validated = this.validateJSONBackup(jsonString);
    if (!validated.isValid) {
      return { questionsProcessed: 0, collectionsProcessed: 0, errors: validated.errors };
    }

    if (mode === 'replace_all') {
      await this.clearDatabase();
    }

    const currentQuestions = await this.getAllQuestions();
    const existingIdMap = new Set(currentQuestions.map((q) => q.id));

    // Process questions based on mode
    for (const q of validated.validQuestions) {
      if (mode === 'add_new') {
        if (existingIdMap.has(q.id)) {
          // Generate new unique ID to avoid overwriting existing record
          q.id = `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        }
        await this.saveQuestion(q);
      } else if (mode === 'update_existing' || mode === 'replace_all') {
        await this.saveQuestion(q);
      }
    }

    // Process collections
    for (const col of validated.validCollections) {
      await this.saveCollection(col);
    }

    return {
      questionsProcessed: validated.validQuestions.length,
      collectionsProcessed: validated.validCollections.length,
      errors: validated.errors,
    };
  }

  public async importFromJSON(jsonString: string): Promise<{ questionsAdded: number; collectionsAdded: number; errors: string[] }> {
    const res = await this.importFromJSONWithMode(jsonString, 'add_new');
    return {
      questionsAdded: res.questionsProcessed,
      collectionsAdded: res.collectionsProcessed,
      errors: res.errors,
    };
  }

  public async saveExcelImport(
    questions: Question[],
    collectionNames: string[],
    mode: 'add_new' | 'update_existing' | 'replace_all'
  ): Promise<{ questionsSaved: number; collectionsCreated: number }> {
    if (mode === 'replace_all') {
      await this.clearDatabase();
    }

    const currentQuestions = await this.getAllQuestions();
    const existingIdMap = new Set(currentQuestions.map((q) => q.id));
    const savedQuestionIds: string[] = [];

    for (const q of questions) {
      if (mode === 'add_new' && existingIdMap.has(q.id)) {
        q.id = `xls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      }
      await this.saveQuestion(q);
      savedQuestionIds.push(q.id);
    }

    // Create collections if collectionNames provided and not existing
    let collectionsCreated = 0;
    const existingCols = await this.getAllCollections();

    for (const colName of collectionNames) {
      const trimmed = colName.trim();
      if (!trimmed) continue;

      let targetCol = existingCols.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      if (!targetCol) {
        // Create new collection
        const firstQ = questions[0];
        targetCol = {
          id: `col-xls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: trimmed,
          description: `Paket hasil impor Excel`,
          gradeLevel: firstQ ? firstQ.gradeLevel : 4,
          subject: firstQ ? firstQ.subject : 'Umum',
          topic: firstQ ? firstQ.topic : 'Topik Umum',
          questionIds: savedQuestionIds,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await this.saveCollection(targetCol);
        collectionsCreated++;
      } else {
        // Append question IDs to existing collection
        const combined = Array.from(new Set([...targetCol.questionIds, ...savedQuestionIds]));
        targetCol.questionIds = combined;
        await this.saveCollection(targetCol);
      }
    }

    return { questionsSaved: questions.length, collectionsCreated };
  }

  // --- CSV Export / Import ---
  public async exportQuestionsToCSV(): Promise<string> {
    const questions = await this.getAllQuestions();
    const headers = [
      'ID',
      'Kelas',
      'Mata Pelajaran',
      'Topik',
      'Subtopik',
      'Tingkat Kesulitan',
      'Teks Soal',
      'Pilihan A',
      'Pilihan B',
      'Pilihan C',
      'Pilihan D',
      'Kunci Jawaban (A/B/C/D)',
      'Pembahasan',
      'Tujuan Pembelajaran (CP/TP)',
    ];

    const rows = questions.map((q) => {
      const correctChar = ['A', 'B', 'C', 'D'][q.correctAnswer] || 'A';
      return [
        this.escapeCSV(q.id),
        q.gradeLevel,
        this.escapeCSV(q.subject),
        this.escapeCSV(q.topic),
        this.escapeCSV(q.subtopic || ''),
        q.difficulty,
        this.escapeCSV(q.questionText),
        this.escapeCSV(q.options[0] || ''),
        this.escapeCSV(q.options[1] || ''),
        this.escapeCSV(q.options[2] || ''),
        this.escapeCSV(q.options[3] || ''),
        correctChar,
        this.escapeCSV(q.explanation),
        this.escapeCSV(q.learningObjective || ''),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  private escapeCSV(value?: string | null): string {
    if (value === undefined || value === null) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  }

  // --- LocalStorage helpers ---
  private getQuestionsFromLocalStorage(): Question[] {
    try {
      const data = localStorage.getItem('eduquest_ar_questions');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveQuestionsToLocalStorage(list: Question[]): void {
    try {
      localStorage.setItem('eduquest_ar_questions', JSON.stringify(list));
    } catch {}
  }

  private getCollectionsFromLocalStorage(): QuestionCollection[] {
    try {
      const data = localStorage.getItem('eduquest_ar_collections');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveCollectionsToLocalStorage(list: QuestionCollection[]): void {
    try {
      localStorage.setItem('eduquest_ar_collections', JSON.stringify(list));
    } catch {}
  }
}

export const storageService = new StorageService();
