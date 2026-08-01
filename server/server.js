import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 3001;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'llama-3.3-70b-versatile';

// A safe fallback list shown if the live /v1/models call fails or the key
// doesn't have list-models permission. Edit freely to match what you use.
const FALLBACK_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];

function requireApiKey(res) {
  if (!GROQ_API_KEY) {
    res.status(500).json({ error: 'Server is missing GROQ_API_KEY. Add it to server/.env and restart.' });
    return false;
  }
  return true;
}

// --- Health check: confirms the server has a key and Groq is reachable ---
app.get('/api/health', async (_req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(503).json({ ok: false, error: 'Missing GROQ_API_KEY in server/.env' });
  }
  try {
    const r = await fetch(`${GROQ_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      throw new Error(`Groq responded with ${r.status}: ${text.slice(0, 200)}`);
    }
    res.json({ ok: true, provider: 'Groq' });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// --- List available chat models (powers the model picker) ---
app.get('/api/models', async (_req, res) => {
  if (!requireApiKey(res)) return;
  try {
    const r = await fetch(`${GROQ_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    });
    if (!r.ok) throw new Error(`Groq responded with ${r.status}`);
    const data = await r.json();
    const chatModels = (data.data || [])
      .map((m) => m.id)
      .filter((id) => !/(whisper|tts|guard|moderation|embedding)/.test(id))
      .sort();

    const names = chatModels.length ? chatModels : FALLBACK_MODELS;
    res.json({ models: names.map((name) => ({ name })) });
  } catch (err) {
    // Key works for chat but might lack list permission — fall back gracefully.
    res.json({ models: FALLBACK_MODELS.map((name) => ({ name })) });
  }
});

// --- Chat endpoint: streams tokens from Groq straight through to the client ---
app.post('/api/chat', async (req, res) => {
  if (!requireApiKey(res)) return;

  const { messages, model } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Request body must include a non-empty "messages" array.' });
  }

  try {
    const groqResponse = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages,
        stream: true,
      }),
    });

    if (!groqResponse.ok || !groqResponse.body) {
      const text = await groqResponse.text().catch(() => '');
      return res.status(502).json({ error: `Groq error (${groqResponse.status}): ${text || 'no response body'}` });
    }

    // Groq streams OpenAI-style Server-Sent Events ("data: {...}\n\n"). We
    // re-shape each chunk into { message: { content } } newline-delimited JSON
    // so the existing React client doesn't need to know which provider is behind it.
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = groqResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;

        try {
          const parsed = JSON.parse(payload);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            res.write(JSON.stringify({ message: { content: token } }) + '\n');
          }
        } catch {
          // Ignore malformed keep-alive lines
        }
      }
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(503).json({ error: `Could not reach Groq: ${err.message}` });
    } else {
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`AI chatbot server listening on http://localhost:${PORT}`);
  console.log(`Forwarding chat requests to Groq (${GROQ_BASE_URL})`);
});
