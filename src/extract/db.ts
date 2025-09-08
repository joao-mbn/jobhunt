import { db } from "../db/database.ts";
import { objectsToColumnsAndRows } from "../db/utils.ts";
import { fromRawJobToDBRawJob } from "../types/converters/job-to-schema.ts";
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
  if (jobs.length === 0) {
    return;
  }

  const rawJobsDB = jobs.map(fromRawJobToDBRawJob);
  const { columns, rows } = objectsToColumnsAndRows(rawJobsDB);
  db.insert("raw_jobs", columns, rows);
}
