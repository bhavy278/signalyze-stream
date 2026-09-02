"use client";

import { useCallback, useEffect, useState } from "react";
import type { Analysis, DocumentPage } from "@/lib/types";
import { deleteDocument, getAnalysis, listDocuments } from "@/lib/api";
import { pillClass, statusLabel, timeAgo } from "@/lib/format";
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/Skeleton";
import AnalysisReport from "@/components/AnalysisReport";
import DocumentChat from "@/components/DocumentChat";

const PAGE_SIZE = 8;

export default function DocumentsPage() {
  const [pageData, setPageData] = useState<DocumentPage | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Analysis | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string | undefined, p: number) => {
    try {
      const data = await listDocuments(q, p, PAGE_SIZE);
      setPageData(data);
      setDocsError(null);
    } catch {
      setDocsError("Couldn’t load documents.");
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(query.trim() || undefined, page), 250);
    return () => clearTimeout(t);
  }, [query, page, load]);

  const docs = pageData?.items ?? [];
  const total = pageData?.total ?? 0;
  const totalPages = pageData?.totalPages ?? 0;

  async function openDoc(jobId: string) {
    try {
      setSelected(await getAnalysis(jobId));
      window.scrollTo({ top: 0, behavior: "smooth" });
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

    setPageData((prev) =>
      prev
        ? { ...prev, items: prev.items.filter((d) => d.jobId !== jobId), total: Math.max(0, prev.total - 1) }
        : prev,
    );

    try {
      await deleteDocument(jobId);
      const remaining = (pageData?.items.length ?? 1) - 1;
      if (remaining <= 0 && page > 0) {
        setPage((p) => p - 1); // effect reloads the previous page
      } else {
        void load(query.trim() || undefined, page);
      }
    } catch {
      setError("Couldn’t delete that document.");
      void load(query.trim() || undefined, page);
    }
  }

  // Open-document view: two-column (analysis | chat), list hidden
  if (selected) {
    return (
      <main className="wrap wrap-wide">
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          onClick={() => setSelected(null)}
          style={{ marginBottom: 20 }}
        >
          <ArrowLeft size={15} />
          Back to documents
        </button>

        <motion.div
          className="doc-split"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <AnalysisReport selected={selected} />
          <DocumentChat selected={selected} />
        </motion.div>
      </main>
    );
  }

  // Default view: the document list
  return (
    <main className="wrap">
      <section className="hero">
        <div className="eyebrow">Archive</div>
        <h1 className="hero-title">Your documents.</h1>
        <p className="lead">
          Search everything you’ve analyzed, open a report, or ask it a question.
        </p>
      </section>

      <section style={{ marginTop: 36 }}>
        <div className="section-head">
          <h2 style={{ fontSize: 16 }}>All documents</h2>
          <span className="meta">
            {total} document{total === 1 ? "" : "s"}
          </span>
        </div>

        <input
          className="search"
          type="text"
          placeholder="Search by filename or document type…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />

        {error && (
          <p style={{ color: "var(--failed)", marginBottom: 10, fontSize: 14 }}>{error}</p>
        )}

        {loadingDocs ? (
          <div className="card list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                className="row"
                key={i}
                style={{ padding: "15px 20px", justifyContent: "space-between" }}
              >
                <Skeleton w="42%" h={14} />
                <Skeleton w={70} h={14} />
              </div>
            ))}
          </div>
        ) : docsError ? (
          <div className="card" style={{ padding: 18 }}>
            <span style={{ color: "var(--failed)", fontSize: 14 }}>{docsError}</span>
          </div>
        ) : docs.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: "center" }}>
            <div className="dz-title">
              {query.trim() ? "No matches" : "No documents yet"}
            </div>
            <div className="dz-sub">
              {query.trim()
                ? `Nothing matches “${query.trim()}”.`
                : "Upload one to get started."}
            </div>
          </div>
        ) : (
          <>
            <div className="card list">
              {docs.map((d) => (
                <div className="row" key={d.jobId}>
                  <button className="row-open" onClick={() => void openDoc(d.jobId)}>
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
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pager">
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft size={16} />
                  Prev
                </button>
                <span className="meta">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
