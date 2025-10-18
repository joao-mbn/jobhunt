import type { CleanJob } from "../../types/definitions/job.ts";
import type { CleanResultSuccess } from "./types.ts";

/**
 * Converts a CleanJob to a CleanResultSuccess
 * @param job - The CleanJob to convert
 * @returns CleanResultSuccess object
 */
export function createCleanResultSuccess(job: CleanJob): CleanResultSuccess {
  return {
    success: true,
    jobId: job.jobId,
    job,
  };
}
