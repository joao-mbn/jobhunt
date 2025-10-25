import type { Database } from "../../db/database.ts";
import { buildPlaceholders, objectsToColumnsAndRows } from "../../db/utils.ts";
import { fromEnhancedJobToDBEnhancedJob } from "../../types/converters/job-to-schema.ts";
import { fromDBCleanJobToCleanJob } from "../../types/converters/schema-to-job.ts";
import type { EnhancedJob } from "../../types/definitions/job.ts";
import type { DBCleanJob } from "../../types/definitions/schema.ts";
import { isDBCleanJob } from "../../types/validators/schema.ts";
import { MAX_FAIL_COUNT } from "../../utils/constants.ts";
import type { TransformResultSuccess } from "../types.ts";

export function queryCleanJobs(db: Database) {
  const cleanJobsResult = db.query(`
      SELECT * FROM clean_jobs
      WHERE fail_count <= ${MAX_FAIL_COUNT}
      ORDER BY created_at ASC
      LIMIT 5
    `);

  const dbCleanJobs = cleanJobsResult.filter(
    isDBCleanJob,
  ) as unknown as DBCleanJob[];
  const cleanJobs = dbCleanJobs.map(fromDBCleanJobToCleanJob);
  return cleanJobs;
}

export function updateFailedEnhancement(db: Database, failedJobIds: string[]) {
  db.query(
    `UPDATE clean_jobs
         SET fail_count = fail_count + 1
         WHERE job_id IN ${buildPlaceholders(failedJobIds)}`,
    ...failedJobIds,
  );
}

export function deleteEnhancedCleanJobs(
  db: Database,
  successfulJobIds: string[],
) {
  db.query(
    `DELETE FROM clean_jobs
         WHERE job_id IN ${buildPlaceholders(successfulJobIds)}`,
    ...successfulJobIds,
  );
}

export function insertNewEnhancedJobs(
  db: Database,
  successfulResults: TransformResultSuccess<EnhancedJob>[],
) {
  // make sure that the enhanced jobs are not already in the database
  const existingEnhancedJobs = db.query(
    `SELECT job_id FROM enhanced_jobs
         WHERE job_id IN ${buildPlaceholders(successfulResults)}`,
    ...successfulResults.map(({ jobId }) => jobId),
  );
  console.log(`Found ${existingEnhancedJobs.length} existing enhanced jobs`);

  const newEnhancedJobs = successfulResults
    .filter(
      ({ jobId }) => !existingEnhancedJobs.some((j) => j.job_id === jobId),
    )
    .map(({ job }) => job);
  if (newEnhancedJobs.length === 0) {
    return;
  }

  const newEnhancedDBJobs = newEnhancedJobs.map(fromEnhancedJobToDBEnhancedJob);
  const { columns, rows } = objectsToColumnsAndRows(newEnhancedDBJobs);

  db.insert("enhanced_jobs", columns, rows);
}
