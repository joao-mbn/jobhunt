import { db } from "../../db/database.ts";
import { fromPrefillsToDBPrefills } from "../../types/converters/job-to-schema.ts";
import { fromDBEnhancedJobToEnhancedJob } from "../../types/converters/schema-to-job.ts";
import type { DBEnhancedJob, DBPrefills } from "../../types/definitions/schema.ts";
import { isDBEnhancedJob } from "../../types/validators/schema.ts";
import { MIN_RELEVANCE_SCORE } from "../../utils/constants.ts";
import type { PrefillsResultFailure, PrefillsResultSuccess } from "./types.ts";

export function queryEnhancedJobsWithoutPrefills() {
  const enhancedJobsResult = db.query(`
      SELECT ej.*
      FROM enhanced_jobs ej
      LEFT JOIN prefills p ON ej.job_id = p.enhanced_job_id
      WHERE p.enhanced_job_id IS NULL
        AND ej.fail_count <= 3
        AND ej.relevance_score >= ${MIN_RELEVANCE_SCORE}
      ORDER BY ej.relevance_score DESC, ej.created_at ASC
      LIMIT 15
    `);

  const dbEnhancedJobs = enhancedJobsResult.filter(isDBEnhancedJob) as unknown as DBEnhancedJob[];
  const enhancedJobs = dbEnhancedJobs.map(fromDBEnhancedJobToEnhancedJob);
  return enhancedJobs;
}

export function updateFailedPrefills(failedResults: PrefillsResultFailure[]) {
  const jobIds = failedResults.map((result) => result.enhancedJobId);
  const placeholders = jobIds.map(() => "?").join(",");

  db.query(
    `UPDATE enhanced_jobs
         SET fail_count = fail_count + 1
         WHERE job_id IN (${placeholders})`,
    ...jobIds
  );
  return jobIds;
}

export function insertNewPrefills(successfulResults: PrefillsResultSuccess[]) {
  // Make sure that the prefills are not already in the database
  const existingPrefills = db.query(
    `SELECT enhanced_job_id FROM prefills
         WHERE enhanced_job_id IN (${successfulResults.map(() => "?").join(",")})`,
    ...successfulResults.map(({ enhancedJobId }) => enhancedJobId)
  );
  console.log(`Found ${existingPrefills.length} existing prefills`);

  const newPrefills = successfulResults
    .filter(({ enhancedJobId }) => !existingPrefills.some((p) => p.enhanced_job_id === enhancedJobId))
    .map(({ prefills }) => prefills);

  if (newPrefills.length === 0) {
    return;
  }

  const newPrefillsDB = newPrefills.map(fromPrefillsToDBPrefills);
  const columns = (Object.keys(newPrefillsDB[0]) as (keyof DBPrefills)[]).filter((column) => column !== "id");
  const rows = newPrefillsDB.map((prefills) => columns.map((column) => prefills[column] ?? null));

  db.insert("prefills", columns, rows);
}
