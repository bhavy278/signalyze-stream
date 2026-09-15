import type { Analysis } from "@/lib/types";
import { pillClass, sevClass, statusLabel } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";

export default function AnalysisReport({ selected }: { selected: Analysis }) {
  const r = selected.result ?? null;
  const summaryText = r?.summary ?? selected.summary ?? "";
  const status = selected.status.toUpperCase();

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="row-between">
        <div>
          <div className="meta">{selected.filename}</div>
          <h3 style={{ fontSize: 22, marginTop: 6, letterSpacing: "-0.01em" }}>
            {r?.documentType || "Summary"}
          </h3>
          {r?.parties && r.parties.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {r.parties.map((p) => (
                <span className="chip" key={p}>
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className={pillClass(selected.status)}>
          <span className="dot" />
          {statusLabel[status] ?? selected.status}
        </span>
      </div>

      {status === "PROCESSING" && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: "var(--muted)", marginBottom: 16 }}>
            Analyzing the document…
          </p>
          <Skeleton w="88%" h={12} style={{ marginBottom: 9 }} />
          <Skeleton w="76%" h={12} style={{ marginBottom: 9 }} />
          <Skeleton w="54%" h={12} />
          <div className="terms" style={{ marginTop: 18 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="term" key={i}>
                <Skeleton w="44%" h={10} style={{ marginBottom: 9 }} />
                <Skeleton w="72%" h={14} />
              </div>
            ))}
          </div>
        </div>
      )}
      {status === "FAILED" && (
        <p style={{ marginTop: 14, color: "var(--failed)" }}>
          Analysis failed for this document.
        </p>
      )}

      {summaryText && (
        <p style={{ marginTop: 16, color: "var(--ink-2)", lineHeight: 1.6 }}>
          {summaryText}
        </p>
      )}

      {r?.keyTerms && r.keyTerms.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginTop: 22 }}>
            Key Terms
          </div>
          <div className="terms">
            {r.keyTerms.map((t) => (
              <div className="term" key={t.label}>
                <div className="k">{t.label}</div>
                <div className="v">{t.value}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {r?.risks && r.risks.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="eyebrow">Risk Flags</div>
          <div style={{ marginTop: 6 }}>
            {r.risks.map((risk, i) => (
              <div className="risk" key={`${risk.title}-${i}`}>
                <span className={sevClass(risk.severity)}>{risk.severity}</span>
                <div>
                  <div className="rtitle">{risk.title}</div>
                  <div className="rdetail">{risk.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "DONE" && (
        <div className="metarow">
          gpt-4o-mini · {new Date(selected.createdAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
