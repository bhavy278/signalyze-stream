import type { Analysis, StatusResponse, UploadResponse } from "@/lib/types";

export async function listDocuments(): Promise<Analysis[]> {
  const res = await fetch("/api/documents", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load documents");
  return res.json();
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/documents", { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function getStatus(jobId: string): Promise<StatusResponse> {
  const res = await fetch(`/api/documents/${jobId}/status`, { cache: "no-store" });
  if (!res.ok) throw new Error("Status check failed");
  return res.json();
}

export async function getAnalysis(jobId: string): Promise<Analysis> {
  const res = await fetch(`/api/documents/${jobId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load analysis");
  return res.json();
}