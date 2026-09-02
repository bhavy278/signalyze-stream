export default function Home() {
  return (
    <main
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "28px 26px 80px",
      }}
    >
      {/* ===== Masthead ===== */}
      <header className="masthead">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "76px 1fr 76px",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span className="badge">
            Est.
            <br />
            2026
            <br />
            N.Y.
          </span>
          <div>
            <h1>Signalyze</h1>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-2)",
                fontSize: 18,
                marginTop: 2,
              }}
            >
              “The fine print, read for you.”
            </p>
          </div>
          <span className="badge">
            Vol.
            <br />I
          </span>
        </div>

        <div className="banner-bar" style={{ marginTop: 14 }}>
          <span>☞ Two Cents</span>
          <span className="center">The Signalyze Family Ledger</span>
          <span>Est. MMXXVI ☜</span>
        </div>
        <div
          className="label"
          style={{ padding: "8px 0", letterSpacing: "0.2em" }}
        >
          Monday Edition · New York · Analysis Rendered While You Wait
        </div>
        <hr className="rule" />
      </header>

      {/* ===== Two-column front page ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 30,
          marginTop: 28,
        }}
      >
        {/* Lead story */}
        <article>
          <div className="kicker">Analysis · Lead Story</div>
          <h2 style={{ fontSize: "clamp(34px, 5.6vw, 60px)", marginTop: 6 }}>
            Service Agreement Binds Client to $5,000 Monthly, Thirty-Day Exit
          </h2>
          <p className="deck" style={{ marginTop: 10 }}>
            Late payments to incur five percent penalty; unusual clause exposes
            client to six-figure liability.
          </p>
          <div className="byline" style={{ marginTop: 12 }}>
            Filed by GPT-4o-mini · 2:31 P.M. · contract.txt
          </div>
          <hr className="rule--hair" style={{ margin: "14px 0" }} />
          <p className="lead article">
            This Service Agreement outlines the terms between Acme Corp and the
            Client, including payment obligations and termination conditions.
            Key obligations include a commitment to pay five thousand dollars
            monthly and a requirement for thirty days written notice for
            termination from either party. Of note: a five percent fee on late
            payments, and an unusual clause holding the Client liable for
            damages exceeding one hundred thousand dollars in cases of misuse.
          </p>

          <div className="ornament" style={{ marginTop: 18 }}>
            ⁂
          </div>
        </article>

        {/* Sidebar */}
        <aside className="rail" style={{ paddingLeft: 24 }}>
          <div className="label" style={{ color: "var(--accent)" }}>
            The Archive
          </div>
          <hr className="rule" style={{ margin: "8px 0 12px" }} />
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: 12,
            }}
          >
            {[
              ["lease-2019.pdf", "Filed"],
              ["nda-draft.txt", "On the wire"],
              ["invoice-Q3.pdf", "Filed"],
            ].map(([name, status]) => (
              <li key={name}>
                <div
                  style={{ fontFamily: "var(--font-serif)", fontWeight: 700 }}
                >
                  {name}
                </div>
                <div className="byline">{status}</div>
              </li>
            ))}
          </ul>

          <div className="adbox" style={{ marginTop: 24 }}>
            <div
              className="label"
              style={{ color: "var(--accent)", marginBottom: 6 }}
            >
              Advertisement
            </div>
            <div className="adhead">Read It For Me!</div>
            <p
              style={{
                fontSize: 14,
                color: "var(--ink-2)",
                margin: "6px 0 14px",
              }}
            >
              Submit any contract or document. A full analysis rendered in
              seconds. No obligation!
            </p>
            <button className="adbtn">☞ Submit a Document</button>
          </div>

          <div style={{ marginTop: 24 }}>
            <div className="label">Wire Status</div>
            <hr className="rule--hair" style={{ margin: "8px 0 10px" }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="stamp stamp--processing">On the wire</span>
              <span className="stamp stamp--done">Filed</span>
              <span className="stamp stamp--failed">Spiked</span>
            </div>
          </div>
        </aside>
      </div>

      <hr className="rule--double" style={{ marginTop: 28 }} />
      <div className="label" style={{ textAlign: "center", padding: "10px 0" }}>
        Printed &amp; Filed by Signalyze · MMXXVI · All Clauses Reserved
      </div>
    </main>
  );
}
