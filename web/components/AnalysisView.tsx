import type { Analysis } from "@/lib/types";
import AnalysisReport from "@/components/AnalysisReport";
import DocumentChat from "@/components/DocumentChat";

// Stacked report + chat (used on the New Analysis page)
export default function AnalysisView({ selected }: { selected: Analysis }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <AnalysisReport selected={selected} />
      <DocumentChat selected={selected} />
    </div>
  );
}
