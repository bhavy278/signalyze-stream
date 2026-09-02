export type JobStatus = "PROCESSING" | "DONE" | "FAILED";

export interface KeyTerm {
  label: string;
  value: string;
}

export interface Risk {
  severity: string; // HIGH | MEDIUM | LOW
  title: string;
  detail: string;
}

export interface AnalysisResult {
  documentType?: string;
  parties?: string[];
  summary?: string;
  keyTerms?: KeyTerm[];
  risks?: Risk[];
}

export interface Analysis {
  jobId: string;
  filename: string;
  status: string;
  summary?: string;
  result?: AnalysisResult | null;
  createdAt: string;
}

export interface UploadResponse {
  jobId: string;
  status: string;
}

export interface StatusResponse {
  jobId: string;
  status: string;
}

export interface AskSource {
  chunkIndex: number;
  excerpt: string;
}

export interface AskResponse {
  answer: string;
  sources: AskSource[];
}
