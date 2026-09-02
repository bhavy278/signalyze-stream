"use client";

import { useRef, useState } from "react";
import type { Analysis } from "@/lib/types";
import { getAnalysis, getStatus, uploadDocument } from "@/lib/api";
import AnalysisView from "@/components/AnalysisView";

function UploadIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

export default function Home() {
  const [selected, setSelected] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setSelected(null);
    setError(null);
    setBusy(false);
  }

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
          return;
        }
        if (s === "FAILED") {
          setSelected((prev) => (prev ? { ...prev, jobId, status: "FAILED" } : prev));
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

  return (
    <main className="wrap">
      {!selected && (
        <>
          <section className="hero">
            <div className="eyebrow">AI Document Analysis</div>
            <h1 className="hero-title">Understand any document in seconds.</h1>
            <p className="lead">
              Upload a contract or agreement and get a structured breakdown —
              parties, key terms, and the risky clauses worth a second look. Then
              ask it anything.
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
            style={{ cursor: busy ? "default" : "pointer", opacity: busy ? 0.75 : 1 }}
          >
            <div className="dz-icon">
              <UploadIcon />
            </div>
            <div className="dz-title">
              {busy ? "Analyzing…" : "Drop a document to analyze"}
            </div>
            <div className="dz-sub">PDF or text file</div>
            <button className="btn" type="button" disabled={busy}>
              Browse files
            </button>
          </div>
        </>
      )}

      {error && (
        <p style={{ color: "var(--failed)", marginTop: 12, fontSize: 14 }}>{error}</p>
      )}

      {selected && (
        <section>
          <div className="section-head">
            <h2 style={{ fontSize: 16 }}>Analysis</h2>
            <button className="btn btn-sm" type="button" onClick={reset}>
              <UploadIcon />
              New
            </button>
          </div>
          <AnalysisView selected={selected} />
        </section>
      )}
    </main>
  );
}
