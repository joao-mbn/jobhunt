import type { CleanJob, EnhancedJob } from "../../types/definitions/job.ts";

export interface Enhancer {
  enhance(cleanJobs: CleanJob[]): Promise<EnhanceResult[]>;
}

export type EnhanceResult = EnhanceResultSuccess | EnhanceResultFailure;

export interface EnhanceResultSuccess {
  success: true;
  jobId: string;
  job: EnhancedJob;
}

export interface EnhanceResultFailure {
  success: false;
  jobId: string;
  job: null;
}

export type AIGeneratedEnhancedJobInfo = Omit<EnhancedJob, keyof CleanJob | "uploadedToSheet">;
