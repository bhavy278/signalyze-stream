"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Analysis, AskResponse } from "@/lib/types";
import {
  askDocument,
  deleteDocument,
  getAnalysis,
  getStatus,
  listDocuments,
  uploadDocument,
} from "@/lib/api";

const statusLabel: Record<string, string> = {
  PROCESSING: "Processing",
  DONE: "Done",
  FAILED: "Failed",
};

function pillClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "DONE") return "pill pill--done";
  if (s === "FAILED") return "pill pill--failed";
  return "pill pill--processing";
}

function sevClass(severity: string): string {
  const s = (severity || "low").toLowerCase();
  if (s === "high") return "sev sev--high";
  if (s === "medium") return "sev sev--medium";
  return "sev sev--low";
}

function timeAgo(iso: string): string {
  const s = Math.max(
    1,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Home() {
  const [docs, setDocs] = useState<Analysis[]>([]);
  const [query, setQuery] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const refresh = useCallback(async (q?: string) => {
    try {
      const list = await listDocuments(q);
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setDocs(list);
      setDocsError(null);
    } catch {
      setDocsError("Couldn’t load documents.");
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(query.trim() || undefined), 250);
    return () => clearTimeout(t);
  }, [query, refresh]);

  useEffect(() => {
    setQuestion("");
    setAnswer(null);
    setAskError(null);
  }, [selected?.jobId]);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    setSelected({
      jobId: "pending",
      filename: file.name,
      status: "PROCESSING",
      createdAt: new Date().toISOString(),
    });

    try {
      const { jobId } = await uploadDocument(file);
      let attempts = 0;

      const poll = async (): Promise<void> => {
        attempts += 1;
        const { status } = await getStatus(jobId);
        const s = status.toUpperCase();

        if (s === "DONE") {
          setSelected(await getAnalysis(jobId));
          setBusy(false);
          void refresh(query.trim() || undefined);
          return;
        }
        if (s === "FAILED") {
          setSelected((prev) =>
            prev ? { ...prev, jobId, status: "FAILED" } : prev,
          );
          setBusy(false);
          return;
        }
        if (attempts > 40) {
          setError("Analysis timed out.");
          setBusy(false);
          return;
        }
        setTimeout(() => void poll(), 1500);
      };

      setTimeout(() => void poll(), 1500);
    } catch {
      setError("Upload failed — is the backend running?");
      setBusy(false);
      setSelected(null);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  async function openDoc(jobId: string) {
    try {
      setSelected(await getAnalysis(jobId));
    } catch {
      setError("Couldn’t open that document.");
    }
  }
  async function handleDelete(jobId: string) {
    const target = docs.find((d) => d.jobId === jobId);
    const ok = window.confirm(
      `Delete "${target?.filename ?? "this document"}"? This can't be undone.`,
    );
    if (!ok) return;

    setDocs((prev) => prev.filter((d) => d.jobId !== jobId));
    if (selected?.jobId === jobId) setSelected(null);

    try {
      await deleteDocument(jobId);
    } catch {
      setError("Couldn’t delete that document.");
      void refresh(query.trim() || undefined);
    }
  }

  async function handleAsk() {
    const jobId = selected?.jobId;
    if (!jobId || jobId === "pending" || !question.trim()) return;
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    try {
      setAnswer(await askDocument(jobId, question.trim()));
    } catch {
      setAskError("Couldn’t get an answer — is the backend running?");
    } finally {
      setAsking(false);
    }
  }

  const r = selected?.result ?? null;
  const summaryText = r?.summary ?? selected?.summary ?? "";

  return (
    <div>
      <header className="topbar">
        <span className="brand">
          <span className="brand-dot" /> Signalyze
        </span>
        <button
          className="btn btn-sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          New analysis
        </button>
      </header>

      <main className="wrap">
        <section>
          <div className="eyebrow">AI Document Analysis</div>
          <h1 style={{ fontSize: 38, marginTop: 12 }}>
            Understand any document in seconds.
          </h1>
          <p className="lead">
            Upload a contract or agreement and get a structured breakdown —
            parties, key terms, and the risky clauses worth a second look.
          </p>
        </section>

        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.pdf,text/plain,application/pdf"
          hidden
          onChange={onInputChange}
        />

        <div
          className="dropzone"
          role="button"
          tabIndex={0}
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !busy)
              inputRef.current?.click();
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file && !busy) void handleFile(file);
          }}
          style={{
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.75 : 1,
          }}
        >
          <div className="dz-icon">↑</div>
          <div className="dz-title">
            {busy ? "Analyzing…" : "Drop a document to analyze"}
          </div>
          <div className="dz-sub">PDF or text file</div>
          <button className="btn" type="button" disabled={busy}>
            Browse files
          </button>
        </div>

        {error && (
          <p style={{ color: "var(--failed)", marginTop: 12, fontSize: 14 }}>
            {error}
          </p>
        )}

        {selected && (
          <section style={{ marginTop: 44 }}>
            <div className="section-head">
              <h2 style={{ fontSize: 16 }}>Analysis</h2>
            </div>
            <div className="card" style={{ padding: 24 }}>
              <div className="row-between">
                <div>
                  <div className="meta">{selected.filename}</div>
                  <h3 style={{ fontSize: 18, marginTop: 6 }}>
                    {r?.documentType || "Summary"}
                  </h3>
                  {r?.parties && r.parties.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        marginTop: 8,
                      }}
                    >
                      {r.parties.map((p) => (
                        <span className="chip" key={p}>
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={pillClass(selected.status)}>
                  <span className="dot" />
                  {statusLabel[selected.status.toUpperCase()] ??
                    selected.status}
                </span>
              </div>

              {selected.status.toUpperCase() === "PROCESSING" && (
                <p style={{ marginTop: 14, color: "var(--muted)" }}>
                  Analyzing the document…
                </p>
              )}
              {selected.status.toUpperCase() === "FAILED" && (
                <p style={{ marginTop: 14, color: "var(--failed)" }}>
                  Analysis failed for this document.
                </p>
              )}

              {summaryText && (
                <p
                  style={{
                    marginTop: 16,
                    color: "var(--ink-2)",
                    lineHeight: 1.6,
                  }}
                >
                  {summaryText}
                </p>
              )}

              {r?.keyTerms && r.keyTerms.length > 0 && (
                <>
                  <div className="eyebrow" style={{ marginTop: 22 }}>
                    Key Terms
                  </div>
                  <div className="terms">
                    {r.keyTerms.map((t) => (
                      <div className="term" key={t.label}>
                        <div className="k">{t.label}</div>
                        <div className="v">{t.value}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {r?.risks && r.risks.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div className="eyebrow">Risk Flags</div>
                  <div style={{ marginTop: 6 }}>
                    {r.risks.map((risk, i) => (
                      <div className="risk" key={`${risk.title}-${i}`}>
                        <span className={sevClass(risk.severity)}>
                          {risk.severity}
                        </span>
                        <div>
                          <div className="rtitle">{risk.title}</div>
                          <div className="rdetail">{risk.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selected.status.toUpperCase() === "DONE" &&
                selected.jobId !== "pending" && (
                  <div className="ask">
                    <div className="eyebrow">Ask this document</div>
                    <div className="ask-row">
                      <input
                        className="search"
                        type="text"
                        placeholder="e.g. What is the payment amount?"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleAsk();
                        }}
                        disabled={asking}
                      />
                      <button
                        className="btn"
                        type="button"
                        onClick={() => void handleAsk()}
                        disabled={asking || !question.trim()}
                      >
                        {asking ? "Thinking…" : "Ask"}
                      </button>
                    </div>

                    {askError && (
                      <p
                        style={{
                          color: "var(--failed)",
                          marginTop: 10,
                          fontSize: 14,
                        }}
                      >
                        {askError}
                      </p>
                    )}

                    {answer && (
                      <div className="answer">
                        <p className="answer-text">{answer.answer}</p>
                        {answer.sources.length > 0 && (
                          <div className="sources">
                            <div className="eyebrow">Sources</div>
                            {answer.sources.map((s) => (
                              <div className="source" key={s.chunkIndex}>
                                <span className="source-tag">
                                  #{s.chunkIndex}
                                </span>
                                <span className="source-text">{s.excerpt}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              {selected.status.toUpperCase() === "DONE" && (
                <div className="metarow">
                  gpt-4o-mini · {new Date(selected.createdAt).toLocaleString()}
                </div>
              )}
            </div>
          </section>
        )}

        <section style={{ marginTop: 44 }}>
          <div className="section-head">
            <h2 style={{ fontSize: 16 }}>Recent</h2>
            <span className="meta">{docs.length} documents</span>
          </div>
          <input
            className="search"
            type="text"
            placeholder="Search by filename or document type…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {loadingDocs ? (
            <div className="card" style={{ padding: 18 }}>
              <span className="meta">Loading…</span>
            </div>
          ) : docsError ? (
            <div className="card" style={{ padding: 18 }}>
              <span style={{ color: "var(--failed)", fontSize: 14 }}>
                {docsError}
              </span>
            </div>
          ) : docs.length === 0 ? (
            <div className="card" style={{ padding: 24, textAlign: "center" }}>
              <div className="dz-title">
                {query.trim() ? "No matches" : "No documents yet"}
              </div>
              <div className="dz-sub">
                {query.trim()
                  ? `Nothing matches “${query.trim()}”.`
                  : "Upload one above to get started."}
              </div>
            </div>
          ) : (
            <div className="card list">
              {docs.map((d) => (
                <div className="row" key={d.jobId}>
                  <button
                    className="row-open"
                    onClick={() => void openDoc(d.jobId)}
                  >
                    <span className="row-file">{d.filename}</span>
                    <span className="row-right">
                      <span className="meta">{timeAgo(d.createdAt)}</span>
                      <span className={pillClass(d.status)}>
                        <span className="dot" />
                        {statusLabel[d.status.toUpperCase()] ?? d.status}
                      </span>
                    </span>
                  </button>
                  <button
                    className="row-del"
                    title="Delete"
                    aria-label={`Delete ${d.filename}`}
                    onClick={() => void handleDelete(d.jobId)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
