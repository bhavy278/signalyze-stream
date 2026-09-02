"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Analysis } from "@/lib/types";
import {
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
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listDocuments();
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
    void refresh();
  }, [refresh]);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    setSelected({
      jobId: "pending",
      filename: file.name,
      status: "PROCESSING",
      summary: "",
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
          void refresh();
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
            Upload a contract or agreement and get a clear, structured summary —
            key obligations, terms, and the clauses worth a second look.
          </p>
        </section>

        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,text/plain"
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
          <div className="dz-sub">Text file (.txt)</div>
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
                  <h3 style={{ fontSize: 18, marginTop: 6 }}>Summary</h3>
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
              {selected.summary && (
                <p
                  style={{
                    marginTop: 14,
                    color: "var(--ink-2)",
                    lineHeight: 1.6,
                  }}
                >
                  {selected.summary}
                </p>
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
              <div className="dz-title">No documents yet</div>
              <div className="dz-sub">Upload one above to get started.</div>
            </div>
          ) : (
            <div className="card list">
              {docs.map((d) => (
                <button
                  className="row"
                  key={d.jobId}
                  onClick={() => void openDoc(d.jobId)}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
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
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
