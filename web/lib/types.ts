export type JobStatus = "PROCESSING" | "DONE" | "FAILED";

export interface Analysis {
  jobId: string;
  filename: string;
  status: JobStatus;
  summary: string;
  createdAt: string;
}
