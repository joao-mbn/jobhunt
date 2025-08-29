import { AIClient, PromptRequest } from "../integration/ai/ai-client.ts";
import { GeminiAIClient } from "../integration/ai/gemini.ts";
import { LocalAIClient } from "../integration/ai/local-ai.ts";
import { JobItem, ResumeData } from "../types.ts";

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
  "wordCount": <number of words>
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

function generatePrompts(jobs: JobItem[], resume: ResumeData): PromptRequest[] {
  return jobs.map((job, index) => ({
    prompt: COVER_LETTER_PROMPT.replace("{resume}", JSON.stringify(resume, null, 2))
      .replace("{jobTitle}", job.title)
      .replace("{company}", job?.company || "")
      .replace("{jobDescription}", job.content_text.substring(0, 10000)),
    key: job.id,
    index,
  }));
}

export async function generateCoverLetter(
  jobs: JobItem[],
  resume: ResumeData,
): Promise<JobItem[]> {
  console.log(`🔍 Starting cover letter generation for ${jobs.length} jobs...`);

  const geminiAi = new GeminiAIClient();
  const localAi = new LocalAIClient();
  const prompts = generatePrompts(jobs, resume);
  const promises: Promise<JobItem>[] = [];

  for await (const { response, request } of geminiAi.streamContent(prompts)) {
    const job = jobs.find((job) => job.id === request.key);
    if (!job) {
      console.error(`Job ${request.key} not found`);
      continue;
    }

    promises.push(
      response.then((result) => getCoverLetterFromAi(geminiAi, result, job)).catch(
        async (error) => {
          console.error(
            `Error generating cover letter for job ${request.key} with Gemini: ${error}`,
          );

          try {
            const localResponse = await localAi.generateContent(request.prompt);
            return getCoverLetterFromAi(localAi, localResponse, job);
          } catch (error) {
            console.error(
              `Error generating cover letter for job ${request.key} with Local AI: ${error}`,
            );
            return { ...job, coverLetter: "" };
          }
        },
      ),
    );
  }

  const jobsWithCoverLetter = await Promise.all(promises);

  console.log(`✅ Completed cover letter generation`);
  return jobsWithCoverLetter;
}

function getCoverLetterFromAi(ai: AIClient, response: string, job: JobItem) {
  const localJson = ai.getJsonContent(response);
  const localCoverLetter = localJson as { content: string };
  if (!("content" in localCoverLetter) || typeof localCoverLetter.content !== "string") {
    throw new Error("Invalid cover letter response structure");
  }
  return {
    ...job,
    coverLetter: localCoverLetter.content,
  };
}
