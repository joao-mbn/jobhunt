import { db } from "../../db/database.ts";
import { fromCleanJobToDBCleanJob } from "../../types/converters/job-to-schema.ts";
import { fromDBRawJobToRawJob } from "../../types/converters/schema-to-job.ts";
import type { DBCleanJob, DBRawJob } from "../../types/definitions/schema.ts";
import { isDBRawJob } from "../../types/validators/schema.ts";
import type { CleanResultFailure, CleanResultSuccess } from "./types.ts";

export function queryRawJobs() {
  const rawJobsResult = db.query(`
      SELECT * FROM raw_jobs
      WHERE fail_count <= 3
      ORDER BY created_at ASC
      LIMIT 15
    `);

  const dbRawJobs = rawJobsResult.filter(isDBRawJob) as unknown as DBRawJob[];
  const rawJobs = dbRawJobs.map(fromDBRawJobToRawJob);
  return rawJobs;
}

export function updateFailedCleaning(failedResults: CleanResultFailure[]) {
  const jobIds = failedResults.map((result) => result.jobId);
  const placeholders = jobIds.map(() => "?").join(",");

  db.query(
    `UPDATE raw_jobs
         SET fail_count = fail_count + 1
         WHERE job_id IN (${placeholders})`,
    ...jobIds
  );
  return jobIds;
}

export function deleteCleanedRawJobs(successfulResults: CleanResultSuccess[]) {
  db.query(
    `DELETE FROM raw_jobs
         WHERE job_id IN (${successfulResults.map(() => "?").join(",")})`,
    ...successfulResults.map(({ jobId }) => jobId)
  );
}

export function insertNewCleanJobs(successfulResults: CleanResultSuccess[]) {
  // make sure that the clean jobs are not already in the database
  const existingCleanJobs = db.query(
    `SELECT job_id FROM clean_jobs
         WHERE job_id IN (${successfulResults.map(() => "?").join(",")})`,
    ...successfulResults.map(({ jobId }) => jobId)
  );
  console.log(`Found ${existingCleanJobs.length} existing clean jobs`);

  const newCleanJobs = successfulResults
    .filter(({ jobId }) => !existingCleanJobs.some((j) => j.job_id === jobId))
    .map(({ job }) => job);
  const newCleanDBJobs = newCleanJobs.map(fromCleanJobToDBCleanJob);
  if (newCleanJobs.length === 0) {
    return;
  }

  const columns = (Object.keys(newCleanDBJobs[0]) as (keyof DBCleanJob)[]).filter((column) => column !== "id");
  const rows = newCleanDBJobs.map((job) => columns.map((column) => job[column] ?? null));

  db.insert("clean_jobs", columns, rows);
}
