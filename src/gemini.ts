import { GoogleGenAI } from "@google/genai";
import { setTimeout } from "node:timers";
import type { JobAnalysisResult, JobItem, ResumeData } from "./types.ts";

const RELEVANCE_PROMPT = `
You are an expert job matching AI assistant. Your task is to analyze job postings and rate their relevance to a specific candidate based on their resume.

## CANDIDATE PROFILE:
{resume}

## JOB POSTING:
Title: {jobTitle}
Description: {jobDescription}

## EVALUATION CRITERIA:
Rate the job from 0-100 based on these factors:

1. **Technical Skills Match (40 points)**
   - Programming languages alignment
   - Framework/technology stack compatibility
   - Required vs. candidate's experience level

2. **Role Alignment (30 points)**
   - Position level (Junior/Mid/Senior) vs. candidate's experience
   - Industry/domain relevance
   - Responsibilities match candidate's strengths

3. **Experience Requirements (20 points)**
   - Years of experience alignment
   - Specific project/domain experience
   - Leadership/mentoring opportunities

4. **Growth Potential (10 points)**
   - Learning opportunities
   - Career advancement potential
   - Company size/industry growth

## OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "score": <number between 0-100>,
  "reason": "<2-3 sentence explanation of the rating>",
  "keyMatches": ["<skill1>", "<skill2>", "<skill3>"],
  "gaps": ["<missing skill1>", "<missing skill2>"],
  "recommendation": "<brief recommendation: 'Apply', 'Consider', or 'Skip'>"
}

## SCORING GUIDELINES:
- 90-100: Perfect match, highly recommended
- 80-89: Very good match, strongly recommended
- 70-79: Good match, recommended
- 60-69: Moderate match, consider applying
- 50-59: Some alignment, low priority
- 40-49: Limited match, not recommended
- 0-39: Poor match, skip

Focus on the candidate's 4+ years of full-stack development experience, TypeScript/React expertise, and proven track record of performance optimization and team leadership.
`;

// Initialize the Google GenAI client
function createGenAIClient(): GoogleGenAI {
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  return new GoogleGenAI({ apiKey: geminiApiKey });
}

// Analyze a single job's relevance
async function analyzeJobRelevance(
  job: JobItem,
  resume: ResumeData,
  ai: GoogleGenAI,
): Promise<JobAnalysisResult> {
  try {
    const prompt = RELEVANCE_PROMPT.replace(
      "{resume}",
      JSON.stringify(resume, null, 2),
    )
      .replace("{jobTitle}", job.title)
      .replace("{jobDescription}", job.content_text.substring(0, 2000)); // Limit description length

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text;

    // Extract JSON from response
    const jsonMatch = text?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON response from Gemini");
    }

    const analysis = JSON.parse(jsonMatch[0]) as JobAnalysisResult;

    // Validate the response structure
    if (
      typeof analysis.score !== "number" ||
      typeof analysis.reason !== "string" ||
      !Array.isArray(analysis.keyMatches) ||
      !Array.isArray(analysis.gaps) ||
      typeof analysis.recommendation !== "string"
    ) {
      throw new Error("Invalid response structure from Gemini");
    }

    return analysis;
  } catch (error) {
    console.error(`Error analyzing job ${job.id}:`, error);
    // Return a default low score if analysis fails
    return {
      score: 20,
      reason: "Analysis failed - default low score assigned",
      keyMatches: [],
      gaps: ["Analysis error"],
      recommendation: "Skip",
    };
  }
}

// Add relevance data to a job
function addRelevanceToJob(job: JobItem, analysis: JobAnalysisResult): JobItem {
  return {
    id: job.id,
    url: job.url,
    title: job.title,
    content_text: job.content_text,
    content_html: job.content_html,
    image: job.image,
    date_published: job.date_published,
    authors: job.authors,
    attachments: job.attachments,
    relevanceScore: analysis.score,
    relevanceReason: analysis.reason,
  };
}

// Process a single job with error handling
async function processJob(
  job: JobItem,
  resume: ResumeData,
  ai: GoogleGenAI,
  index: number,
  total: number,
): Promise<JobItem> {
  console.log(
    `Analyzing job ${index + 1}/${total}: ${job.title.substring(0, 50)}...`,
  );

  try {
    const analysis = await analyzeJobRelevance(job, resume, ai);
    return addRelevanceToJob(job, analysis);
  } catch (error) {
    console.error(`Failed to analyze job ${job.id}:`, error);
    // Return job with default low score
    return addRelevanceToJob(job, {
      score: 20,
      reason: "Analysis failed",
      keyMatches: [],
      gaps: ["Analysis error"],
      recommendation: "Skip",
    });
  }
}

// Add delay between requests to avoid rate limiting
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Analyze multiple jobs in batch
export async function analyzeJobsBatch(jobs: JobItem[], resume: ResumeData): Promise<JobItem[]> {
  console.log(`Starting analysis of ${jobs.length} jobs...`);

  const ai = createGenAIClient();
  const analyzedJobs: JobItem[] = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]!;
    const analyzedJob = await processJob(job, resume, ai, i, jobs.length);
    analyzedJobs.push(analyzedJob);

    // Add a small delay to avoid rate limiting (1 second)
    if (i < jobs.length - 1) {
      await delay(1000);
    }
  }

  // Sort jobs by relevance score (highest first)
  analyzedJobs.sort(
    (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0),
  );

  console.log(`Completed analysis of ${analyzedJobs.length} jobs`);
  return analyzedJobs;
}
