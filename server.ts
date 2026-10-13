import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { generateEducationalQuestions, testGeminiApiKey } from './src/server/geminiApi';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  const hasKey = !!(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() !== '' &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );
  res.json({
    status: 'ok',
    geminiConfigured: hasKey,
    timestamp: Date.now(),
  });
});

app.post('/api/test-gemini-key', async (req, res) => {
  try {
    const result = await testGeminiApiKey(req.body?.apiKey);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

app.post('/api/generate-questions', async (req, res) => {
  try {
    const result = await generateEducationalQuestions(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// Serve static frontend in production
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`EduQuest AR server running on http://localhost:${PORT}`);
});
