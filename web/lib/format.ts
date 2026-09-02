import type { Analysis } from "@/lib/types";

export const statusLabel: Record<string, string> = {
  PROCESSING: "Processing",
  DONE: "Done",
  FAILED: "Failed",
};

export function pillClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "DONE") return "pill pill--done";
  if (s === "FAILED") return "pill pill--failed";
  return "pill pill--processing";
}

export function sevClass(severity: string): string {
  const s = (severity || "low").toLowerCase();
  if (s === "high") return "sev sev--high";
  if (s === "medium") return "sev sev--medium";
  return "sev sev--low";
}

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

export type { Analysis };
