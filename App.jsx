import { useState } from "react";

const SAMPLE = `Asha: Did the venue confirm for Saturday?
Ravi: Yes, but they moved check-in to 4 PM.
Asha: Okay. Budget is still fine, right?
Ravi: Within budget, but catering quote went up by 10%.
Meera: I can handle the posters, will share drafts by Thursday.
Asha: Great. Ravi, please confirm the final headcount with catering by Wednesday.`;

export default function App() {
  const [chat, setChat] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function summarize() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copySummary() {
    navigator.clipboard.writeText(result.bullets.map((b) => `- ${b}`).join("\n"));
  }

  return (
    <main className="page">
      <header className="top">
        <h1>CatchUp AI</h1>
        <p>Paste a group chat. Get what you missed in under 200 words.</p>
      </header>

      <div className="grid">
        <section className="panel">
          <div className="panel-head">
            <label htmlFor="chat">Chat transcript</label>
            <button className="link" onClick={() => setChat(SAMPLE)}>
              Use sample chat
            </button>
          </div>
          <textarea
            id="chat"
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            placeholder={"Name: message\nName: message"}
          />
          <button className="primary" onClick={summarize} disabled={loading || !chat.trim()}>
            {loading ? "Summarizing…" : "Summarize chat"}
          </button>
        </section>

        <section className="panel out" aria-live="polite">
          <div className="panel-head">
            <span className="label">Summary</span>
            {result && (
              <button className="link" onClick={copySummary}>
                Copy summary
              </button>
            )}
          </div>

          {error && <p className="error">{error}</p>}
          {!result && !error && !loading && (
            <p className="empty">Your summary will appear here. Paste a chat and select Summarize chat.</p>
          )}
          {loading && <p className="empty">Reading the chat…</p>}

          {result && (
            <>
              <ul>
                {result.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              <p className="count">{result.wordCount} words</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}