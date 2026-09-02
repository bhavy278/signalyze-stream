export type JobStatus = "PROCESSING" | "DONE" | "FAILED";

export interface Analysis {
  jobId: string;
  filename: string;
  status: string;
  summary: string;
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
