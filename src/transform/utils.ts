import type { Job } from "../types/definitions/job.ts";

export async function transformBySource<T extends Job, Z>(
  jobs: T[],
  transformer: Record<Job["source"], (jobs: T[]) => Promise<Z[]> | undefined>
): Promise<Z[]> {
  const jobsBySource = groupBySource(jobs);

  const promises = Object.entries(jobsBySource).map(
    ([source, jobs]: [Job["source"], T[]]) => transformer[source]?.(jobs) ?? ([] as Z[])
  );
  const results = (await Promise.all(promises)).flat();
  return results;
}

function groupBySource<T extends Job>(jobs: T[]): Record<Job["source"], T[]> {
  return jobs.reduce((acc, job) => {
    if (!acc[job.source]) {
      acc[job.source] = [];
    }
    acc[job.source].push(job);
    return acc;
  }, {} as Record<Job["source"], T[]>);
}
