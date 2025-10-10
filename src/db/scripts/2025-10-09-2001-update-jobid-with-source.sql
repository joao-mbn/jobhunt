PRAGMA foreign_keys = OFF;

UPDATE raw_jobs
SET job_id = "source"||'-'||job_id
WHERE "source" in ('linkedin', 'levels');

UPDATE clean_jobs
SET job_id = "source"||'-'||job_id
WHERE "source" in ('linkedin', 'levels');

UPDATE prefills
SET enhanced_job_id = "source"||'-'||enhanced_job_id
WHERE enhanced_job_id IN (
    SELECT job_id
    FROM enhanced_jobs
    WHERE "source" in ('linkedin', 'levels')
);

UPDATE enhanced_jobs
SET job_id = "source"||'-'||job_id
WHERE "source" in ('linkedin', 'levels');

PRAGMA foreign_keys = ON;