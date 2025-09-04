import { ais, attemptPromptSequentially } from "../../ai/utils.ts";
import { hasOptionalFields } from "../../types/validators/has-fields.ts";
import { fromDateStringSafely } from "../../utils/date.ts";
import type { AIGeneratedCleanJobInfo } from "./types.ts";

const JOB_INFO_EXTRACTION_PROMPT = `
You are an expert job posting analyzer. Extract key information from the job description below and return it in a structured format.

## JOB DESCRIPTION:
{{jobDescription}}

## EXTRACTION TASK:
Extract the following information from the job description:

1. **Work Arrangement**: Determine if the job is "Remote", "Hybrid", or "On-Site"
2. **Compensation**: Extract salary/compensation information if mentioned. It can be a range or a single value, stated in currency and time unit, e.g. "100k-120k CAD/year" or "$100,000/year".
3. **Company**: Identify the company name
4. **Location**: Extract the job location (city, state, country). This information being partially state (like just city or just state) is acceptable.
5. **Role**: Identify the specific role/position title
6. **Published Date**: Extract the date when the job was posted
7. **Years of Experience Required**: Extract the required years of experience
8. **Hard Skills Required**: Extract technical skills, programming languages, frameworks, etc.

## OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "workArrangement": "<Remote|Hybrid|On-Site>",
  "compensation": "<compensation info or 'Not specified'>",
  "company": "<company name or 'Not specified'>",
  "location": "<location or 'Not specified'>",
  "role": "<role title or 'Not specified'>",
  "publishedDate": "<date in YYYY-MM-DD format or 'Not specified'>",
  "yearsOfExperienceRequired": "<number of years or 'Not specified'>",
  "hardSkillsRequired": "<comma-separated skills or 'Not specified'>"
}

## EXTRACTION GUIDELINES:
- If information is not clearly stated, use "Not specified"
- For work arrangement, look for keywords like "remote", "hybrid", "on-site", "in-office"
- For compensation, look for salary ranges, hourly rates, or compensation packages
- For location, prioritize the primary work location
- For skills, focus on technical skills, programming languages, and frameworks
- Be conservative - only extract information that is clearly stated
`;

export async function extractInfoWithAI(jobDescription: string, jobId: string): Promise<AIGeneratedCleanJobInfo> {
  const prompt = JOB_INFO_EXTRACTION_PROMPT.replace("{{jobDescription}}", jobDescription);

  try {
    const { response } = (await attemptPromptSequentially(ais, {
      prompt,
      key: jobId,
      options: { asJson: true, validateJson: isAIExtractedInfo },
    })) as { response: Omit<AIGeneratedCleanJobInfo, "publishedDate"> & { publishedDate?: string } };

    return {
      ...response,
      publishedDate: fromDateStringSafely(response.publishedDate),
    };
  } catch (error) {
    console.error(`Failed to extract job info for job ${jobId}:`, error);
    // Return default values if AI extraction fails
    return {};
  }
}

function isAIExtractedInfo(
  response: unknown
): response is Omit<AIGeneratedCleanJobInfo, "publishedDate"> & { publishedDate?: string } {
  if (typeof response !== "object" || response === null) {
    return false;
  }

  const optionalFields: Partial<Record<keyof AIGeneratedCleanJobInfo, string>> = {
    workArrangement: "string",
    compensation: "string",
    company: "string",
    location: "string",
    role: "string",
    publishedDate: "string",
    yearsOfExperienceRequired: "string",
    hardSkillsRequired: "string",
  };

  return hasOptionalFields(response, optionalFields);
}
