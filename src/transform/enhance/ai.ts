import { ais, attemptPromptSequentially } from "../../ai/utils.ts";
import { getResume } from "../../file-system/resume.ts";
import type { CleanJob } from "../../types/definitions/job.ts";
import { hasOptionalFields } from "../../types/validators/has-fields.ts";
import type { AIGeneratedEnhancedJobInfo } from "./types.ts";

const JOB_ENHANCEMENT_PROMPT = `
You are an expert job analyst and career advisor. Analyze the job posting below against the candidate's complete resume to provide insights on job fit and relevance.

## CANDIDATE'S COMPLETE RESUME:
{{resumeData}}

## JOB POSTING:
**Company**: {{company}}
**Role**: {{role}}
**Location**: {{location}}
**Work Arrangement**: {{workArrangement}}
**Compensation**: {{compensation}}
**Years of Experience Required**: {{yearsOfExperienceRequired}}
**Hard Skills Required**: {{hardSkillsRequired}}
**Job Description**: {{jobDescription}}

## ANALYSIS TASK:
Based on the job information and the candidate's complete resume, provide:

1. **Relevance Score**: Rate how relevant this job is for THIS candidate on a scale of 0-100, where:
  - 90-100: Perfect match for the candidate, highly recommended
  - 80-89: Very good match, strongly recommended
  - 70-79: Good match, recommended
  - 60-69: Moderate match, consider applying
  - 50-59: Some alignment, low priority
  - 40-49: Limited match, not recommended
  - 0-39: Poor match, skip

2. **Relevance Reason**: Explain your scoring in 2-3 sentences, considering:
  - How well the candidate's skills match the job requirements
  - Experience level alignment (overqualified/underqualified/just right)
  - Location compatibility with candidate's preferences
  - Work arrangement alignment with candidate's preferences
  - Career growth potential for this specific candidate
  - Any skill gaps or advantages the candidate has
  - The score must take into account any preferences stated in the resume (location preferences, work preferences, career goals, etc.)

3. **Recommendation**: Choose one of:
  - "Apply": High confidence this is a great opportunity for this candidate
  - "Consider": Worth applying but with some reservations
  - "Skip": Not recommended for this candidate

## OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "relevanceScore": <number 0-100>,
  "relevanceReason": "<detailed explanation>",
  "recommendation": "<Apply|Consider|Skip>"
}

## ANALYSIS GUIDELINES:
- Evaluate the job specifically for THIS candidate, not generically
- Consider skill gaps and how they might be addressed
- Factor in the candidate's career trajectory and goals
- Be objective but personalized to the candidate's profile
- Consider both immediate fit and long-term growth potential
- Be conservative with high scores (90-100) - reserve for exceptional matches
- Pay attention to location preferences, work arrangement preferences, and career goals from the resume
`;

export async function enhanceJobWithAI(job: CleanJob): Promise<AIGeneratedEnhancedJobInfo> {
  const resume = getResume();

  const prompt = JOB_ENHANCEMENT_PROMPT.replace(
    "{{resumeData}}",
    resume ? JSON.stringify(resume, null, 2) : "Not specified"
  )
    .replace("{{company}}", job.company || "Not specified")
    .replace("{{role}}", job.role || "Not specified")
    .replace("{{location}}", job.location || "Not specified")
    .replace("{{workArrangement}}", job.workArrangement || "Not specified")
    .replace("{{compensation}}", job.compensation || "Not specified")
    .replace("{{yearsOfExperienceRequired}}", job.yearsOfExperienceRequired || "Not specified")
    .replace("{{hardSkillsRequired}}", job.hardSkillsRequired || "Not specified")
    .replace("{{jobDescription}}", job.jobDescription || "Not specified");

  try {
    const { response } = (await attemptPromptSequentially(ais, {
      prompt,
      key: job.jobId,
      options: { asJson: true, validateJson: isAIEnhancedJobInfo },
    })) as { response: AIGeneratedEnhancedJobInfo };

    return response;
  } catch (error) {
    console.error(`Failed to enhance job ${job.jobId} with AI:`, error);
    // Return default values if AI enhancement fails
    return {
      relevanceScore: 0,
      relevanceReason: "AI analysis failed",
      recommendation: "Skip",
    };
  }
}

function isAIEnhancedJobInfo(response: unknown): response is AIGeneratedEnhancedJobInfo {
  if (typeof response !== "object" || response === null) {
    return false;
  }

  const optionalFields: Partial<Record<keyof AIGeneratedEnhancedJobInfo, string>> = {
    relevanceScore: "number",
    relevanceReason: "string",
    recommendation: "string",
  };

  return hasOptionalFields(response, optionalFields);
}
