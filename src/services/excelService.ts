import * as XLSX from 'xlsx';
import { Question, QuestionCollection, GradeLevel, DifficultyLevel } from '../types/question';

export interface ExcelImportRowError {
  rowNumber: number;
  questionTextSnippet: string;
  field: string;
  message: string;
}

export interface ExcelImportPreview {
  fileName: string;
  totalRows: number;
  validQuestions: Question[];
  invalidRows: ExcelImportRowError[];
  duplicateCount: number;
  collectionNames: string[];
  canProceed: boolean;
}

export type ExcelImportMode = 'add_new' | 'update_existing' | 'replace_all';

const COLUMN_HEADERS = [
  'QuestionID',
  'CollectionName',
  'Grade',
  'Subject',
  'Topic',
  'Subtopic',
  'LearningObjective',
  'Difficulty',
  'QuestionType',
  'QuestionText',
  'OptionA',
  'OptionB',
  'OptionC',
  'OptionD',
  'CorrectAnswer',
  'Explanation',
  'Tags',
];

const LETTER_TO_INDEX: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
};

const INDEX_TO_LETTER = ['A', 'B', 'C', 'D'];

export class ExcelService {
  /**
   * Export all questions and collections into a formatted .xlsx workbook
   */
  public exportAllToExcel(
    questions: Question[],
    collections: QuestionCollection[],
    fileName = `EduQuestAR_BankSoal_${new Date().toISOString().slice(0, 10)}.xlsx`
  ) {
    const wb = XLSX.utils.book_new();

    // 1. Questions Sheet Data
    const questionRows = questions.map((q) => {
      // Find collection name this question belongs to
      const matchedCols = collections
        .filter((c) => c.questionIds.includes(q.id))
        .map((c) => c.name);
      const colName = matchedCols.length > 0 ? matchedCols.join('; ') : '';

      const isTrueFalse = q.type === 'true_false';
      let correctDisplay = 'A';
      if (isTrueFalse) {
        correctDisplay = q.correctAnswer === 0 ? 'BENAR' : 'SALAH';
      } else {
        correctDisplay = INDEX_TO_LETTER[q.correctAnswer] || 'A';
      }

      return {
        QuestionID: q.id,
        CollectionName: colName,
        Grade: q.gradeLevel,
        Subject: q.subject,
        Topic: q.topic,
        Subtopic: q.subtopic || '',
        LearningObjective: q.learningObjective || '',
        Difficulty: q.difficulty,
        QuestionType: q.type || 'multiple_choice',
        QuestionText: q.questionText,
        OptionA: q.options[0] || (isTrueFalse ? 'BENAR' : ''),
        OptionB: q.options[1] || (isTrueFalse ? 'SALAH' : ''),
        OptionC: isTrueFalse ? '' : (q.options[2] || ''),
        OptionD: isTrueFalse ? '' : (q.options[3] || ''),
        CorrectAnswer: correctDisplay,
        Explanation: q.explanation,
        Tags: q.tags ? q.tags.join(', ') : '',
      };
    });

    const wsQuestions = XLSX.utils.json_to_sheet(questionRows, { header: COLUMN_HEADERS });
    this.applyColumnWidths(wsQuestions);
    XLSX.utils.book_append_sheet(wb, wsQuestions, 'Questions');

    // 2. Collections Companion Sheet
    const collectionRows = collections.map((c) => ({
      CollectionID: c.id,
      CollectionName: c.name,
      Grade: c.gradeLevel,
      Subject: c.subject,
      Topic: c.topic,
      Description: c.description || '',
      TotalQuestions: c.questionIds.length,
    }));
    const wsCollections = XLSX.utils.json_to_sheet(collectionRows);
    XLSX.utils.book_append_sheet(wb, wsCollections, 'Collections');

    // 3. Instructions Sheet
    const wsInstructions = this.createInstructionsSheet();
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Write file
    XLSX.writeFile(wb, fileName);
  }

