import type { DBBaseRecord, DBCleanJob, DBEnhancedJob, DBJob, DBPrefills, DBRawJob } from "../types/schema.ts";
import { hasOptionalFields, hasRequiredFields } from "./has-fields.ts";

export function isDBBaseRecord(record: unknown): record is DBBaseRecord {
  if (typeof record !== "object" || record === null) {
    return false;
  }

  const requiredFields: Partial<Record<keyof DBBaseRecord, string>> = {
    created_at: "string",
    updated_at: "string",
    id: "number",
    fail_count: "number",
  };
  return hasRequiredFields(record, requiredFields);
}

export function isDBJob(job: unknown): job is DBJob {
  if (!isDBBaseRecord(job)) {
    return false;
  }

  const requiredFields: Partial<Record<keyof DBJob, string>> = {
    name: "string",
    job_id: "string",
    details: "object",
    source: "string",
  };
  return hasRequiredFields(job, requiredFields);
}

export function isDBRawJob(job: unknown): job is DBRawJob {
  return isDBJob(job);
}

export function isDBCleanJob(job: unknown): job is DBCleanJob {
  if (!isDBRawJob(job)) {
    return false;
  }

  const optionalFields: Partial<Record<keyof DBCleanJob, string>> = {
    work_arrangement: "string",
    compensation: "string",
    company: "string",
    location: "string",
    role: "string",
    published_date: "string",
    years_of_experience_required: "string",
    hard_skills_required: "string",
  };
  return hasOptionalFields(job, optionalFields);
}

export function isDBEnhancedJob(job: unknown): job is DBEnhancedJob {
  if (!isDBCleanJob(job)) {
    return false;
  }

  const requiredFields: Partial<Record<keyof DBEnhancedJob, string>> = {
    uploaded_to_sheet: "boolean",
  };
  if (!hasRequiredFields(job, requiredFields)) {
    return false;
  }

  const optionalFields: Partial<Record<keyof DBEnhancedJob, string>> = {
    relevance_score: "number",
    relevance_reason: "string",
    recommendation: "string",
  };
  return hasOptionalFields(job, optionalFields);
}

export function isDBPrefills(prefills: unknown): prefills is DBPrefills {
  if (!isDBBaseRecord(prefills)) {
    return false;
  }

  const requiredFields: Partial<Record<keyof DBPrefills, string>> = {
    enhanced_job_id: "number",
  };
  if (!hasRequiredFields(prefills, requiredFields)) {
    return false;
  }

  const optionalFields: Partial<Record<keyof DBPrefills, string>> = {
    cover_letter: "string",
  };
  return hasOptionalFields(prefills, optionalFields);
}
