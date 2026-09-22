"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { Analysis } from "@/lib/types";
import AnalysisReport from "@/components/AnalysisReport";
import DocumentChat from "@/components/DocumentChat";
import DocumentPreview, { type JumpTarget } from "@/components/DocumentPreview";

type Tab = "document" | "analysis" | "chat";

const TABS: { id: Tab; label: string }[] = [
  { id: "document", label: "Document" },
  { id: "analysis", label: "Analysis" },
  { id: "chat", label: "Chat" },
];

// Module-level so children never remount when the parent re-renders.
function TabPanel({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{ display: active ? "block" : "none" }}
    >
      {children}
    </motion.div>
  );
}

export default function DocumentWorkspace({
  selected,
  streamingOverview,
  crumb,
  onNew,
  newLabel = "New",
  newIcon,
}: {
  selected: Analysis;
  streamingOverview?: string;
  crumb?: string;
  onNew?: () => void;
  newLabel?: string;
  newIcon?: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("document");
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);

  const status = selected.status.toUpperCase();
  const ready = status === "DONE" && selected.jobId !== "pending";

  function handleJump(text: string) {
    setTab("document");
    setJumpTarget({ text, nonce: Date.now() });
  }

  const header = (
    <div className="whead">
      <div className="whead-lhs">
        {crumb && <span className="crumb">{crumb}</span>}
        {ready && (
          <div className="wtabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? "wtab wtab--active" : "wtab"}
                type="button"
                onClick={() => setTab(t.id)}
              >
                {tab === t.id && (
                  <motion.span
                    layoutId="wtab-pill"
                    className="wtab-pill"
                    transition={{ type: "spring", stiffness: 520, damping: 40 }}
                  />
                )}
                <span className="wtab-text">{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {onNew && (
        <button className="btn btn-sm" type="button" onClick={onNew}>
          {newIcon}
          {newLabel}
        </button>
      )}
    </div>
  );

  if (!ready) {
    return (
      <div>
        {header}
        <div className="wbody">
          <AnalysisReport selected={selected} streamingOverview={streamingOverview} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <div className="wbody">
        <TabPanel active={tab === "document"}>
          <DocumentPreview
            jobId={selected.jobId}
            filename={selected.filename}
            jumpTarget={jumpTarget}
          />
        </TabPanel>
        <TabPanel active={tab === "analysis"}>
          <AnalysisReport selected={selected} />
        </TabPanel>
        <TabPanel active={tab === "chat"}>
          <DocumentChat selected={selected} onJumpToSource={handleJump} />
        </TabPanel>
      </div>
    </div>
  );
}
