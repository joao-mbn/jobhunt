import type { BaseRecord, CleanJob, EnhancedJob, Prefills, RawJob } from "../types/job.ts";
import type { DBBaseRecord, DBCleanJob, DBEnhancedJob, DBPrefills, DBRawJob } from "../types/schema.ts";

export function fromDBBaseRecordToBaseRecord(record: DBBaseRecord): BaseRecord {
  return {
    id: record.id,
    failCount: record.fail_count,
    createdAt: record.created_at ? new Date(record.created_at) : undefined,
    updatedAt: record.updated_at ? new Date(record.updated_at) : undefined,
  };
}

export function fromDBRawJobToRawJob(job: DBRawJob): RawJob {
  return {
    ...fromDBBaseRecordToBaseRecord(job),
    name: job.name,
    jobId: job.job_id,
    details: job.details,
    source: job.source,
  };
}

export function fromDBCleanJobToCleanJob(job: DBCleanJob): CleanJob {
  const workArrangement = ["Remote", "Hybrid", "On-Site"].includes(job.work_arrangement)
    ? (job.work_arrangement as "Remote" | "Hybrid" | "On-Site")
    : undefined;

  return {
    ...fromDBRawJobToRawJob(job),
    workArrangement,
    compensation: job.compensation,
    company: job.company,
    location: job.location,
    role: job.role,
    publishedDate: job.published_date ? new Date(job.published_date) : undefined,
    yearsOfExperienceRequired: job.years_of_experience_required,
    hardSkillsRequired: job.hard_skills_required,
  };
}

export function fromDBEnhancedJobToEnhancedJob(job: DBEnhancedJob): EnhancedJob {
  const recommendation = ["Apply", "Consider", "Skip"].includes(job.recommendation)
    ? (job.recommendation as "Apply" | "Consider" | "Skip")
    : undefined;

  return {
    ...fromDBCleanJobToCleanJob(job),
    relevanceScore: job.relevance_score,
    relevanceReason: job.relevance_reason,
    recommendation,
    uploadedToSheet: job.uploaded_to_sheet,
  };
}

export function fromDBPrefillsToPrefills(prefills: DBPrefills): Prefills {
  return {
    ...fromDBBaseRecordToBaseRecord(prefills),
    enhancedJobId: prefills.enhanced_job_id,
    coverLetter: prefills.cover_letter,
  };
}
