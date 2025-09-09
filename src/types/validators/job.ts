import type { BaseRecord, CleanJob, EnhancedJob, Job, Prefills, RawJob } from "../definitions/job.ts";
import { hasOptionalFields, hasRequiredFields } from "./has-fields.ts";

export function isBaseRecord(record: unknown): record is BaseRecord {
  if (typeof record !== "object" || record === null) {
    return false;
  }

  const optionalFields: Partial<Record<keyof BaseRecord, string>> = {
    id: "number",
    createdAt: "date",
    updatedAt: "date",
  };
  return hasOptionalFields(record, optionalFields);
}

export function isJob(job: unknown): job is Job {
  if (!isBaseRecord(job)) {
    return false;
  }

  const requiredFields: Partial<Record<keyof Job, string>> = {
    name: "string",
    jobId: "string",
    url: "string",
    details: "object",
    source: "string",
  };
  if (!hasRequiredFields(job, requiredFields)) {
    return false;
  }

  const optionalFields: Partial<Record<keyof Job, string>> = {
    failCount: "number",
  };
  return hasOptionalFields(job, optionalFields);
}

export function isRawJob(job: unknown): job is RawJob {
  return isJob(job);
}

export function isCleanJob(job: unknown): job is CleanJob {
  if (!isRawJob(job)) {
    return false;
  }

  const optionalFields: Partial<Record<keyof CleanJob, string>> = {
    workArrangement: "string",
    compensation: "string",
    company: "string",
    location: "string",
    role: "string",
    publishedDate: "date",
    yearsOfExperienceRequired: "string",
    hardSkillsRequired: "string",
    jobDescription: "string",
  };
  return hasOptionalFields(job, optionalFields);
}

export function isEnhancedJob(job: unknown): job is EnhancedJob {
  if (!isCleanJob(job)) {
    return false;
  }

  const requiredFields: Partial<Record<keyof EnhancedJob, string>> = {
    uploadedToSheet: "boolean",
  };
  if (!hasRequiredFields(job, requiredFields)) {
    return false;
  }

  const optionalFields: Partial<Record<keyof EnhancedJob, string>> = {
    relevanceScore: "number",
    relevanceReason: "string",
    recommendation: "string",
  };
  return hasOptionalFields(job, optionalFields);
}

export function isPrefill(prefill: unknown): prefill is Prefills {
  if (!isBaseRecord(prefill)) {
    return false;
  }

  const requiredFields: Partial<Record<keyof Prefills, string>> = {
    enhancedJobId: "string",
  };
  if (!hasRequiredFields(prefill, requiredFields)) {
    return false;
  }

  const optionalFields: Partial<Record<keyof Prefills, string>> = {
    coverLetter: "string",
  };
  return hasOptionalFields(prefill, optionalFields);
}
