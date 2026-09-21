"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, ZoomIn, ZoomOut, Search, X } from "lucide-react";
import DOMPurify from "dompurify";
import { Skeleton } from "@/components/Skeleton";

type Kind = "pdf" | "docx" | "md" | "text";
export type JumpTarget = { text: string; nonce: number };
type PdfPage = {
  wrap: HTMLDivElement;
  scaleEl: HTMLDivElement;
  textLayer: HTMLDivElement;
  canvas: HTMLCanvasElement;
  render: () => Promise<void>;
  rendered: boolean;
  text: string;
  cssWidth: number;
  cssHeight: number;
};

const RENDER_SCALE = 2;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.25;

// Safari lacks async iteration on ReadableStream; pdf.js v6 relies on it
// (page.getTextContent uses `for await ... of stream`). Polyfill it once.
function ensureStreamAsyncIterator() {
  if (typeof ReadableStream === "undefined") return;
  const proto = ReadableStream.prototype as unknown as {
    [Symbol.asyncIterator]?: () => AsyncGenerator<unknown>;
    values?: () => AsyncGenerator<unknown>;
  };
  if (proto[Symbol.asyncIterator]) return;
  const iterator = async function* (this: ReadableStream<unknown>) {
    const reader = this.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  } as unknown as () => AsyncGenerator<unknown>;
  proto[Symbol.asyncIterator] = iterator;
  if (!proto.values) proto.values = iterator;
}

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

function clearSearchMarks(container: HTMLElement) {
  container.querySelectorAll("mark.s-hl").forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(m.textContent || ""), m);
    parent.normalize();
  });
}

