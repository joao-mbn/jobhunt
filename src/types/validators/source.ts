import type {
  BuiltInData,
  IndeedData,
  LevelsData,
  LinkedInData,
} from "../definitions/source.ts";
import { hasRequiredFields } from "./has-fields.ts";

export function isLinkedInDataItem(
  item: unknown,
): item is LinkedInData["items"][number] {
  if (typeof item !== "object" || item === null) {
    return false;
  }

  const requiredFields = {
    id: "string",
    url: "string",
    title: "string",
    content_text: "string",
    content_html: "string",
    date_published: "string",
  };
  return hasRequiredFields(item, requiredFields);
}

export function isLevelsData(data: unknown): data is LevelsData {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const requiredFields: Partial<Record<keyof LevelsData, string>> = {
    title: "string",
    headerDetails: "string",
    description: "string",
    applyUrl: "string",
    compensation: "string",
  };
  return hasRequiredFields(data, requiredFields);
}

export function isBuiltInData(data: unknown): data is BuiltInData {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const requiredFields: Partial<Record<keyof BuiltInData, string>> = {
    title: "string",
    company: "string",
    location: "string",
    workArrengement: "string",
    seniorityLevel: "string",
    datePublished: "string",
    description: "string",
    topSkills: "string",
  };
  return hasRequiredFields(data, requiredFields);
}

export function isIndeedData(data: unknown): data is IndeedData {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const requiredFields: Partial<Record<keyof IndeedData, string>> = {
    title: "string",
    company: "string",
    insights: "object",
    description: "string",
    workArrangement: "string",
    compensation: "string",
    jobType: "string",
    location: "string",
  };
  if (!hasRequiredFields(data, requiredFields)) {
    return false;
  }

  // Validate insights object structure
  const insights = (data as IndeedData).insights;
  if (typeof insights !== "object" || insights === null) {
    return false;
  }

  return Object.values(insights).every((value) => typeof value === "string");
}
