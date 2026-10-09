import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const MODEL = "gemini-2.5-flash";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a chat summarization expert with 10 years of experience in natural language processing and summarization techniques. Your communication style is concise and informative.

Instructions:
1. Read the provided chat transcript carefully.
2. Identify the key points, main themes, and significant details from the conversation.
3. Summarize the chat clearly and concisely, making sure all crucial information is included.
4. Use bullet points (start each line with "- ") to highlight essential aspects.
5. Keep the summary between 150 and 200 words. If the chat is very short, keep it proportionally shorter.

Context: The summary is for team members who don't have time to read the whole chat but need to stay informed.

Output: Only the bullet-point summary. Professional, straightforward tone. No intro, no closing line.

Before answering, silently check: all key points covered, length within limits, bullet format, concise tone.`;

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/summarize", async (req, res) => {
  const chat = (req.body?.chat || "").trim();

  if (!chat) {
    return res.status(400).json({ error: "Paste a chat first." });
  }
  if (chat.length > 30000) {
    return res.status(400).json({ error: "Chat is too long. Keep it under 30,000 characters." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is missing in server/.env" });
  }

  try {
    const response = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: `Chat transcript:\n\n${chat}` }] }],
        generationConfig: { temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
      }),
    });

    if (response.status === 429) {
      return res.status(429).json({ error: "Free limit reached. Wait a minute and try again." });
    }
    if (!response.ok) {
      console.error(await response.text());
      return res.status(500).json({ error: "Gemini request failed. Check your API key." });
    }

    const data = await response.json();
    const summary = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("")
      .trim();
    if (!summary) {
      return res.status(500).json({ error: "Gemini returned an empty answer. Try again." });
    }
    const bullets = summary
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
    const wordCount = summary.split(/\s+/).filter(Boolean).length;

    res.json({ bullets, wordCount });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Could not reach Gemini. Check your internet." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));