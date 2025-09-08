import { db } from "../db/database.ts";
import type { RawJob } from "../types/definitions/job.ts";

export function queryJobIds() {
  return db.query(`
    SELECT job_id FROM raw_jobs
    UNION
    SELECT job_id FROM clean_jobs
    UNION
    SELECT job_id FROM enhanced_jobs;
  `);
}

export function insertRawJobs(jobs: RawJob[]) {
  db.insert(
    "raw_jobs",
    ["name", "job_id", "details", "source"],
    jobs.map((job) => [job.name, job.jobId, JSON.stringify(job.details), job.source])
  );
}