  /**
   * Export questions of a single collection
   */
  public exportCollectionToExcel(
    collection: QuestionCollection,
    allQuestions: Question[],
    fileName?: string
  ) {
    const targetQuestions = allQuestions.filter((q) => collection.questionIds.includes(q.id));
    const safeName = collection.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const finalFileName =
      fileName || `EduQuestAR_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    this.exportAllToExcel(targetQuestions, [collection], finalFileName);
  }

  /**
   * Download a blank Excel template with sample row and full instructions
   */
  public downloadTemplate(fileName = 'EduQuestAR_Template_BankSoal.xlsx') {
    const wb = XLSX.utils.book_new();

    // 1. Template Questions Sheet with 2 clear sample rows
    const sampleRows = [
      {
        QuestionID: 'SAMPLE-IPAS-01',
        CollectionName: 'IPAS Kelas 4 - Tumbuhan',
        Grade: 4,
        Subject: 'IPAS',
        Topic: 'Tumbuhan Sumber Kehidupan',
        Subtopic: 'Fotosintesis',
        LearningObjective: 'Memahami proses fotosintesis pada tumbuhan',
        Difficulty: 'medium',
        QuestionType: 'multiple_choice',
        QuestionText: 'Gas apakah yang diserap tumbuhan saat fotosintesis?',
        OptionA: 'Oksigen',
        OptionB: 'Karbon Dioksida',
        OptionC: 'Nitrogen',
        OptionD: 'Hidrogen',
        CorrectAnswer: 'B',
        Explanation: 'Tumbuhan menyerap karbon dioksida (CO2) dan air untuk membuat glukosa dan oksigen.',
        Tags: 'fotosintesis, daun, tumbuhan',
      },
      {
        QuestionID: 'SAMPLE-MAT-01',
        CollectionName: 'Matematika Kelas 3 - Pecahan',
        Grade: 3,
        Subject: 'Matematika',
        Topic: 'Pecahan Sederhana',
        Subtopic: 'Pengenalan',
        LearningObjective: 'Menyatakan bagian benda dalam bentuk pecahan',
        Difficulty: 'easy',
        QuestionType: 'multiple_choice',
        QuestionText: 'Sebuah apel dipotong menjadi 4 bagian sama besar. Nilai 1 potong apel adalah...',
        OptionA: '1/2',
        OptionB: '1/3',
        OptionC: '1/4',
        OptionD: '2/4',
        CorrectAnswer: 'C',
        Explanation: 'Satu dari empat potong bernilai 1/4.',
        Tags: 'pecahan, dasar',
      },
    ];

    const wsQuestions = XLSX.utils.json_to_sheet(sampleRows, { header: COLUMN_HEADERS });
    this.applyColumnWidths(wsQuestions);
    XLSX.utils.book_append_sheet(wb, wsQuestions, 'Questions');

    // 2. Instructions Sheet
    const wsInstructions = this.createInstructionsSheet();
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    XLSX.writeFile(wb, fileName);
  }

  /**
   * Parse uploaded Excel file and validate every single row with clear error messages
   */
  public async parseExcelFile(file: File): Promise<ExcelImportPreview> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });

    // Find questions sheet
    let sheetName = 'Questions';
    if (!wb.Sheets[sheetName]) {
      // Find first sheet that is not instructions
      const candidates = wb.SheetNames.filter((s) => !s.toLowerCase().includes('instruction'));
      sheetName = candidates[0] || wb.SheetNames[0];
    }

    const ws = wb.Sheets[sheetName];
    if (!ws) {
      return {
        fileName: file.name,
        totalRows: 0,
        validQuestions: [],
        invalidRows: [
          {
            rowNumber: 1,
            questionTextSnippet: '',
            field: 'Worksheet',
            message: 'Lembar kerja (sheet) "Questions" tidak ditemukan dalam file Excel ini.',
          },
        ],
        duplicateCount: 0,
        collectionNames: [],
        canProceed: false,
      };
    }

    // Convert sheet to json array with raw headers
    const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const validQuestions: Question[] = [];
    const invalidRows: ExcelImportRowError[] = [];
    const seenIds = new Set<string>();
    const collectionSet = new Set<string>();
    let duplicateCount = 0;

    rawData.forEach((row, index) => {
      const rowNum = index + 2; // Row 1 is header, so row 2 is first data row
      const qText = String(row.QuestionText || row['Teks Soal'] || row.Question || '').trim();

      // Skip completely empty rows
      if (
        !qText &&
        !row.OptionA &&
        !row.OptionB &&
        !row.OptionC &&
        !row.OptionD &&
        !row.Subject &&
        !row.Topic
      ) {
        return;
      }

      // Check required question text
      if (!qText) {
        invalidRows.push({
          rowNumber: rowNum,
          questionTextSnippet: '(Kosong)',
          field: 'QuestionText',
          message: 'Teks soal (QuestionText) tidak boleh kosong.',
        });
        return;
      }

      // Detect QuestionType
      let rawType = String(row.QuestionType || row['Tipe Soal'] || '').trim().toLowerCase();
      const isTrueFalse =
        rawType === 'true_false' ||
        rawType === 'benar_salah' ||
        rawType === 'tf' ||
        rawType === 'true/false';
      const questionType = isTrueFalse ? 'true_false' : 'multiple_choice';

      let optA = String(row.OptionA || row['Pilihan A'] || '').trim();
      let optB = String(row.OptionB || row['Pilihan B'] || '').trim();
      let optC = String(row.OptionC || row['Pilihan C'] || '').trim();
      let optD = String(row.OptionD || row['Pilihan D'] || '').trim();
      let correctIdx = 0;

      if (isTrueFalse) {
        if (!optA) optA = 'BENAR';
        if (!optB) optB = 'SALAH';

        const rawCorrect = String(
          row.CorrectAnswer || row['Kunci Jawaban'] || row.Answer || 'BENAR'
        ).trim().toUpperCase();

        if (
          rawCorrect === 'BENAR' ||
          rawCorrect === 'TRUE' ||
          rawCorrect === 'B' ||
          rawCorrect === 'T' ||
          rawCorrect === '0' ||
          rawCorrect === 'A'
        ) {
          correctIdx = 0; // BENAR
        } else if (
          rawCorrect === 'SALAH' ||
          rawCorrect === 'FALSE' ||
          rawCorrect === 'S' ||
          rawCorrect === 'F' ||
          rawCorrect === '1'
        ) {
          correctIdx = 1; // SALAH
        } else {
          invalidRows.push({
            rowNumber: rowNum,
            questionTextSnippet: qText.slice(0, 35) + '...',
            field: 'CorrectAnswer',
            message: `Kunci jawaban True/False "${rawCorrect}" tidak valid. Gunakan 'BENAR' / 'TRUE' atau 'SALAH' / 'FALSE'.`,
          });
          return;
        }
      } else {
        // Multiple choice requires 4 options
        if (!optA || !optB || !optC || !optD) {
          invalidRows.push({
            rowNumber: rowNum,
            questionTextSnippet: qText.slice(0, 35) + '...',
            field: 'Options',
            message: 'Semua 4 pilihan jawaban (OptionA, OptionB, OptionC, OptionD) harus terisi untuk pilihan ganda.',
          });
          return;
        }

        const rawCorrect = String(
          row.CorrectAnswer || row['Kunci Jawaban'] || row.Answer || 'A'
        ).trim().toUpperCase();
        const parsed = LETTER_TO_INDEX[rawCorrect];

        if (parsed === undefined || parsed < 0 || parsed > 3) {
          invalidRows.push({
            rowNumber: rowNum,
            questionTextSnippet: qText.slice(0, 35) + '...',
            field: 'CorrectAnswer',
            message: `Kunci jawaban "${rawCorrect}" tidak valid. Harus bernilai 'A', 'B', 'C', atau 'D'.`,
          });
          return;
        }
        correctIdx = parsed;
      }

      // Parse grade (default 4)
      let grade = parseInt(row.Grade || row.Kelas || '4', 10);
      if (isNaN(grade) || grade < 1 || grade > 6) {
        grade = 4;
      }

      // Parse difficulty
      let diff = String(row.Difficulty || row.Kesulitan || 'medium').trim().toLowerCase();
      if (!['easy', 'medium', 'hard'].includes(diff)) {
        if (diff === 'mudah') diff = 'easy';
        else if (diff === 'sedang') diff = 'medium';
        else if (diff === 'menantang' || diff === 'sulit') diff = 'hard';
        else diff = 'medium';
      }

      // Parse ID or generate clean unique ID
      let qId = String(row.QuestionID || row.ID || '').trim();
      if (!qId) {
        qId = `imp-xls-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      } else if (seenIds.has(qId)) {
        duplicateCount++;
        // Append unique suffix to avoid collision
        qId = `${qId}-dup-${Math.random().toString(36).substring(2, 6)}`;
      }
      seenIds.add(qId);

