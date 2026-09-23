"use client";

import { useRef, useState } from "react";
import { Plus, Upload, RefreshCw, FileText } from "lucide-react";
import { motion } from "framer-motion";
import type { Analysis } from "@/lib/types";
import { getAnalysis, getStatus, streamAnalysis, streamStatus, uploadDocument } from "@/lib/api";
import DocumentWorkspace from "@/components/DocumentWorkspace";
import { useToast } from "@/components/Toast";

const SAMPLE_URL = "/samples/consulting-services-agreement.txt";
const SAMPLE_NAME = "Consulting Services Agreement.txt";

export default function Home() {
  const [selected, setSelected] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState("");
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  function reset() {
    stopStreamRef.current?.();
    setSelected(null);
    setError(null);
    setBusy(false);
    setOverview("");
  }

  async function handleFile(file: File) {
    lastFileRef.current = file;
    setError(null);
    setBusy(true);
    stopStreamRef.current?.();
    setOverview("");
    setSelected({
      jobId: "pending",
      filename: file.name,
      status: "PROCESSING",
      createdAt: new Date().toISOString(),
    });

    try {
      const { jobId } = await uploadDocument(file);
      let settled = false;

      // Live overview: the analyst's read, typed out while the structured card is generated.
      stopStreamRef.current = streamAnalysis(jobId, {
        onToken: (t) => setOverview((o) => o + t),
      });

      streamStatus(jobId, {
        onStatus: async (status) => {
          const s = status.toUpperCase();
          if (s === "DONE") {
            settled = true;
            setSelected(await getAnalysis(jobId));
            setBusy(false);
            toast("Analysis complete", "success");
          } else if (s === "FAILED") {
            settled = true;
            setSelected((prev) => (prev ? { ...prev, jobId, status: "FAILED" } : prev));
            setBusy(false);
            toast("Analysis failed for this document", "error");
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
          toast("Analysis timed out — is the backend running?", "error");
          setBusy(false);
          setSelected(null);
        },
      });
    } catch {
      setError("Upload failed — is the backend running?");
      toast("Upload failed — is the backend running?", "error");
      setBusy(false);
      setSelected(null);
    }
  }

  async function loadSample() {
    if (busy) return;
    try {
      const res = await fetch(SAMPLE_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("sample fetch failed");
      const blob = await res.blob();
      const file = new File([blob], SAMPLE_NAME, { type: "text/plain" });
      void handleFile(file);
    } catch {
      toast("Couldn't load the sample — try uploading a file instead", "error");
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

          <div className="sample-row">
            <span className="sample-hint">No file handy?</span>
            <button
              className="sample-link"
              type="button"
              onClick={loadSample}
              disabled={busy}
            >
              <FileText size={14} />
              Try a sample contract
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          {lastFileRef.current && (
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => {
                const f = lastFileRef.current;
                if (f) void handleFile(f);
              }}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          )}
        </div>
      )}

      {selected && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <DocumentWorkspace
            selected={selected}
            streamingOverview={overview}
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
