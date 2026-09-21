"use client";

import { useEffect, useRef, useState } from "react";
import { MorphIcon } from "morphicons/react";
import { LoaderCircle, Send } from "lucide";
import { ChevronRight, RefreshCw } from "lucide-react";
import type { Analysis, AskSource, ChatMessage } from "@/lib/types";
import { askDocumentStream, getChat } from "@/lib/api";

export default function DocumentChat({
  selected,
  onJumpToSource,
}: {
  selected: Analysis;
  onJumpToSource?: (text: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState<{ content: string; sources: AskSource[] } | null>(
    null,
  );
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const lastQuestionRef = useRef<string>("");

  const status = selected.status.toUpperCase();
  const chatReady = status === "DONE" && selected.jobId !== "pending";

  useEffect(() => {
    setMessages([]);
    setStreaming(null);
    setQuestion("");
    setAskError(null);
    if (!chatReady) return;
    let cancelled = false;
    getChat(selected.jobId)
      .then((h) => {
        if (!cancelled) setMessages(h);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selected.jobId, chatReady]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function handleAsk(e?: React.FormEvent, retryQuestion?: string) {
    e?.preventDefault();
    const q = (retryQuestion ?? question).trim();
    lastQuestionRef.current = q;
    if (!q || asking) return;
    setQuestion("");
    setAskError(null);
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setStreaming({ content: "", sources: [] });
    setAsking(true);

    let acc = "";
    let srcs: AskSource[] = [];
    try {
      await askDocumentStream(selected.jobId, q, {
        onSources: (s) => {
          srcs = s;
          setStreaming((v) => (v ? { ...v, sources: s } : v));
        },
        onToken: (t) => {
          acc += t;
          setStreaming((v) => (v ? { ...v, content: acc } : v));
        },
      });
      setMessages((prev) => [...prev, { role: "assistant", content: acc, sources: srcs }]);
    } catch {
      setAskError("Couldn’t get an answer — is the backend running?");
    } finally {
      setStreaming(null);
      setAsking(false);
    }
  }

  if (!chatReady) return null;

  const renderSources = (sources: AskSource[]) => (
    <details className="msg-sources">
      <summary>
        <ChevronRight className="src-caret" size={12} strokeWidth={2.5} />
        Sources
        <span className="src-count">{sources.length}</span>
      </summary>
      <div className="src-list">
        {sources.map((s) => (
          <button
            className="src-item"
            key={s.chunkIndex}
            type="button"
            title="Jump to this passage in the document"
            onClick={() => onJumpToSource?.(s.excerpt)}
          >
            <span className="src-pg">#{s.chunkIndex}</span>
            <span className="src-sn">{s.excerpt}</span>
          </button>
        ))}
      </div>
    </details>
  );

  return (
    <div className="card chat-card">
      <div className="chat-head">
        <div className="chat-head-t">Chat with this document</div>
        <div className="chat-head-s">Grounded answers with cited sources</div>
      </div>

      <div className="chat-log" ref={logRef}>
        {messages.length === 0 && !streaming && (
          <div className="chat-empty">
            Ask anything about this document — e.g. “What are the payment terms?”
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "msg msg--user" : "msg msg--ai"}>
            <div className="bubble">{m.content}</div>
            {m.role === "assistant" && m.sources && m.sources.length > 0 && renderSources(m.sources)}
          </div>
        ))}

        {streaming && (
          <div className="msg msg--ai">
            <div className="bubble">{streaming.content || "Thinking…"}</div>
            {streaming.sources.length > 0 && renderSources(streaming.sources)}
          </div>
        )}

        {askError && (
          <div className="chat-error">
            <span>{askError}</span>
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => handleAsk(undefined, lastQuestionRef.current)}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}
      </div>

      <form className="ask-row" onSubmit={handleAsk}>
        <input
          className="search"
          type="text"
          placeholder="Ask a question…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={asking}
        />
        <button
          className="send-btn"
          type="submit"
          disabled={asking || !question.trim()}
          aria-label="Send"
        >
          <MorphIcon
            icon={asking ? LoaderCircle : Send}
            size={18}
            color="#fff"
            strokeWidth={2}
            className={asking ? "spin" : undefined}
          />
        </button>
      </form>
    </div>
  );
}
