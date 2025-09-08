import { gemini2_0FlashLiteAIClient, gemini2_5FlashLiteAIClient, gemini2_5ProAIClient } from "../../ai/gemini.ts";
import { localAIClient } from "../../ai/local-ai.ts";
import { attemptPromptSequentially } from "../../ai/utils.ts";
import type { JobItem, ResumeData } from "../../types/definitions/types.ts";

const COVER_LETTER_PROMPT = `
You are an expert cover letter writer. Your task is to create a compelling, personalized cover letter for a specific job application.

## CANDIDATE'S RESUME:
{resume}

## JOB POSTING:
Title: {jobTitle}
Company: {company}
Description: {jobDescription}

## REQUIREMENTS:
Create a cover letter that:
1. Does NOT exceed 300 words
2. Has exactly 3 paragraphs:
   - Paragraph 1: Why you're interested in this role/company
   - Paragraph 2: What you can bring to the company (specific value)
   - Paragraph 3: Why you'd be a great cultural fit and team member
3. Uses the company's language and tone from the job description
4. Avoids repeating information already in the resume
5. Shows genuine enthusiasm and understanding of the role
6. Uses simple language, for possible non-native English readers

## OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "content": "<full cover letter text with proper paragraphs>",
}

## GUIDELINES:
- Be specific about why this role/company appeals to you
- Connect your experience to their needs without repeating resume details
- Show you understand their culture and values
- Use confident but humble language
- End with a call to action
- Keep it concise
- Avoid business jargon
`;

function generatePrompt(job: JobItem, resume: ResumeData): string {
  return COVER_LETTER_PROMPT.replace("{resume}", JSON.stringify(resume, null, 2))
    .replace("{jobTitle}", job.title)
    .replace("{company}", job?.company || "")
    .replace("{jobDescription}", job.content_text.substring(0, 10000));
}

export async function generateCoverLetter(jobs: JobItem[], resume: ResumeData): Promise<JobItem[]> {
  console.log(`🔍 Starting cover letter generation for ${jobs.length} jobs...`);

  const ais = [gemini2_5ProAIClient, gemini2_5FlashLiteAIClient, gemini2_0FlashLiteAIClient, localAIClient];
  const promises = jobs.map(async (job) => {
    const prompt = generatePrompt(job, resume);
    try {
      const { response } = await attemptPromptSequentially(ais, {
        prompt,
        key: job.id,
        options: { asJson: true, validateJson: isCoverLetterResponse },
      });
      return { ...job, coverLetter: (response as { content: string }).content };
    } catch {
      return { ...job, coverLetter: "" };
    }
  });

  const jobsWithCoverLetter = await Promise.all(promises);

  console.log(`✅ Completed cover letter generation`);
  return jobsWithCoverLetter;
}

function isCoverLetterResponse(response: unknown): response is { content: string } {
  return (
    response != null &&
    typeof response === "object" &&
    "content" in response &&
    typeof (response as { content: string }).content === "string"
  );
}
