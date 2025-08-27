import { GoogleGenAI } from "@google/genai";
import {
  createGenAIClient,
  generateContent,
  getJsonFromResponse,
  processWithRateLimit,
} from "../integration/gemini.ts";
import { JobItem, ResumeData, TailoredResume } from "../types.ts";
import { MIN_RELEVANCE_SCORE } from "../utils/constants.ts";
import { formatTailoredResume } from "../utils/format.ts";

const RESUME_PROMPT = `
You are an expert resume writer and career coach. Your task is to tailor a candidate's resume for a specific job posting by highlighting relevant experience and achievements.

## CANDIDATE'S CURRENT RESUME:
{resume}

## JOB POSTING:
Title: {jobTitle}
Company: {company}
Description: {jobDescription}

## TASK:
Create a tailored resume that:
1. Emphasizes experience and achievements most relevant to this specific role
2. Uses keywords and language from the job description
3. Highlights transferable skills and accomplishments
4. Maintains authenticity while positioning the candidate as an ideal fit

## OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "tailoredExperience": [
    {
      "company": "<company name>",
      "position": "<position title>",
      "duration": "<duration>",
      "tailoredAchievements": ["<achievement1>", "<achievement2>", "<achievement3>"],
      "relevantTechnologies": ["<tech1>", "<tech2>", "<tech3>"]
    }
  ],
  "tailoredProjects": [
    {
      "title": "<project title>",
      "description": "<project description>",
      "duration": "<duration>",
      "tailoredAchievements": ["<achievement1>", "<achievement2>", "<achievement3>"],
      "relevantTechnologies": ["<tech1>", "<tech2>", "<tech3>"]
    }
  ],
}

## GUIDELINES:
- Focus on achievements that demonstrate the skills and experience the job requires
- Use action verbs and quantifiable results
- Include relevant technologies and tools mentioned in the job posting
- Emphasize leadership, problem-solving, and impact
- Keep achievements concise but impactful
- Prioritize recent and most relevant experience
`;

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
- End with a strong call to action
- Keep it concise and impactful
`;

async function generateTailoredResume(
  job: JobItem,
  resume: ResumeData,
  ai: GoogleGenAI,
): Promise<string> {
  try {
    const prompt = RESUME_PROMPT.replace(
      "{resume}",
      JSON.stringify(resume, null, 2),
    )
      .replace("{jobTitle}", job.title)
      .replace("{company}", job?.company || "")
      .replace("{jobDescription}", job.content_text.substring(0, 2000));

    const response = await generateContent(ai, prompt);
    const tailoredResume = getJsonFromResponse(response) as TailoredResume;

    if (
      !Array.isArray(tailoredResume.tailoredExperience) ||
      !Array.isArray(tailoredResume.tailoredProjects)
    ) {
      throw new Error("Invalid response structure");
    }

    return formatTailoredResume(tailoredResume);
  } catch (error) {
    console.error(`Error generating tailored resume for job ${job.id}:`, error);
    return "";
  }
}

async function generateCoverLetter(
  job: JobItem,
  resume: ResumeData,
  ai: GoogleGenAI,
): Promise<string> {
  try {
    const prompt = COVER_LETTER_PROMPT.replace(
      "{resume}",
      JSON.stringify(resume, null, 2),
    )
      .replace("{jobTitle}", job.title)
      .replace("{company}", job?.company || "")
      .replace("{jobDescription}", job.content_text.substring(0, 2000));

    const response = await generateContent(ai, prompt);
    const coverLetter = getJsonFromResponse(response) as { content: string };

    if (typeof coverLetter.content !== "string") {
      throw new Error("Invalid response structure from Gemini");
    }

    return coverLetter.content;
  } catch (error) {
    console.error(`Error generating cover letter for job ${job.id}:`, error);
    return "";
  }
}

async function processApplication(
  job: JobItem,
  { ai, resume }: { ai: GoogleGenAI; resume: ResumeData },
): Promise<JobItem> {
  if (job.relevanceScore && job.relevanceScore < MIN_RELEVANCE_SCORE) {
    return { ...job, tailoredResume: "", coverLetter: "" };
  }

  try {
    const [tailoredResume, coverLetter] = await Promise.all([
      generateTailoredResume(job, resume, ai),
      generateCoverLetter(job, resume, ai),
    ]);

    return { ...job, tailoredResume, coverLetter };
  } catch (error) {
    console.error(`Failed to generate application materials for job ${job.id}:`, error);
    return { ...job, tailoredResume: "", coverLetter: "" };
  }
}

export async function generateApplicationMaterials(
  jobs: JobItem[],
  resume: ResumeData,
): Promise<JobItem[]> {
  const ai = createGenAIClient();
  return await processWithRateLimit(jobs, processApplication, { ai, resume });
}
