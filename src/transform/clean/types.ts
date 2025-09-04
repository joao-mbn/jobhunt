import type { CleanJob, RawJob } from "../../types/definitions/job.ts";

export interface Cleaner {
  clean(rawJobs: RawJob[]): Promise<CleanResult[]>;
}

export type CleanResult = CleanResultSuccess | CleanResultFailure;

export interface CleanResultSuccess {
  success: true;
  jobId: string;
  job: CleanJob;
}

export interface CleanResultFailure {
  success: false;
  jobId: string;
  job: null;
}

export type AIGeneratedCleanJobInfo = Omit<CleanJob, keyof RawJob | "jobDescription">;
