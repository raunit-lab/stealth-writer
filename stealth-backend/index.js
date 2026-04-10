import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

/* ------------------ UTILS ------------------ */

// Sentence variance (burstiness)
function getSentenceVariance(text) {
  const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);
  if (sentences.length <= 1) return 0;

  const lengths = sentences.map((s) => s.split(" ").length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;

  const variance =
    lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;

  return variance;
}

// Word entropy (diversity)
function getWordEntropy(text) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const freq = {};

  words.forEach((w) => {
    freq[w] = (freq[w] || 0) + 1;
  });

  const total = words.length;
  let entropy = 0;

  Object.values(freq).forEach((count) => {
    const p = count / total;
    entropy -= p * Math.log2(p);
  });

  return entropy;
}

// Strong human signals
function getStrongHumanSignals(text) {
  const signals = [
    "i", "got", "yeah", "kinda", "sort of", "turns out",
    "honestly", "just", "a bit", "though", "like"
  ];

  let score = 0;
  const lower = text.toLowerCase();

  signals.forEach((word) => {
    if (lower.includes(word)) score += 8;
  });

  return Math.min(score, 50);
}

// AI pattern signals
function getAISignals(text) {
  const phrases = [
    "furthermore", "moreover", "enhances", "facilitates",
    "overall", "significantly", "enables", "optimization",
    "in order to", "across various", "integration of",
    "leveraging", "scalable", "framework"
  ];

  let score = 0;
  const lower = text.toLowerCase();

  phrases.forEach((p) => {
    if (lower.includes(p)) score += 10;
  });

  return Math.min(score, 40);
}

/* ------------------ DETECTION ------------------ */

app.post("/api/detect", async (req, res) => {
  const { text } = req.body;

  try {
    // ---- Local signals ----
    const variance = getSentenceVariance(text);
    const entropy = getWordEntropy(text);

    const varianceScore = Math.min(variance * 10, 100);
    const entropyScore = Math.min(entropy * 20, 100);

    const humanScore = getStrongHumanSignals(text);
    const aiScoreBoost = getAISignals(text);

    // ---- LLM Prompt ----
    const prompt = `
You are an AI text detection system.

IMPORTANT:
- Do NOT assume clean or correct writing is AI-generated
- Humans can write clearly
- Focus on randomness, tone shifts, and natural phrasing

Analyze:
- Predictability
- Sentence variation
- Human tone

Return ONLY JSON:
{
  "score": number,
  "confidence": number,
  "reason": "short explanation"
}

Text:
"${text}"
`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "phi3:mini",
        prompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0.4,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "LLM failed");

    let llmResult = {};
    try {
      llmResult = JSON.parse(data.response);
    } catch {
      llmResult = { score: 50, confidence: 50, reason: "Fallback parsing" };
    }

    // ---- FINAL SCORE ----
    const finalScore = Math.round(
      (llmResult.score * 0.35) +
      (varianceScore * 0.2) +
      (entropyScore * 0.15) +
      (aiScoreBoost * 0.3) -
      (humanScore * 0.5)
    );

    res.json({
      score: Math.max(0, Math.min(100, finalScore)),
      confidence: llmResult.confidence || 60,
      signals: {
        variance: varianceScore.toFixed(2),
        entropy: entropyScore.toFixed(2),
        human: humanScore,
        ai: aiScoreBoost
      },
      reason: llmResult.reason,
    });

  } catch (error) {
    console.error("Detect Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/* ------------------ HUMANIZER ------------------ */

app.post("/api/humanize", async (req, res) => {
  const { text } = req.body;

  const prompt = `
Rewrite this text so it sounds like a real person casually wrote it.

STRICT RULES:
- Output ONLY the rewritten text
- No prefixes, no quotes, no explanations
- Keep exact meaning
- Use contractions
- Mix short and long sentences
- Add slight natural imperfections
- Avoid polished or professional tone

Text:
"${text}"
`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma:2b",
        prompt,
        stream: false,
        options: {
          temperature: 0.85,
          top_p: 0.9,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Humanizer failed");

    res.json({
      humanizedText: data.response.trim(),
    });

  } catch (error) {
    console.error("Humanize Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/* ------------------ SERVER ------------------ */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});