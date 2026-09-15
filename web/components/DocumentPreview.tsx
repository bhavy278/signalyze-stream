"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/Skeleton";

type Kind = "pdf" | "docx" | "md" | "text";
export type JumpTarget = { text: string; nonce: number };

function detectKind(filename: string): Kind {
  const n = (filename || "").toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx")) return "docx";
  if (n.endsWith(".md") || n.endsWith(".markdown")) return "md";
  return "text";
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function cleanPhrase(phrase: string) {
  return phrase.replace(/[….]+$/g, "").replace(/\s+/g, " ").trim();
}

function clearHighlights(container: HTMLElement) {
  container.querySelectorAll("mark.hl").forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(m.textContent || ""), m);
    parent.normalize();
  });
  container.querySelectorAll(".hl-block").forEach((el) => el.classList.remove("hl-block"));
}

/** Highlights `phrase` across a text/HTML container (whitespace-flexible). */
function highlightInDom(container: HTMLElement, phrase: string) {
  clearHighlights(container);
  const cleaned = cleanPhrase(phrase);
  if (cleaned.length < 4) return;
  const needle = cleaned.slice(0, 90);

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let raw = "";
  const map: { node: Text; offset: number }[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const t = node as Text;
    for (let i = 0; i < t.data.length; i++) {
      raw += t.data[i];
      map.push({ node: t, offset: i });
    }
  }

  const m = new RegExp(escapeRegex(needle).replace(/\s+/g, "\\s+"), "i").exec(raw);
  if (!m) return;
  const start = map[m.index];
  const end = map[m.index + m[0].length - 1];
  if (!start || !end) return;

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset + 1);
  const mark = document.createElement("mark");
  mark.className = "hl";
  try {
    range.surroundContents(mark);
    mark.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch {
    const el = start.node.parentElement;
    if (el) {
      el.classList.add("hl-block");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

export default function DocumentPreview({
  jobId,
  filename,
  jumpTarget,
}: {
  jobId: string;
  filename: string;
  jumpTarget?: JumpTarget | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kindRef = useRef<Kind>("text");
  const pdfPagesRef = useRef<{ el: HTMLElement; text: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    pdfPagesRef.current = [];
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/documents/${jobId}/file`, { cache: "no-store" });
        if (!res.ok) throw new Error("Couldn’t load the document file.");
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        const kind = detectKind(filename);
        kindRef.current = kind;

        if (kind === "pdf") {
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            if (cancelled) return;
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.4 });
            const canvas = document.createElement("canvas");
            canvas.className = "pdf-page";
            const ctx = canvas.getContext("2d");
            if (!ctx) continue;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvas, canvasContext: ctx, viewport }).promise;
            if (cancelled) return;
            container.appendChild(canvas);

            const tc = await page.getTextContent();
            const text = tc.items
              .map((it) => ("str" in it ? (it as { str: string }).str : ""))
              .join(" ");
            pdfPagesRef.current.push({ el: canvas, text });
          }
        } else if (kind === "docx") {
          const mammoth = await import("mammoth");
          const result = await mammoth.convertToHtml({ arrayBuffer: buf });
          if (cancelled) return;
          const div = document.createElement("div");
          div.className = "doc-html";
          div.innerHTML = result.value;
          container.appendChild(div);
        } else if (kind === "md") {
          const { marked } = await import("marked");
          const html = await marked.parse(new TextDecoder().decode(buf));
          if (cancelled) return;
          const div = document.createElement("div");
          div.className = "doc-html";
          div.innerHTML = html as string;
          container.appendChild(div);
        } else {
          const pre = document.createElement("pre");
          pre.className = "doc-text";
          pre.textContent = new TextDecoder().decode(buf);
          container.appendChild(pre);
        }

        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Preview failed.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId, filename]);

  // Jump to & highlight a source passage
  useEffect(() => {
    if (!jumpTarget || loading) return;
    const container = containerRef.current;
    if (!container) return;

    if (kindRef.current === "pdf") {
      const needle = cleanPhrase(jumpTarget.text).slice(0, 60).toLowerCase();
      if (needle.length < 4) return;
      const pages = pdfPagesRef.current;
      pages.forEach((p) => p.el.classList.remove("pdf-flash"));
      const hit =
        pages.find((p) => p.text.replace(/\s+/g, " ").toLowerCase().includes(needle)) ??
        pages[0];
      if (!hit) return;
      hit.el.scrollIntoView({ behavior: "smooth", block: "start" });
      hit.el.classList.add("pdf-flash");
      window.setTimeout(() => hit.el.classList.remove("pdf-flash"), 1800);
    } else {
      highlightInDom(container, jumpTarget.text);
    }
  }, [jumpTarget, loading]);

  return (
    <div className="card preview-card">
      {loading && (
        <div className="preview-loading">
          <Skeleton w="90%" h={14} style={{ marginBottom: 10 }} />
          <Skeleton w="100%" h={14} style={{ marginBottom: 10 }} />
          <Skeleton w="80%" h={14} style={{ marginBottom: 10 }} />
          <Skeleton w="95%" h={14} style={{ marginBottom: 10 }} />
          <Skeleton w="70%" h={14} />
        </div>
      )}
      {error && (
        <p style={{ color: "var(--failed)", fontSize: 14, padding: 20 }}>{error}</p>
      )}
      <div ref={containerRef} className="preview-body" hidden={loading || !!error} />
    </div>
  );
}
