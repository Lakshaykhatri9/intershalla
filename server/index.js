import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { OpenAI } from 'openai';

dotenv.config();

const PORT = process.env.PORT || 4000;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_TEXT_CHARS = 12000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed.'));
      return;
    }
    cb(null, true);
  },
});

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const app = express();
app.use(cors());
app.use(express.json());

const normalizeRule = (rule = '') =>
  String(rule)
    .trim()
    .replace(/\s+/g, ' ');

const truncateDocument = (text) => {
  if (!text) return '';
  if (text.length <= MAX_TEXT_CHARS) return text;
  return `${text.slice(0, MAX_TEXT_CHARS)}\n[Document truncated for analysis]`;
};

const safeJsonParse = (input) => {
  try {
    return JSON.parse(input);
  } catch (error) {
    return null;
  }
};

const evaluateRuleWithLLM = async (rule, documentText) => {
  if (!openaiClient) {
    throw new Error(
      'OpenAI API key is missing. Set OPENAI_API_KEY in your environment.'
    );
  }

  const prompt = `
You are a compliance assistant auditing PDF documents against specific rules.
Return a strict JSON object with these keys:
{
  "status": "pass" | "fail",
  "evidence": "Direct quote (<= 2 sentences) or \"Not found.\"",
  "reasoning": "Very short explanation (<= 20 words).",
  "confidence": 0-100
}

Rule: "${rule}"
Document:
"""
${documentText}
"""

If the document text does not contain enough information, respond with status "fail".
`;

  const completion = await openaiClient.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    max_tokens: 250,
    messages: [
      {
        role: 'system',
        content:
          'You evaluate whether documents satisfy given rules and return strict JSON responses.',
      },
      {
        role: 'user',
        content: prompt.trim(),
      },
    ],
  });

  const rawContent =
    completion.choices?.[0]?.message?.content?.trim() ?? '{"status":"fail","evidence":"Not found.","reasoning":"Model did not respond.","confidence":0}';

  const parsed = safeJsonParse(rawContent) || {};

  const status = parsed.status === 'pass' ? 'pass' : 'fail';
  const evidence =
    typeof parsed.evidence === 'string' && parsed.evidence.length > 0
      ? parsed.evidence
      : 'Not found.';
  const reasoning =
    typeof parsed.reasoning === 'string' && parsed.reasoning.length > 0
      ? parsed.reasoning
      : 'No reasoning provided.';
  const confidence =
    typeof parsed.confidence === 'number' && parsed.confidence >= 0
      ? Math.min(100, Math.max(0, Math.round(parsed.confidence)))
      : 0;

  return { rule, status, evidence, reasoning, confidence };
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post(
  '/api/check-document',
  upload.single('file'),
  async (req, res) => {
    try {
      console.log('Received request to check document');
      
      if (!req.file) {
        console.log('Error: No file uploaded');
        return res.status(400).json({ error: 'A PDF file is required.' });
      }

      console.log(`File received: ${req.file.originalname}, size: ${req.file.size} bytes`);

      const rulesPayload = req.body.rules;
      if (!rulesPayload) {
        console.log('Error: No rules provided');
        return res.status(400).json({ error: 'Rules are required.' });
      }

      let rules = [];
      try {
        rules = JSON.parse(rulesPayload);
      } catch (error) {
        console.log('Error parsing rules:', error.message);
        return res.status(400).json({ error: 'Rules must be a JSON array.' });
      }

      if (!Array.isArray(rules) || rules.length === 0) {
        console.log('Error: Rules array is empty');
        return res.status(400).json({ error: 'Provide at least one rule.' });
      }

      console.log(`Processing ${rules.length} rules`);

      const normalizedRules = rules
        .map(normalizeRule)
        .filter((rule) => rule.length > 0)
        .slice(0, 10);

      if (normalizedRules.length === 0) {
        return res
          .status(400)
          .json({ error: 'Rules must contain meaningful text.' });
      }

      console.log('Parsing PDF...');
      const pdfData = await pdfParse(req.file.buffer);
      const documentText = truncateDocument(pdfData.text);
      console.log(`PDF parsed. Text length: ${documentText.length} characters`);

      if (!documentText || documentText.trim().length === 0) {
        console.log('Warning: PDF appears to be empty or unreadable');
      }

      if (!openaiClient) {
        console.log('Error: OpenAI client not initialized');
        return res.status(500).json({ 
          error: 'OpenAI API key is missing. Please set OPENAI_API_KEY in your .env file.' 
        });
      }

      console.log('Evaluating rules with LLM...');
      const evaluations = await Promise.all(
        normalizedRules.map(async (rule) => {
          try {
            return await evaluateRuleWithLLM(rule, documentText);
          } catch (error) {
            console.error(`Error evaluating rule "${rule}":`, error.message);
            return {
              rule,
              status: 'fail',
              evidence: 'Not available due to server error.',
              reasoning: error.message || 'LLM evaluation failed.',
              confidence: 0,
            };
          }
        })
      );

      console.log('Evaluation complete. Returning results.');
      res.json({ results: evaluations });
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({
        error: 'Unable to process the document.',
        details: error.message,
      });
    }
  }
);

app.use((err, _req, res, _next) => {
  if (err.message === 'Only PDF files are allowed.') {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'PDF must be <= 15MB.' });
  }
  return res.status(500).json({ error: 'Unexpected server error.' });
});

// Catch-all error handler for unhandled routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});