      // Collect collection names
      const colName = String(row.CollectionName || row['Paket Kuis'] || '').trim();
      if (colName) {
        colName.split(';').forEach((cn) => {
          const trimmed = cn.trim();
          if (trimmed) collectionSet.add(trimmed);
        });
      }

      // Tags
      const rawTags = String(row.Tags || '').trim();
      const tags = rawTags
        ? rawTags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const validQ: Question = {
        id: qId,
        gradeLevel: grade as GradeLevel,
        subject: String(row.Subject || row['Mata Pelajaran'] || 'Umum').trim(),
        topic: String(row.Topic || row.Topik || 'Topik Umum').trim(),
        subtopic: row.Subtopic ? String(row.Subtopic).trim() : undefined,
        learningObjective: row.LearningObjective ? String(row.LearningObjective).trim() : undefined,
        difficulty: diff as DifficultyLevel,
        questionText: qText,
        type: questionType,
        options: isTrueFalse ? [optA, optB] : [optA, optB, optC, optD],
        correctAnswer: correctIdx,
        explanation: String(row.Explanation || row.Pembahasan || 'Pembahasan materi.').trim(),
        tags,
        source: 'imported',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      validQuestions.push(validQ);
    });

    return {
      fileName: file.name,
      totalRows: rawData.length,
      validQuestions,
      invalidRows,
      duplicateCount,
      collectionNames: Array.from(collectionSet),
      canProceed: validQuestions.length > 0,
    };
  }

  private applyColumnWidths(ws: XLSX.WorkSheet) {
    ws['!cols'] = [
      { wch: 18 }, // QuestionID
      { wch: 25 }, // CollectionName
      { wch: 8 }, // Grade
      { wch: 16 }, // Subject
      { wch: 25 }, // Topic
      { wch: 18 }, // Subtopic
      { wch: 30 }, // LearningObjective
      { wch: 12 }, // Difficulty
      { wch: 15 }, // QuestionType
      { wch: 45 }, // QuestionText
      { wch: 22 }, // OptionA
      { wch: 22 }, // OptionB
      { wch: 22 }, // OptionC
      { wch: 22 }, // OptionD
      { wch: 14 }, // CorrectAnswer
      { wch: 40 }, // Explanation
      { wch: 20 }, // Tags
    ];
  }

  private createInstructionsSheet(): XLSX.WorkSheet {
    const instructions = [
      {
        Kolom: 'QuestionID',
        Status: 'Opsional',
        Deskripsi: 'ID unik soal (contoh: IPAS-001). Jika dikosongkan, sistem akan membuatkan ID otomatis.',
      },
      {
        Kolom: 'CollectionName',
        Status: 'Opsional',
        Deskripsi: 'Nama paket kuis. Jika diisi, soal akan otomatis dimasukkan ke dalam paket kuis ini saat diimpor.',
      },
      {
        Kolom: 'Grade',
        Status: 'Wajib',
        Deskripsi: 'Jenjang kelas SD: angka 1, 2, 3, 4, 5, atau 6.',
      },
      {
        Kolom: 'Subject',
        Status: 'Wajib',
        Deskripsi: 'Mata pelajaran (contoh: IPAS, Matematika, Bahasa Indonesia, Pendidikan Pancasila, Bahasa Inggris).',
      },
      {
        Kolom: 'Topic',
        Status: 'Wajib',
        Deskripsi: 'Topik materi pelajaran yang diujikan.',
      },
      {
        Kolom: 'Subtopic',
        Status: 'Opsional',
        Deskripsi: 'Subtopik atau pokok bahasan khusus.',
      },
      {
        Kolom: 'LearningObjective',
        Status: 'Opsional',
        Deskripsi: 'Capaian Pembelajaran (CP) atau Tujuan Pembelajaran (TP).',
      },
      {
        Kolom: 'Difficulty',
        Status: 'Wajib',
        Deskripsi: 'Tingkat kesulitan: easy (mudah), medium (sedang), atau hard (menantang).',
      },
      {
        Kolom: 'QuestionType',
        Status: 'Wajib',
        Deskripsi: 'Tipe soal: isi dengan "multiple_choice" (pilihan ganda).',
      },
      {
        Kolom: 'QuestionText',
        Status: 'Wajib',
        Deskripsi: 'Teks pertanyaan yang jelas dan ramah anak.',
      },
      {
        Kolom: 'OptionA',
        Status: 'Wajib',
        Deskripsi: 'Teks pilihan jawaban A.',
      },
      {
        Kolom: 'OptionB',
        Status: 'Wajib',
        Deskripsi: 'Teks pilihan jawaban B.',
      },
      {
        Kolom: 'OptionC',
        Status: 'Wajib',
        Deskripsi: 'Teks pilihan jawaban C.',
      },
      {
        Kolom: 'OptionD',
        Status: 'Wajib',
        Deskripsi: 'Teks pilihan jawaban D.',
      },
      {
        Kolom: 'CorrectAnswer',
        Status: 'Wajib',
        Deskripsi: 'Huruf kunci jawaban yang benar: hanya diisi A, B, C, atau D.',
      },
      {
        Kolom: 'Explanation',
        Status: 'Wajib',
        Deskripsi: 'Pembahasan materi edukatif mengapa jawaban tersebut benar.',
      },
      {
        Kolom: 'Tags',
        Status: 'Opsional',
        Deskripsi: 'Kata kunci pencarian dipisahkan dengan koma (contoh: daun, akar, tumbuhan).',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(instructions);
    ws['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 65 }];
    return ws;
  }
}

export const excelService = new ExcelService();
