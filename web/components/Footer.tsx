import Link from "next/link";

const GITHUB = "https://github.com/bhavy278/signalyze-stream";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-cols">
          <div>
            <span className="brand">
              <span className="brand-dot" /> Signalyze
            </span>
            <p className="footer-blurb">
              Event-driven document intelligence. Upload, analyze, and ask.
            </p>
          </div>

          <div className="footer-col">
            <h4>Product</h4>
            <Link className="flink" href="/">New Analysis</Link>
            <Link className="flink" href="/documents">Your Documents</Link>
            <Link className="flink" href="/how-it-works">How It Works</Link>
          </div>

          <div className="footer-col">
            <h4>Resources</h4>
            <a className="flink" href={GITHUB} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a
              className="flink"
              href={`${GITHUB}/blob/main/docs/architecture.md`}
              target="_blank"
              rel="noreferrer"
            >
              Architecture
            </a>
            <a
              className="flink"
              href={`${GITHUB}/blob/main/CHANGELOG.md`}
              target="_blank"
              rel="noreferrer"
            >
              Changelog
            </a>
          </div>

          <div className="footer-col">
            <h4>Connect</h4>
            <a className="flink" href="mailto:bhavy0606@gmail.com">Email</a>
            <a
              className="flink"
              href="https://www.linkedin.com/in/bhavy278"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
            </a>
            <Link className="flink" href="/contact">Contact</Link>
          </div>
        </div>

        <div className="footer-sub">
          <span className="footer-meta">© 2026 Signalyze</span>
          <span className="footer-meta">Built with Java &middot; Kafka &middot; Next.js</span>
        </div>
      </div>
    </footer>
  );
}
