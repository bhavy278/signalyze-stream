import type { Metadata } from "next";

export const metadata: Metadata = { title: "How it works — Signalyze" };

const steps = [
  { n: "01", t: "Upload", d: "Drop a PDF or text document. The ingest service extracts the text and hands it off instantly, without making you wait." },
  { n: "02", t: "Stream", d: "The document is published to Apache Kafka, so processing happens asynchronously and never blocks your upload." },
  { n: "03", t: "Analyze", d: "A processing service runs the text through an AI model to classify it and pull out parties, key terms, and risk-flagged clauses." },
  { n: "04", t: "Index", d: "The text is split into chunks and embedded into vectors, making the document searchable by meaning — the foundation for Q&A." },
  { n: "05", t: "Ask", d: "Ask a question and the system retrieves the most relevant passages and answers from them, citing the exact excerpts it used." },
];

export default function HowItWorks() {
  return (
    <main className="wrap">
      <section className="hero">
        <div className="eyebrow">How it works</div>
        <h1 className="hero-title">An event-driven pipeline, end to end.</h1>
        <p className="lead">
          Signalyze is built as a set of microservices that talk over a message
          stream — the same architecture used by systems that process documents at scale.
        </p>
      </section>

      <div className="steps">
        {steps.map((s) => (
          <div className="step" key={s.n}>
            <div className="step-n">{s.n}</div>
            <div>
              <h3 className="step-t">{s.t}</h3>
              <p className="step-d">{s.d}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="callout">
        <div className="eyebrow">Under the hood</div>
        <p className="callout-text">
          Java 21 &amp; Spring Boot services · Apache Kafka for messaging ·
          MongoDB for storage · Redis for caching and status · OpenAI for
          analysis and retrieval-augmented answers.
        </p>
      </section>
    </main>
  );
}
