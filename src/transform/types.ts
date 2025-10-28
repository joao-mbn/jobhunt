import type { Job, Prefills } from "../types/definitions/job.ts";

export type TransformResult<T extends Job> =
  | TransformResultSuccess<T>
  | TransformResultFailure;

export interface TransformResultSuccess<T extends Job> {
  success: true;
  jobId: string;
  job: T;
}

export interface TransformResultFailure {
  success: false;
  jobId: string;
  job: null;
}

export type PrefillsResult = PrefillsResultSuccess | PrefillsResultFailure;

export interface PrefillsResultSuccess {
  success: true;
  enhancedJobId: string;
  prefills: Prefills;
}

export interface PrefillsResultFailure {
  success: false;
  enhancedJobId: string;
  prefills: null;
}
