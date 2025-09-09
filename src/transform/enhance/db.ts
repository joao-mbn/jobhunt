import { db } from "../../db/database.ts";
import { objectsToColumnsAndRows } from "../../db/utils.ts";
import { fromEnhancedJobToDBEnhancedJob } from "../../types/converters/job-to-schema.ts";
import { fromDBCleanJobToCleanJob } from "../../types/converters/schema-to-job.ts";
import type { DBCleanJob } from "../../types/definitions/schema.ts";
import { isDBCleanJob } from "../../types/validators/schema.ts";
import type { EnhanceResultFailure, EnhanceResultSuccess } from "./types.ts";

export function queryCleanJobs() {
  const cleanJobsResult = db.query(`
      SELECT * FROM clean_jobs
      WHERE fail_count <= 3
      ORDER BY created_at ASC
      LIMIT 15
    `);

  const dbCleanJobs = cleanJobsResult.filter(isDBCleanJob) as unknown as DBCleanJob[];
  const cleanJobs = dbCleanJobs.map(fromDBCleanJobToCleanJob);
  return cleanJobs;
}

export function updateFailedEnhancement(failedResults: EnhanceResultFailure[]) {
  const jobIds = failedResults.map((result) => result.jobId);
  const placeholders = jobIds.map(() => "?").join(",");

  db.query(
    `UPDATE clean_jobs
         SET fail_count = fail_count + 1
         WHERE job_id IN (${placeholders})`,
    ...jobIds
  );
}

export function deleteEnhancedCleanJobs(successfulResults: EnhanceResultSuccess[]) {
  db.query(
    `DELETE FROM clean_jobs
         WHERE job_id IN (${successfulResults.map(() => "?").join(",")})`,
    ...successfulResults.map(({ jobId }) => jobId)
  );
}

export function insertNewEnhancedJobs(successfulResults: EnhanceResultSuccess[]) {
  // make sure that the enhanced jobs are not already in the database
  const existingEnhancedJobs = db.query(
    `SELECT job_id FROM enhanced_jobs
         WHERE job_id IN (${successfulResults.map(() => "?").join(",")})`,
    ...successfulResults.map(({ jobId }) => jobId)
  );
  console.log(`Found ${existingEnhancedJobs.length} existing enhanced jobs`);

  const newEnhancedJobs = successfulResults
    .filter(({ jobId }) => !existingEnhancedJobs.some((j) => j.job_id === jobId))
    .map(({ job }) => job);
  if (newEnhancedJobs.length === 0) {
    return;
  }

  const newEnhancedDBJobs = newEnhancedJobs.map(fromEnhancedJobToDBEnhancedJob);
  const { columns, rows } = objectsToColumnsAndRows(newEnhancedDBJobs);

  db.insert("enhanced_jobs", columns, rows);
}
