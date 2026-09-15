"use client";

import { useRef, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { motion } from "framer-motion";
import type { Analysis } from "@/lib/types";
import { getAnalysis, getStatus, streamStatus, uploadDocument } from "@/lib/api";
import DocumentWorkspace from "@/components/DocumentWorkspace";

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
      let settled = false;

      streamStatus(jobId, {
        onStatus: async (status) => {
          const s = status.toUpperCase();
          if (s === "DONE") {
            settled = true;
            setSelected(await getAnalysis(jobId));
            setBusy(false);
          } else if (s === "FAILED") {
            settled = true;
            setSelected((prev) => (prev ? { ...prev, jobId, status: "FAILED" } : prev));
            setBusy(false);
          }
        },
        onEnd: async () => {
          if (settled) return;
          // stream closed without a terminal status — do one fallback check
          try {
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
          } catch {
            // ignore
          }
          setError("Analysis timed out — is the backend running?");
          setBusy(false);
        },
      });
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
    <main className={selected ? "wrap wrap-wide" : "wrap"}>
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
              <Upload size={22} />
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
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <DocumentWorkspace
            selected={selected}
            crumb="New Analysis"
            onNew={reset}
            newLabel="New"
            newIcon={<Plus size={15} />}
          />
        </motion.section>
      )}
    </main>
  );
}
