import type { Job, Prefills } from "../types/definitions/job.ts";
import type {
  PrefillsResultFailure,
  PrefillsResultSuccess,
  TransformResultFailure,
  TransformResultSuccess,
} from "./types.ts";

export async function transformBySource<T extends Job, Z>(
  jobs: T[],
  transformer: Record<Job["source"], (jobs: T[]) => Promise<Z[]> | undefined>,
): Promise<Z[]> {
  const jobsBySource = groupBySource(jobs);

  const promises = Object.entries(jobsBySource).map(
    ([source, jobs]: [Job["source"], T[]]) =>
      transformer[source]?.(jobs) ?? ([] as Z[]),
  );
  const results = (await Promise.all(promises)).flat();
  return results;
}

function groupBySource<T extends Job>(jobs: T[]): Record<Job["source"], T[]> {
  return jobs.reduce(
    (acc, job) => {
      if (!acc[job.source]) {
        acc[job.source] = [];
      }
      acc[job.source].push(job);
      return acc;
    },
    {} as Record<Job["source"], T[]>,
  );
}

export function createTransformResultSuccess<T extends Job>(
  job: T,
): TransformResultSuccess<T> {
  return {
    success: true,
    jobId: job.jobId,
    job,
  };
}

export function createTransformResultFailure(job: Job): TransformResultFailure {
  return {
    success: false,
    jobId: job.jobId,
    job: null,
  };
}

export function createPrefillsResultSuccess(
  prefills: Prefills,
): PrefillsResultSuccess {
  return {
    success: true,
    enhancedJobId: prefills.enhancedJobId,
    prefills,
  };
}

export function createPrefillsResultFailure(
  enhancedJobId: string,
): PrefillsResultFailure {
  return {
    success: false,
    enhancedJobId,
    prefills: null,
  };
}
