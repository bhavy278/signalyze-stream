import type {
  Analysis,
  AskResponse,
  ChatMessage,
  DocumentPage,
  StatusResponse,
  UploadResponse,
} from "@/lib/types";

export async function listDocuments(
  q?: string,
  page = 0,
  size = 8,
): Promise<DocumentPage> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  params.set("size", String(size));
  const res = await fetch(`/api/documents?${params.toString()}`, { cache: "no-store" });
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
  if (res.status === 404) return { jobId, status: "PROCESSING" };
  if (!res.ok) throw new Error("Status check failed");
  return res.json();
}

export async function getAnalysis(jobId: string): Promise<Analysis> {
  const res = await fetch(`/api/documents/${jobId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load analysis");
  return res.json();
}

export async function deleteDocument(jobId: string): Promise<void> {
  const res = await fetch(`/api/documents/${jobId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error("Delete failed");
}

export async function askDocument(jobId: string, question: string): Promise<AskResponse> {
  const res = await fetch(`/api/documents/${jobId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error("Ask failed");
  return res.json();
}

export async function getChat(jobId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/documents/${jobId}/chat`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load chat");
  return res.json();
}
