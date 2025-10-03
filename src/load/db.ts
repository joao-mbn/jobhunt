import { db } from "../db/database.ts";
import { fromDBEnhancedJobToEnhancedJob } from "../types/converters/schema-to-job.ts";
import type { EnhancedJobWithPrefills } from "../types/definitions/job.ts";
import { isDBEnhancedJob } from "../types/validators/schema.ts";
import { MIN_RELEVANCE_SCORE } from "../utils/constants.ts";

export function queryEnhancedJobsWithPrefills(): EnhancedJobWithPrefills[] {
  const result = db.query(`
    SELECT
      ej.*,
      p.cover_letter
    FROM enhanced_jobs ej
    JOIN prefills p ON ej.job_id = p.enhanced_job_id
    WHERE ej.relevance_score >= ${MIN_RELEVANCE_SCORE}
      AND ej.uploaded_to_sheet = 0
      AND ej.fail_count <= 3
    ORDER BY ej.created_at ASC
    LIMIT 100
  `);

  const enhancedJobsWithPrefills: EnhancedJobWithPrefills[] = [];

  for (const row of result) {
    if (!isDBEnhancedJob(row)) {
      console.log(`Skipping invalid enhanced job record: ${row.job_id}`);
      continue;
    }

    const enhancedJob = fromDBEnhancedJobToEnhancedJob(row);

    enhancedJobsWithPrefills.push({
      ...enhancedJob,
      coverLetter: typeof row.cover_letter === "string" ? row.cover_letter : "",
    });
  }

  console.log(
    `📊 Found ${enhancedJobsWithPrefills.length} enhanced jobs with prefills ready for upload`,
  );
  return enhancedJobsWithPrefills;
}

export function markJobsAsUploaded(jobIds: string[]): void {
  const placeholders = jobIds.map(() => "?").join(",");

  db.query(
    `UPDATE enhanced_jobs
     SET uploaded_to_sheet = 1
     WHERE job_id IN (${placeholders})`,
    ...jobIds,
  );
}
