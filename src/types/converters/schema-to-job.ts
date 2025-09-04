import { fromDateStringSafely } from "../../utils/date.ts";
import type { BaseRecord, CleanJob, EnhancedJob, Prefills, RawJob } from "../definitions/job.ts";
import type { DBBaseRecord, DBCleanJob, DBEnhancedJob, DBPrefills, DBRawJob } from "../definitions/schema.ts";

export function fromDBBaseRecordToBaseRecord(record: DBBaseRecord): BaseRecord {
  return {
    id: record.id,
    failCount: record.fail_count,
    createdAt: fromDateStringSafely(record.created_at),
    updatedAt: fromDateStringSafely(record.updated_at),
  };
}

export function fromDBRawJobToRawJob(job: DBRawJob): RawJob {
  return {
    ...fromDBBaseRecordToBaseRecord(job),
    name: job.name,
    jobId: job.job_id,
    details: JSON.parse(job.details),
    source: job.source as "linkedin" | "levels",
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
    publishedDate: fromDateStringSafely(job.published_date),
    yearsOfExperienceRequired: job.years_of_experience_required,
    hardSkillsRequired: job.hard_skills_required,
    jobDescription: job.job_description,
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
    uploadedToSheet: job.uploaded_to_sheet === 1,
  };
}

export function fromDBPrefillsToPrefills(prefills: DBPrefills): Prefills {
  return {
    ...fromDBBaseRecordToBaseRecord(prefills),
    enhancedJobId: prefills.enhanced_job_id,
    coverLetter: prefills.cover_letter,
  };
}
