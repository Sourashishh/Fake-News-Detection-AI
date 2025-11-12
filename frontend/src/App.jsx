import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/predict";
const FEEDBACK_URL = "http://localhost:5000/feedback";
const STORAGE_KEY = "fake_news_history_v1";

function prettyPercent(v) { return `${(v * 100).toFixed(2)}%`; }

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div style={{ width: `${pct}%` }} className="h-3 rounded-full transition-all duration-300 bg-sky-500" />
    </div>
  );
}

function FeaturePill({ feature, score }) {
  const s = Math.abs(score);
  const width = Math.min(100, 8 + s * 200);
  return (
    <div className="flex items-center gap-2 mr-2 mb-2">
      <div className="px-2 py-1 rounded-full bg-gray-100 text-sm border">
        <strong>{feature}</strong>
      </div>
      <div className="h-3 bg-gray-200 rounded-full" style={{ width }}>
        <div
          className={`h-3 rounded-full ${score > 0 ? "bg-green-500" : "bg-red-500"}`}
          style={{ width: `${Math.min(100, (s * 100).toFixed(0))}%` }}
        />
      </div>
    </div>
  );
}

export default function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const textRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch (e) { console.warn("Failed to read history:", e); }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 100))); }
    catch (e) { console.warn("Failed to save history:", e); }
  }, [history]);

  function pushHistory(item) { setHistory((h) => [item, ...h].slice(0, 200)); }

  async function submit() {
    if (!text || text.trim().length < 5) { setError("Please enter at least a short paragraph to analyze."); return; }
    setError(null); setLoading(true); setResult(null);
    try {
      const resp = await axios.post(API_URL, { text });
      const data = resp.data;
      const entry = { id: new Date().toISOString(), text, label: data.label, confidence: data.confidence, explanation: data.explanation };
      setResult(entry); pushHistory(entry);
    } catch (err) {
      console.error(err);
      setError("Failed to call the backend. Is the Flask server running on http://localhost:5000 ?");
    } finally { setLoading(false); }
  }

  function clearForm() { setText(""); setResult(null); textRef.current?.focus(); }

  function copyResult() {
    if (!result) return;
    const out = `Label: ${result.label}\nConfidence: ${prettyPercent(result.confidence)}\n\n${result.explanation ? JSON.stringify(result.explanation, null, 2) : ""}`;
    navigator.clipboard.writeText(out).then(() => alert("Result copied to clipboard"));
  }

  function exportHistory() {
    if (!history.length) { alert("No history to export."); return; }
    const csvRows = [["timestamp", "label", "confidence", "text"].join(","), ...history.map(h => [h.id, h.label, h.confidence, `"${(h.text||"").replace(/"/g,'""')}"`].join(","))];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "fake_news_history.csv"; a.click(); URL.revokeObjectURL(url);
  }

  async function sendFeedback(pred, correctLabel) {
    const fb = { id: new Date().toISOString(), text: pred.text, predicted: pred.label, correct: correctLabel };
    pushHistory({ ...pred, feedback: correctLabel });
    try { await axios.post(FEEDBACK_URL, { text: pred.text, feedback: correctLabel }); } catch (e) {}
    alert("Thanks — feedback saved.");
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-sky-700">Fake News Detector</h1>
          <p className="text-gray-600 mt-2 text-lg">
            Paste an article or a paragraph and press <strong>Detect</strong>. Model trained with <code>TF-IDF + Logistic Regression</code>.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg">
            <label className="block text-sm font-medium text-gray-700">Article / Text</label>
            <textarea ref={textRef} value={text} onChange={(e)=>setText(e.target.value)} placeholder="Paste news text here..." className="w-full mt-2 p-3 border rounded h-44 resize-vertical focus:outline-none focus:ring-2 focus:ring-sky-400" />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button onClick={submit} disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-60">
                  {loading ? "Analyzing..." : "Detect"}
                </button>
                <button onClick={clearForm} className="px-3 py-2 border rounded">Clear</button>
                <button onClick={()=>{ setText(example1); }} className="px-3 py-2 border rounded">Example</button>
              </div>
              <div className="text-sm text-gray-500">Characters: {text.length}</div>
            </div>

            {error && <div className="mt-4 text-red-600">{error}</div>}

            {result && (
              <div className="mt-4 p-4 bg-gray-50 border rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Label</div>
                    <div className="text-xl font-semibold">{result.label}</div>
                    <div className="text-sm text-gray-500 mt-1">Confidence: {prettyPercent(result.confidence)}</div>
                    <div className="mt-2 w-48"><ProgressBar value={result.confidence} /></div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button onClick={copyResult} className="px-3 py-1 border rounded">Copy</button>
                    <button onClick={()=>exportHistory()} className="px-3 py-1 border rounded">Export history</button>
                  </div>
                </div>

                {result.explanation && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700">Top features</div>
                    <div className="mt-2">
                      <div className="text-xs text-green-700 mb-1">Positive (toward REAL)</div>
                      <div className="flex flex-wrap">{(result.explanation.positive||[]).map(([f,v]) => <FeaturePill key={`p-${f}`} feature={f} score={v} />)}</div>
                      <div className="text-xs text-red-700 mt-3 mb-1">Negative (toward FAKE)</div>
                      <div className="flex flex-wrap">{(result.explanation.negative||[]).map(([f,v]) => <FeaturePill key={`n-${f}`} feature={f} score={v} />)}</div>
                    </div>
                  </div>
                )}

                <div className="mt-4 border-t pt-3 flex items-center gap-3">
                  <div className="text-sm text-gray-600">Was this correct?</div>
                  <button onClick={()=>sendFeedback(result, result.label)} className="px-3 py-1 bg-green-100 rounded border">Yes</button>
                  <button onClick={()=>{ const other = result.label==="REAL"?"FAKE":"REAL"; sendFeedback(result, other); }} className="px-3 py-1 bg-red-100 rounded border">No — mark as other</button>
                </div>
              </div>
            )}
          </section>

          <aside className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Recent history</h3>
              <button onClick={()=>{ setHistory([]); localStorage.removeItem(STORAGE_KEY); }} className="text-sm text-red-500">Clear</button>
            </div>

            {!history.length && <div className="text-sm text-gray-500">No history yet. Your predictions are saved locally.</div>}

            <ul className="space-y-3 max-h-[65vh] overflow-auto">
              {history.map(h => (
                <li key={h.id} className="border rounded p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600">{new Date(h.id).toLocaleString()}</div>
                      <div className="font-medium">{h.label} — {prettyPercent(h.confidence)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button onClick={()=>{ setText(h.text); window.scrollTo({ top:0, behavior:'smooth' }); }} className="text-xs px-2 py-1 border rounded">Load</button>
                      <button onClick={()=>navigator.clipboard.writeText(h.text)} className="text-xs px-2 py-1 border rounded">Copy</button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 mt-2 line-clamp-3">{h.text}</div>
                </li>
              ))}
            </ul>
          </aside>
        </main>

        <footer className="text-center text-xs text-gray-500 mt-12">
          Model: TF-IDF + Logistic Regression · Local demo · Predictions saved in your browser
        </footer>
      </div>
    </div>
  );
}

const example1 = `The government announced a new policy to support small businesses affected by the recent economic downturn. Officials said funding will be available starting next quarter and will target local entrepreneurs.`;
