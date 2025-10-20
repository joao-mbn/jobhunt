import type { Job } from "../types/definitions/job.ts";

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
