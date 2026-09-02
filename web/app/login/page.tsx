"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiLogin, apiRegister } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { refresh } = useAuth();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await apiLogin(email.trim(), password);
      else await apiRegister(email.trim(), password);
      await refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <div className="auth-card card" style={{ padding: 28 }}>
        <div className="eyebrow">{mode === "login" ? "Welcome back" : "Get started"}</div>
        <h1 style={{ fontSize: 26, marginTop: 8 }}>
          {mode === "login" ? "Sign in to Signalyze" : "Create your account"}
        </h1>
        <p style={{ color: "var(--ink-2)", fontSize: 14, marginTop: 8, marginBottom: 20 }}>
          {mode === "login"
            ? "Enter your email and password to continue."
            : "Use an email and a password of at least 6 characters."}
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            className="search auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="search auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          {error && (
            <p style={{ color: "var(--failed)", fontSize: 14, margin: 0 }}>{error}</p>
          )}
          <button
            className="btn"
            type="submit"
            disabled={busy}
            style={{ justifyContent: "center", marginTop: 4 }}
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p style={{ marginTop: 18, fontSize: 14, color: "var(--ink-2)" }}>
          {mode === "login" ? "New to Signalyze? " : "Already have an account? "}
          <button
            className="linklike"
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}
