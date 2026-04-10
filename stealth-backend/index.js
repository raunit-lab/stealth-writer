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

// Simple entropy (word diversity)
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

/* ------------------ DETECTION ------------------ */

app.post("/api/detect", async (req, res) => {
  const { text } = req.body;

  try {
    // ---- Local signals ----
    const variance = getSentenceVariance(text);
    const entropy = getWordEntropy(text);

    // Normalize signals
    const varianceScore = Math.min(variance * 10, 100); // scaled
    const entropyScore = Math.min(entropy * 20, 100);

    // ---- LLM Prompt ----
    const prompt = `
You are an AI text detector.

Analyze:
- Predictability
- Sentence variation
- Human imperfections

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
          temperature: 0.2,
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

    // ---- Final Score Fusion ----
    const finalScore = Math.round(
      llmResult.score * 0.4 + // ↓ reduce LLM dominance
        varianceScore * 0.3 +
        entropyScore * 0.3,
    );

    res.json({
      score: Math.max(0, Math.min(100, finalScore)),
      confidence: llmResult.confidence || 60,
      signals: {
        variance: varianceScore.toFixed(2),
        entropy: entropyScore.toFixed(2),
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
Rewrite this text to sound like a real person wrote it casually.

STRICT RULES:
- Output ONLY the rewritten text
- No quotes, no explanations
- Keep exact meaning
- Use contractions (it's, don't, kinda, etc.)
- Mix very short and longer sentences
- Add slight natural imperfections (like small redundancy or informal phrasing)
- Avoid polished or professional tone

Make it feel slightly imperfect, like typed quickly.

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
          temperature: 0.8,
          top_p: 0.9,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Humanizer failed");

    res.json({
      humanizedText: data.response,
    });
  } catch (error) {
    console.error("Humanize Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/* ------------------ SERVER ------------------ */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT}`);
});
