import type { BaseRecord, CleanJob, EnhancedJob, Prefills, RawJob } from "../definitions/job.ts";
import type { DBBaseRecord, DBCleanJob, DBEnhancedJob, DBPrefills, DBRawJob } from "../definitions/schema.ts";

export function fromBaseRecordToDBBaseRecord(record: BaseRecord): DBBaseRecord {
  return {
    id: record.id,
    fail_count: record.failCount,
    created_at: record.createdAt?.toISOString(),
    updated_at: record.updatedAt?.toISOString(),
  };
}

export function fromRawJobToDBRawJob(job: RawJob): DBRawJob {
  return {
    ...fromBaseRecordToDBBaseRecord(job),
    name: job.name,
    job_id: job.jobId,
    details: JSON.stringify(job.details),
    source: job.source,
  };
}

export function fromCleanJobToDBCleanJob(job: CleanJob): DBCleanJob {
  return {
    ...fromRawJobToDBRawJob(job),
    work_arrangement: job.workArrangement,
    compensation: job.compensation,
    company: job.company,
    location: job.location,
    role: job.role,
    published_date: job.publishedDate?.toISOString(),
    years_of_experience_required: job.yearsOfExperienceRequired,
    hard_skills_required: job.hardSkillsRequired,
  };
}

export function fromEnhancedJobToDBEnhancedJob(job: EnhancedJob): DBEnhancedJob {
  return {
    ...fromCleanJobToDBCleanJob(job),
    relevance_score: job.relevanceScore,
    relevance_reason: job.relevanceReason,
    recommendation: job.recommendation,
    uploaded_to_sheet: job.uploadedToSheet,
  };
}

export function fromPrefillsToDBPrefills(prefills: Prefills): DBPrefills {
  return {
    ...fromBaseRecordToDBBaseRecord(prefills),
    enhanced_job_id: prefills.enhancedJobId,
    cover_letter: prefills.coverLetter,
  };
}
