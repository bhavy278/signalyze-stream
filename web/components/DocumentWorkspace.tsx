"use client";

import { useState } from "react";
import type { Analysis } from "@/lib/types";
import AnalysisReport from "@/components/AnalysisReport";
import DocumentChat from "@/components/DocumentChat";
import DocumentPreview, { type JumpTarget } from "@/components/DocumentPreview";

export default function DocumentWorkspace({ selected }: { selected: Analysis }) {
  const [tab, setTab] = useState<"document" | "analysis">("document");
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);

  const status = selected.status.toUpperCase();
  const ready = status === "DONE" && selected.jobId !== "pending";

  if (!ready) {
    return <AnalysisReport selected={selected} />;
  }

  function handleJump(text: string) {
    setTab("document");
    setJumpTarget({ text, nonce: Date.now() });
  }

  return (
    <div className="workspace">
      <div className="workspace-main">
        <div className="wtabs">
          <button
            className={tab === "document" ? "wtab wtab--active" : "wtab"}
            type="button"
            onClick={() => setTab("document")}
          >
            Document
          </button>
          <button
            className={tab === "analysis" ? "wtab wtab--active" : "wtab"}
            type="button"
            onClick={() => setTab("analysis")}
          >
            Analysis
          </button>
        </div>

        <div hidden={tab !== "document"}>
          <DocumentPreview
            jobId={selected.jobId}
            filename={selected.filename}
            jumpTarget={jumpTarget}
          />
        </div>
        <div hidden={tab !== "analysis"}>
          <AnalysisReport selected={selected} />
        </div>
      </div>

      <DocumentChat selected={selected} onJumpToSource={handleJump} />
    </div>
  );
}
