import type { Database } from "../../db/database.ts";
import { buildPlaceholders, objectsToColumnsAndRows } from "../../db/utils.ts";
import { fromCleanJobToDBCleanJob } from "../../types/converters/job-to-schema.ts";
import { fromDBRawJobToRawJob } from "../../types/converters/schema-to-job.ts";
import type { CleanJob } from "../../types/definitions/job.ts";
import type { DBRawJob } from "../../types/definitions/schema.ts";
import { isDBRawJob } from "../../types/validators/schema.ts";
import { MAX_FAIL_COUNT } from "../../utils/constants.ts";
import type { TransformResultSuccess } from "../types.ts";

export function queryRawJobs(db: Database) {
  const rawJobsResult = db.query(`
      SELECT * FROM raw_jobs
      WHERE fail_count <= ${MAX_FAIL_COUNT}
      ORDER BY created_at ASC
      LIMIT 5
    `);

  const dbRawJobs = rawJobsResult.filter(isDBRawJob) as unknown as DBRawJob[];
  const rawJobs = dbRawJobs.map(fromDBRawJobToRawJob);
  return rawJobs;
}

export function updateFailedCleaning(db: Database, failedJobIds: string[]) {
  db.query(
    `UPDATE raw_jobs
         SET fail_count = fail_count + 1
         WHERE job_id IN ${buildPlaceholders(failedJobIds)}`,
    ...failedJobIds,
  );
}

export function deleteCleanedRawJobs(db: Database, successfulJobIds: string[]) {
  db.query(
    `DELETE FROM raw_jobs
         WHERE job_id IN ${buildPlaceholders(successfulJobIds)}`,
    ...successfulJobIds,
  );
}

export function insertNewCleanJobs(
  db: Database,
  successfulResults: TransformResultSuccess<CleanJob>[],
) {
  const existingCleanJobs = db.query(
    `SELECT job_id FROM clean_jobs
         WHERE job_id IN ${buildPlaceholders(successfulResults)}`,
    ...successfulResults.map(({ jobId }) => jobId),
  );
  console.log(`Found ${existingCleanJobs.length} existing clean jobs`);

  const newCleanJobs = successfulResults
    .filter(({ jobId }) => !existingCleanJobs.some((j) => j.job_id === jobId))
    .map(({ job }) => job);
  if (newCleanJobs.length === 0) {
    return;
  }

  const newCleanDBJobs = newCleanJobs.map(fromCleanJobToDBCleanJob);
  const { columns, rows } = objectsToColumnsAndRows(newCleanDBJobs);

  db.insert("clean_jobs", columns, rows);
}
