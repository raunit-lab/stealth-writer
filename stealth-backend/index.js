// index.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Endpoint 1: AI Detection (Using Qwen 2.5 for strict JSON logic)
app.post('/api/detect', async (req, res) => {
    const { text } = req.body;
    const prompt = `Analyze this text for AI generation. Look for low burstiness and high perplexity. Output ONLY a JSON object with a "score" (0-100) and a short "reason". Text: "${text}"`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'qwen2.5:3b', prompt, stream: false, format: 'json' })
        });
        const data = await response.json();
        res.json(JSON.parse(data.response));
    } catch (error) {
        res.status(500).json({ error: 'Detection failed' });
    }
});

// Endpoint 2: Text Humanizer (Using Llama 3.2 for natural writing)
app.post('/api/humanize', async (req, res) => {
    const { text } = req.body;
    const prompt = `Rewrite this text to bypass AI detection. Use high burstiness (mix short and long sentences). Use an active, slightly conversational tone. Do not use words like 'delve', 'tapestry', or 'crucial'. Return ONLY the rewritten text. Original: "${text}"`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama3.2', prompt, stream: false })
        });
        const data = await response.json();
        res.json({ humanizedText: data.response });
    } catch (error) {
        res.status(500).json({ error: 'Humanization failed' });
    }
});

app.listen(process.env.PORT, () => console.log(`API running on port ${process.env.PORT}`));