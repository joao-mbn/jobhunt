import { ais, attemptPromptSequentially } from "../../ai/utils.ts";
import { getResume } from "../../file-system/resume.ts";
import type { EnhancedJob } from "../../types/definitions/job.ts";
import { hasOptionalFields } from "../../types/validators/has-fields.ts";
import type { AIGeneratedPrefillsInfo } from "./types.ts";

const COVER_LETTER_PROMPT = `
You are an expert cover letter writer. Generate a compelling, personalized cover letter for the candidate based on their resume and the specific job posting.

## CANDIDATE'S COMPLETE RESUME:
{{resumeData}}

## JOB POSTING DETAILS:
**Company**: {{company}}
**Role**: {{role}}
**Years of Experience Required**: {{yearsOfExperienceRequired}}
**Hard Skills Required**: {{hardSkillsRequired}}
**Job Description**: {{jobDescription}}

## JOB ANALYSIS:
**Relevance Score**: {{relevanceScore}}/100
**Relevance Reason**: {{relevanceReason}}

## COVER LETTER REQUIREMENTS:
Write a professional, engaging cover letter that:

1. **Opening**: Starts showing interest in the role and company
2. **Body Paragraphs**:
   - Highlight 1-2 most relevant experiences from the candidate's background
   - Connect specific achievements to the job requirements, but don't repeat the resume
   - Show understanding of the company/role and how the candidate can contribute
   - Address any potential gaps or concerns mentioned in the relevance analysis positively
3. **Closing**: Ends reaffirming the good match and with a call to action
4. **Tone**: Professional but personable
5. **Length**: 3 paragraphs, not more than 300 words
6. **Personalization**: Make it specific to this role and company, not generic

## WRITING GUIDELINES:
- Use the candidate's actual experience and achievements from their resume
- Reference specific skills mentioned in the job requirements
- Show knowledge of the company/industry when possible
- Use active voice and strong action verbs
- Don't use clichés, generic phrases, business jargon
- Write it using simple language, as if written by a non-native English speaker and to be read by a non-native English speakers
- Ensure it complements rather than repeats the resume

## OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "coverLetter": "<complete cover letter text>"
}

## QUALITY STANDARDS:
- The cover letter should be ready to send with minimal editing
- It should feel authentic and personal to the candidate
- It should demonstrate clear value proposition for this specific role
`;

export async function generatePrefillsWithAI(enhancedJob: EnhancedJob): Promise<AIGeneratedPrefillsInfo> {
  const resume = getResume();

  const prompt = COVER_LETTER_PROMPT.replace(
    "{{resumeData}}",
    resume ? JSON.stringify(resume, null, 2) : "Not specified"
  )
    .replace("{{company}}", enhancedJob.company || "Not specified")
    .replace("{{role}}", enhancedJob.role || "Not specified")
    .replace("{{yearsOfExperienceRequired}}", enhancedJob.yearsOfExperienceRequired || "Not specified")
    .replace("{{hardSkillsRequired}}", enhancedJob.hardSkillsRequired || "Not specified")
    .replace("{{jobDescription}}", enhancedJob.jobDescription || "Not specified")
    .replace("{{relevanceScore}}", enhancedJob.relevanceScore?.toString() || "0")
    .replace("{{relevanceReason}}", enhancedJob.relevanceReason || "Not specified");

  try {
    const { response } = (await attemptPromptSequentially(ais, {
      prompt,
      key: enhancedJob.jobId,
      options: { asJson: true, validateJson: isAIPrefillsInfo },
    })) as { response: AIGeneratedPrefillsInfo };

    return response;
  } catch (error) {
    console.error(`Failed to generate prefills for job ${enhancedJob.jobId} with AI:`, error);
    // Return default values if AI generation fails
    return {
      coverLetter: "AI cover letter generation failed. Please write a custom cover letter for this position.",
    };
  }
}

function isAIPrefillsInfo(response: unknown): response is AIGeneratedPrefillsInfo {
  if (typeof response !== "object" || response === null) {
    return false;
  }

  const optionalFields: Partial<Record<keyof AIGeneratedPrefillsInfo, string>> = {
    coverLetter: "string",
  };

  return hasOptionalFields(response, optionalFields);
}
