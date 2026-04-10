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

app.post('/api/humanize', async (req, res) => {
    const { text } = req.body;
    
    // The updated, strict prompt
    const prompt = `Rewrite the following text to sound 100% human. 
    Rules:
    1. Write casually, like a quick message to a coworker.
    2. Vary sentence length. Mix very short sentences with longer ones.
    3. Strip out ALL corporate jargon (do not use words like: crucial, paramount, cutting-edge, navigate, realm, delve, tapestry).
    4. FATAL RULE: DO NOT add any new information, analogies, examples, or greetings (like "Hey guys"). ONLY rewrite the exact meaning of the original text.
    Original Text: "${text}"`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                model: 'llama3.2:latest', 
                prompt, 
                stream: false,
                options: {
                    temperature: 0.85, // Dialed back from 1.3 to prevent hallucinations
                    top_p: 0.9      
                }
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Failed to generate');

        res.json({ humanizedText: data.response });
    } catch (error) {
        console.error("Humanize Error:", error.message);
        res.status(500).json({ error: `Backend Error: ${error.message}` });
    }
});

app.listen(process.env.PORT, () => console.log(`API running on port ${process.env.PORT}`));