import { fromDateStringSafely, toDateStringSafely } from "../../utils/date.ts";
import type { GSheetRow } from "../definitions/gsheet.ts";
import type { EnhancedJobWithPrefills } from "../definitions/job.ts";

type keyofEnhancedJobWithPrefills = keyof EnhancedJobWithPrefills;

export const GSHEET_JOB_MAPPER: {
  gsheetColumn: string;
  gsheetIndex: number;
  jobField: keyofEnhancedJobWithPrefills;
  convertToJobFunction?: (value: string) => EnhancedJobWithPrefills[keyofEnhancedJobWithPrefills];
  convertToGsheetFunction?: (value: EnhancedJobWithPrefills[keyofEnhancedJobWithPrefills]) => string;
}[] = [
  {
    gsheetColumn: "Date",
    gsheetIndex: 0,
    jobField: "createdAt",
    convertToJobFunction: fromDateStringSafely,
    convertToGsheetFunction: toDateStringSafely,
  },
  {
    gsheetColumn: "Published Date",
    gsheetIndex: 1,
    jobField: "publishedDate",
    convertToJobFunction: fromDateStringSafely,
    convertToGsheetFunction: toDateStringSafely,
  },
  { gsheetColumn: "Job ID", gsheetIndex: 2, jobField: "jobId" },
  { gsheetColumn: "URL", gsheetIndex: 3, jobField: "url" },
  { gsheetColumn: "Title", gsheetIndex: 4, jobField: "name" },
  { gsheetColumn: "Company", gsheetIndex: 5, jobField: "company" },
  { gsheetColumn: "Location", gsheetIndex: 6, jobField: "location" },
  {
    gsheetColumn: "Work Arrangement",
    gsheetIndex: 7,
    jobField: "workArrangement",
  },
  { gsheetColumn: "Role", gsheetIndex: 8, jobField: "role" },
  { gsheetColumn: "Estimated Compensation", gsheetIndex: 9, jobField: "compensation" },
  { gsheetColumn: "Content", gsheetIndex: 10, jobField: "jobDescription" },
  { gsheetColumn: "Years of Experience Required", gsheetIndex: 11, jobField: "yearsOfExperienceRequired" },
  { gsheetColumn: "Hard Skills Required", gsheetIndex: 12, jobField: "hardSkillsRequired" },
  {
    gsheetColumn: "Relevance Score",
    gsheetIndex: 13,
    jobField: "relevanceScore",
    convertToJobFunction: (value: string) => Number(value),
    convertToGsheetFunction: (value: number) => String(value),
  },
  { gsheetColumn: "Relevance Reason", gsheetIndex: 14, jobField: "relevanceReason" },
  { gsheetColumn: "Recommendation", gsheetIndex: 15, jobField: "recommendation" },
  { gsheetColumn: "Cover Letter", gsheetIndex: 16, jobField: "coverLetter" },
];

export function enhancedJobWithPrefillsToGsheetRow(job: EnhancedJobWithPrefills): GSheetRow {
  return GSHEET_JOB_MAPPER.map((mapper) => {
    const { jobField, convertToGsheetFunction } = mapper;
    return convertToGsheetFunction?.(job[jobField]) ?? String(job[jobField]);
  });
}

export function gsheetRowToEnhancedJobWithPrefills(row: GSheetRow): EnhancedJobWithPrefills {
  return row.reduce((acc, curr, i) => {
    const map = GSHEET_JOB_MAPPER.find((mapper) => mapper.gsheetIndex === i);
    if (!map) {
      return acc;
    }
    const { jobField, convertToJobFunction } = map;
    (acc as unknown as Record<string, unknown>)[jobField] = convertToJobFunction?.(curr) ?? curr;
    return acc;
  }, {} as EnhancedJobWithPrefills);
}
