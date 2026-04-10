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
    
    // Strict mathematical grading rubric for Qwen
    const prompt = `Act as an expert AI text detector. Analyze the following text and calculate an AI probability score.
    Rules for calculating the score:
    1. Start at a base score of 50.
    2. Add 40 points if it uses highly formal or corporate words (e.g., delve, multifaceted, paramount, tapestry, crucial).
    3. Add 20 points if all sentences are roughly the exact same length.
    4. Subtract 40 points if it uses casual, conversational words (e.g., stuff, pretty simple, gotta, hey).
    5. Subtract 20 points if sentence lengths vary dramatically (mix of very short and very long).
    
    Cap the final score between 0 and 100. 
    Output ONLY a valid JSON object with exactly these two keys: "score" (a number) and "reason" (a short 1-sentence explanation).
    
    Text: "${text}"`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                model: 'qwen2.5:3b', 
                prompt, 
                stream: false, 
                format: 'json',
                options: { temperature: 0.1 } // Very low temp so the math is consistent
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to generate');

        res.json(JSON.parse(data.response));
    } catch (error) {
        console.error("Detect Error:", error.message);
        res.status(500).json({ error: `Backend Error: ${error.message}` });
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