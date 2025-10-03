import { db } from "../../db/database.ts";
import { objectsToColumnsAndRows } from "../../db/utils.ts";
import { fromPrefillsToDBPrefills } from "../../types/converters/job-to-schema.ts";
import { fromDBEnhancedJobToEnhancedJob } from "../../types/converters/schema-to-job.ts";
import type { DBEnhancedJob } from "../../types/definitions/schema.ts";
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
        AND ej.uploaded_to_sheet = 0
      ORDER BY ej.created_at ASC
      LIMIT 5
    `);

  const dbEnhancedJobs = enhancedJobsResult.filter(
    isDBEnhancedJob,
  ) as unknown as DBEnhancedJob[];
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
    ...jobIds,
  );
}

export function insertNewPrefills(successfulResults: PrefillsResultSuccess[]) {
  // Make sure that the prefills are not already in the database
  const existingPrefills = db.query(
    `SELECT enhanced_job_id FROM prefills
         WHERE enhanced_job_id IN (${successfulResults.map(() => "?").join(",")})`,
    ...successfulResults.map(({ enhancedJobId }) => enhancedJobId),
  );
  console.log(`Found ${existingPrefills.length} existing prefills`);

  const newPrefills = successfulResults
    .filter(
      ({ enhancedJobId }) =>
        !existingPrefills.some((p) => p.enhanced_job_id === enhancedJobId),
    )
    .map(({ prefills }) => prefills);

  if (newPrefills.length === 0) {
    return;
  }

  const newPrefillsDB = newPrefills.map(fromPrefillsToDBPrefills);
  const { columns, rows } = objectsToColumnsAndRows(newPrefillsDB);

  db.insert("prefills", columns, rows);
}
