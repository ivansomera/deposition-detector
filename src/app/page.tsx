"use client";

import { useState } from "react";
import { TRANSCRIPT_1, TRANSCRIPT_2 } from "@/data/transcripts";
import type { Pair } from "@/lib/schema";
import type { ContradictionType } from "@/lib/scoring";

// One analyzed contradiction, as the API returns it
type Result = Pair & {
  type: ContradictionType;
  confidence: number;
  reasons: string[];
};

// Label and colours for each contradiction type
const TYPE_STYLES: Record<string, { label: string; border: string; background: string }> = {
  DIRECT: { label: "Direct", border: "#ef4444", background: "#fee2e2" },
  INFERENTIAL: { label: "Inferential", border: "#f59e0b", background: "#fef3c7" },
  FALSE_POSITIVE: { label: "False positive", border: "#9ca3af", background: "#f3f4f6" },
};

export default function DepositionChecker() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Call our own server route, which keeps the API key hidden
      const res = await fetch("/api/analyze", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setResults(data.results);
        setSource(data.source);
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  // Split results into real contradictions and dismissed ones
  const flagged: Result[] = [];
  const dismissed: Result[] = [];
  if (results) {
    for (const result of results) {
      if (result.type === "FALSE_POSITIVE") {
        dismissed.push(result);
      } else {
        flagged.push(result);
      }
    }
    // Highest confidence first
    flagged.sort((a, b) => b.confidence - a.confidence);
  }

  return (
      <div style={{ padding: 32, maxWidth: 900, margin: "0 auto", fontFamily: "sans-serif" }}>
        <h1>⚖️ Deposition Contradiction Detector</h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div>
            <h3>Earlier deposition</h3>
            <pre style={{ background: "#f5f5f5", padding: 12, fontSize: 12, whiteSpace: "pre-wrap" }}>
                        {TRANSCRIPT_1}
                    </pre>
          </div>
          <div>
            <h3>Later deposition</h3>
            <pre style={{ background: "#f5f5f5", padding: 12, fontSize: 12, whiteSpace: "pre-wrap" }}>
                        {TRANSCRIPT_2}
                    </pre>
          </div>
        </div>

        <button
            onClick={analyze}
            disabled={loading}
            style={{ padding: "12px 32px", fontSize: 16, background: "#1a1a2e", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          {loading ? "Analyzing..." : "Find Contradictions"}
        </button>

        {error && <p style={{ color: "red", marginTop: 16 }}>{error}</p>}

        {results && (
            <div style={{ marginTop: 24 }}>
              {source === "cached" && (
                  <p style={{ fontSize: 13, color: "#666", background: "#f3f4f6", padding: 8, borderRadius: 4 }}>
                    Demo mode: showing a saved model response because no API key is set.
                  </p>
              )}

              <h2>Contradictions ({flagged.length})</h2>
              {flagged.length === 0 && <p>No contradictions found.</p>}
              {flagged.map((result, i) => (
                  <ResultCard key={i} result={result} />
              ))}

              {dismissed.length > 0 && (
                  <details style={{ marginTop: 24 }}>
                    <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                      Dismissed as imprecise language ({dismissed.length})
                    </summary>
                    <div style={{ marginTop: 12 }}>
                      {dismissed.map((result, i) => (
                          <ResultCard key={i} result={result} />
                      ))}
                    </div>
                  </details>
              )}
            </div>
        )}
      </div>
  );
}

// One contradiction card: type chip, score, quotes, and the reasons behind the score
function ResultCard({ result }: { result: Result }) {
  const style = TYPE_STYLES[result.type];

  return (
      <div style={{
        border: "1px solid #ddd",
        borderLeft: "4px solid " + style.border,
        padding: 16,
        marginBottom: 12,
      }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <span style={{ background: style.background, padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: "bold" }}>
                    {style.label}
                </span>
          <span style={{ fontSize: 12, color: "#666" }}>
                    Confidence: {Math.round(result.confidence * 100)}%
                </span>
        </div>

        <div style={{ fontSize: 14 }}>
          <div style={{ marginBottom: 4 }}><strong>Earlier:</strong> &ldquo;{result.quote1}&rdquo;</div>
          <div><strong>Later:</strong> &ldquo;{result.quote2}&rdquo;</div>
        </div>

        {result.assumption && (
            <div style={{ fontSize: 13, marginTop: 8, color: "#555" }}>
              <strong>Assumes:</strong> {result.assumption}
            </div>
        )}

        <div style={{ fontSize: 12, marginTop: 8, color: "#666" }}>
          <strong>Why this score:</strong>
          <ul style={{ margin: "4px 0 0 0", paddingLeft: 20 }}>
            {result.reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>
  );
}