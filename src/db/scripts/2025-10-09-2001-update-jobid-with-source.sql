/*
  Update the job_id in the raw_jobs, clean_jobs, and enhanced_jobs and prefills tables
  to include the source of the job for improved readability.
 */

PRAGMA foreign_keys = OFF;

UPDATE raw_jobs
SET job_id = "source"||'-'||job_id
WHERE "source" in ('linkedin', 'levels');

UPDATE clean_jobs
SET job_id = "source"||'-'||job_id
WHERE "source" in ('linkedin', 'levels');

UPDATE prefills as p
SET enhanced_job_id = ej."source"||'-'||enhanced_job_id
FROM enhanced_jobs ej
WHERE ej."source" in ('linkedin', 'levels') and p.enhanced_job_id = ej.job_id;

UPDATE enhanced_jobs
SET job_id = "source"||'-'||job_id
WHERE "source" in ('linkedin', 'levels');

PRAGMA foreign_keys = ON;