/** Wraps every case-insensitive occurrence of `q` in a text/HTML container. */
function searchDom(container: HTMLElement, q: string): HTMLElement[] {
  clearSearchMarks(container);
  const needle = q.toLowerCase();
  if (needle.length < 2) return [];

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    if (t.data.toLowerCase().includes(needle)) nodes.push(t);
  }

  const marks: HTMLElement[] = [];
  for (const node of nodes) {
    const data = node.data;
    const lower = data.toLowerCase();
    const frag = document.createDocumentFragment();
    let last = 0;
    let idx = lower.indexOf(needle);
    while (idx !== -1) {
      if (idx > last) frag.appendChild(document.createTextNode(data.slice(last, idx)));
      const mark = document.createElement("mark");
      mark.className = "s-hl";
      mark.textContent = data.slice(idx, idx + needle.length);
      frag.appendChild(mark);
      marks.push(mark);
      last = idx + needle.length;
      idx = lower.indexOf(needle, last);
    }
    if (last < data.length) frag.appendChild(document.createTextNode(data.slice(last)));
    node.parentNode?.replaceChild(frag, node);
  }
  return marks;
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
  const pdfPagesRef = useRef<PdfPage[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const contentElRef = useRef<HTMLElement | null>(null);
  const baseFontRef = useRef(14);
  const matchElsRef = useRef<HTMLElement[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [matchIdx, setMatchIdx] = useState(0);

  // ---- Load & render the document ----
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    observerRef.current?.disconnect();
    pdfPagesRef.current = [];
    contentElRef.current = null;
    matchElsRef.current = [];
    setLoading(true);
    setError(null);
    setZoom(1);
    setQuery("");
    setMatchCount(0);
    setMatchIdx(0);
    setCurrentPage(1);
    setPageInput("1");

    (async () => {
      try {
        ensureStreamAsyncIterator();
        const res = await fetch(`/api/documents/${jobId}/file`, { cache: "no-store" });
        if (!res.ok) throw new Error("Couldn’t load the document file.");
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        const kind = detectKind(filename);
        kindRef.current = kind;
        setIsPdf(kind === "pdf");

        if (kind === "pdf") {
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
          if (cancelled) return;
          setTotalPages(pdf.numPages);

          const measure = document.createElement("canvas").getContext("2d");

          for (let i = 1; i <= pdf.numPages; i++) {
            if (cancelled) return;
            const page = await pdf.getPage(i);
            const vp1 = page.getViewport({ scale: 1 });
            const cssWidth = vp1.width;
            const cssHeight = vp1.height;
            const viewport = page.getViewport({ scale: RENDER_SCALE });

            const wrap = document.createElement("div");
            wrap.className = "pdf-page";
            wrap.style.width = `${cssWidth}px`;
            wrap.style.height = `${cssHeight}px`;

            const scaleEl = document.createElement("div");
            scaleEl.className = "pdf-scale";
            scaleEl.style.width = `${cssWidth}px`;
            scaleEl.style.height = `${cssHeight}px`;

            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = `${cssWidth}px`;
            canvas.style.height = `${cssHeight}px`;

            const tc = await page.getTextContent();
            const styles = tc.styles as Record<string, { fontFamily?: string } | undefined>;
            const textLayer = document.createElement("div");
            textLayer.className = "textLayer";
            textLayer.style.width = `${cssWidth}px`;
            textLayer.style.height = `${cssHeight}px`;

            const strs: string[] = [];
            for (const it of tc.items) {
              if (!("str" in it)) continue;
              const item = it as {
                str: string;
                transform: number[];
                width: number;
                fontName: string;
              };
              strs.push(item.str);
              if (!item.str) continue;
              const tx = pdfjsLib.Util.transform(vp1.transform, item.transform);
              const fontHeight = Math.hypot(tx[2], tx[3]);
              if (fontHeight <= 0) continue;

              const span = document.createElement("span");
              span.textContent = item.str;
              const fontFamily = styles[item.fontName]?.fontFamily || "sans-serif";
              span.style.left = `${tx[4]}px`;
              span.style.top = `${tx[5] - fontHeight}px`;
              span.style.fontSize = `${fontHeight}px`;
              span.style.fontFamily = fontFamily;

              if (measure) {
                measure.font = `${fontHeight}px ${fontFamily}`;
                const measured = measure.measureText(item.str).width || 1;
                const desired = item.width * vp1.scale;
                const sx = desired / measured;
                if (isFinite(sx) && sx > 0) span.style.transform = `scaleX(${sx})`;
              }
              textLayer.appendChild(span);
            }

            scaleEl.appendChild(canvas);
            scaleEl.appendChild(textLayer);
            wrap.appendChild(scaleEl);
            container.appendChild(wrap);

            const entry: PdfPage = {
              wrap,
              scaleEl,
              textLayer,
              canvas,
              cssWidth,
              cssHeight,
              text: strs.join(" "),
              rendered: false,
              render: async () => {
                if (entry.rendered) return;
                entry.rendered = true;
                const c2d = canvas.getContext("2d");
                if (!c2d) return;
                await page.render({ canvas, canvasContext: c2d, viewport }).promise;
              },
            };
            pdfPagesRef.current.push(entry);
          }

          if (cancelled) return;
          // Rasterize each page's canvas only as it nears the viewport.
          const io = new IntersectionObserver(
            (obsEntries) => {
              for (const oe of obsEntries) {
                if (!oe.isIntersecting) continue;
                const idx = Number((oe.target as HTMLElement).dataset.pageIndex);
                const pg = pdfPagesRef.current[idx];
                if (pg && !pg.rendered) void pg.render();
                io.unobserve(oe.target);
              }
            },
            { root: container, rootMargin: "400px 0px" },
          );
          pdfPagesRef.current.forEach((pg, idx) => {
            pg.wrap.dataset.pageIndex = String(idx);
            io.observe(pg.wrap);
          });
          observerRef.current = io;
        } else if (kind === "docx") {
          const mammoth = await import("mammoth");
          const result = await mammoth.convertToHtml({ arrayBuffer: buf });
          if (cancelled) return;
          const div = document.createElement("div");
          div.className = "doc-html";
          div.innerHTML = DOMPurify.sanitize(result.value);
          container.appendChild(div);
          contentElRef.current = div;
          baseFontRef.current = 14;
        } else if (kind === "md") {
          const { marked } = await import("marked");
          const html = await marked.parse(new TextDecoder().decode(buf));
          if (cancelled) return;
          const div = document.createElement("div");
          div.className = "doc-html";
          div.innerHTML = DOMPurify.sanitize(html as string);
          container.appendChild(div);
          contentElRef.current = div;
          baseFontRef.current = 14;
        } else {
          const pre = document.createElement("pre");
          pre.className = "doc-text";
          pre.textContent = new TextDecoder().decode(buf);
          container.appendChild(pre);
          contentElRef.current = pre;
          baseFontRef.current = 13;
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
      observerRef.current?.disconnect();
    };
  }, [jobId, filename]);

  // ---- Apply zoom ----
  useEffect(() => {
    if (loading) return;
    if (kindRef.current === "pdf") {
      for (const p of pdfPagesRef.current) {
        p.scaleEl.style.transform = `scale(${zoom})`;
        p.wrap.style.width = `${p.cssWidth * zoom}px`;
        p.wrap.style.height = `${p.cssHeight * zoom}px`;
      }
    } else if (contentElRef.current) {
      contentElRef.current.style.fontSize = `${baseFontRef.current * zoom}px`;
    }
  }, [zoom, loading]);

  // ---- Track the current page while scrolling (PDF) ----
  useEffect(() => {
    const c = containerRef.current;
    if (!c || loading || kindRef.current !== "pdf") return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const pages = pdfPagesRef.current;
        const top = c.scrollTop;
        let cur = 1;
        for (let i = 0; i < pages.length; i++) {
          const pg = pages[i];
          if (pg && pg.wrap.offsetTop <= top + 90) cur = i + 1;
          else break;
        }
        setCurrentPage(cur);
      });
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      c.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [loading]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // ---- Search ----
  useEffect(() => {
    if (loading) return;
    const q = query.trim();

    // clear previous highlights
    if (kindRef.current === "pdf") {
      for (const p of pdfPagesRef.current) {
        p.textLayer
          .querySelectorAll("span.s-hl")
          .forEach((sp) => sp.classList.remove("s-hl", "s-cur"));
      }
    } else if (contentElRef.current) {
      clearSearchMarks(contentElRef.current);
    }
    matchElsRef.current = [];

    if (q.length < 2) {
      setMatchCount(0);
      setMatchIdx(0);
      return;
    }

    let els: HTMLElement[] = [];
    if (kindRef.current === "pdf") {
      const needle = q.toLowerCase();
      for (const p of pdfPagesRef.current) {
        p.textLayer.querySelectorAll<HTMLElement>("span").forEach((sp) => {
          if ((sp.textContent || "").toLowerCase().includes(needle)) {
            sp.classList.add("s-hl");
            els.push(sp);
          }
        });
      }
    } else if (contentElRef.current) {
      els = searchDom(contentElRef.current, q);
    }

    matchElsRef.current = els;
    setMatchCount(els.length);
    setMatchIdx(0);
    if (els.length) focusMatch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, loading]);

  function focusMatch(i: number) {
    const els = matchElsRef.current;
    els.forEach((e) => e.classList.remove("s-cur"));
    const el = els[i];
    if (!el) return;
    el.classList.add("s-cur");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function goToMatch(next: number) {
    if (matchCount === 0) return;
    const idx = ((next % matchCount) + matchCount) % matchCount;
    setMatchIdx(idx);
    focusMatch(idx);
  }

  function scrollToPage(pageNum: number) {
    const c = containerRef.current;
    const p = pdfPagesRef.current[pageNum - 1];
    if (!c || !p) return;
    void p.render();
    c.scrollTo({ top: p.wrap.offsetTop - 8, behavior: "smooth" });
  }

  // ---- Source jump (from chat citations) ----
  useEffect(() => {
    if (!jumpTarget || loading) return;
    const container = containerRef.current;
    if (!container) return;

    if (kindRef.current === "pdf") {
      const needle = cleanPhrase(jumpTarget.text).slice(0, 60).toLowerCase();
      if (needle.length < 4) return;
      const pages = pdfPagesRef.current;
      const found = pages.findIndex((p) =>
        p.text.replace(/\s+/g, " ").toLowerCase().includes(needle),
      );
      const p = pages[found >= 0 ? found : 0];
      if (!p) return;
      void p.render();
      container.scrollTo({ top: p.wrap.offsetTop - 8, behavior: "smooth" });
      pages.forEach((pp) => pp.wrap.classList.remove("pdf-flash"));
      p.wrap.classList.add("pdf-flash");
      window.setTimeout(() => p.wrap.classList.remove("pdf-flash"), 1600);
    } else {
      highlightInDom(container, jumpTarget.text);
    }
  }, [jumpTarget, loading]);

  const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +z.toFixed(2)));

  return (
    <div className="card preview-card">
      {!loading && !error && (
        <div className="pdf-toolbar">
          {isPdf && (
            <div className="tb-group">
              <button
                className="tb-btn"
                type="button"
                onClick={() => scrollToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Previous page"
              >
                <ChevronUp size={16} />
              </button>
              <input
                className="tb-page-input"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = Math.min(Math.max(1, parseInt(pageInput || "1", 10)), totalPages);
                    scrollToPage(n);
                  }
                }}
                aria-label="Page number"
              />
              <span className="tb-label">/ {totalPages}</span>
              <button
                className="tb-btn"
                type="button"
                onClick={() => scrollToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          )}

          <div className="tb-group">
            <button
              className="tb-btn"
              type="button"
              onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
              disabled={zoom <= ZOOM_MIN}
              aria-label="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="tb-label tb-zoom">{Math.round(zoom * 100)}%</span>
            <button
              className="tb-btn"
              type="button"
              onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
              disabled={zoom >= ZOOM_MAX}
              aria-label="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="tb-search">
            <Search size={15} color="var(--muted)" />
            <input
              type="text"
              placeholder="Search document…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  goToMatch(e.shiftKey ? matchIdx - 1 : matchIdx + 1);
                }
              }}
              aria-label="Search document"
            />
            {query.trim() && (
              <>
                <span className="tb-count">
                  {matchCount ? `${matchIdx + 1} / ${matchCount}` : "0"}
                </span>
                <button
                  className="tb-btn"
                  type="button"
                  onClick={() => goToMatch(matchIdx - 1)}
                  disabled={matchCount === 0}
                  aria-label="Previous match"
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  className="tb-btn"
                  type="button"
                  onClick={() => goToMatch(matchIdx + 1)}
                  disabled={matchCount === 0}
                  aria-label="Next match"
                >
                  <ChevronDown size={15} />
                </button>
                <button
                  className="tb-btn"
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
