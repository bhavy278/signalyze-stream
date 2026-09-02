import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact — Signalyze" };

const links = [
  { label: "Email", value: "bhavy0606@gmail.com", href: "mailto:bhavy0606@gmail.com" },
  { label: "GitHub", value: "github.com/bhavy278", href: "https://github.com/bhavy278" },
  { label: "LinkedIn", value: "linkedin.com/in/bhavy278", href: "https://www.linkedin.com/in/bhavy278" },
];

export default function Contact() {
  return (
    <main className="wrap">
      <section className="hero">
        <div className="eyebrow">Contact</div>
        <h1 className="hero-title">Get in touch.</h1>
        <p className="lead">
          Questions about the project, the architecture, or working together? Reach out
          on any of these.
        </p>
      </section>

      <div className="contact-list">
        {links.map((l) => (
          <a
            className="contact-item"
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noreferrer"
          >
            <span className="contact-label">{l.label}</span>
            <span className="contact-value">{l.value}</span>
          </a>
        ))}
      </div>
    </main>
  );
}
