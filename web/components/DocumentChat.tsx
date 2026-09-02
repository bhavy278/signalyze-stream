"use client";

import { useEffect, useRef, useState } from "react";
import { MorphIcon } from "morphicons/react";
import { LoaderCircle, Send } from "lucide";
import type { Analysis, ChatMessage } from "@/lib/types";
import { askDocument, getChat } from "@/lib/api";

export default function DocumentChat({ selected }: { selected: Analysis }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const status = selected.status.toUpperCase();
  const chatReady = status === "DONE" && selected.jobId !== "pending";

  useEffect(() => {
    setMessages([]);
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
  }, [messages, asking]);

  async function handleAsk(e?: React.FormEvent) {
    e?.preventDefault();
    const q = question.trim();
    if (!q || asking) return;
    setQuestion("");
    setAskError(null);
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setAsking(true);
    try {
      const res = await askDocument(selected.jobId, q);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, sources: res.sources },
      ]);
    } catch {
      setAskError("Couldn’t get an answer — is the backend running?");
    } finally {
      setAsking(false);
    }
  }

  if (!chatReady) return null;

  return (
    <div className="card chat-card" style={{ padding: 24 }}>
      <div className="eyebrow">Chat with this document</div>

      <div className="chat-log" ref={logRef}>
        {messages.length === 0 && !asking && (
          <div className="chat-empty">
            Ask anything about this document — e.g. “What are the payment terms?”
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "msg msg--user" : "msg msg--ai"}>
            <div className="bubble">{m.content}</div>
            {m.role === "assistant" && m.sources && m.sources.length > 0 && (
              <div className="msg-sources">
                <div className="eyebrow">Sources</div>
                {m.sources.map((s) => (
                  <div className="source" key={s.chunkIndex}>
                    <span className="source-tag">#{s.chunkIndex}</span>
                    <span className="source-text">{s.excerpt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {asking && <div className="typing">Thinking…</div>}
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

      {askError && (
        <p style={{ color: "var(--failed)", marginTop: 8, fontSize: 14 }}>{askError}</p>
      )}
    </div>
  );
}
