import { GoogleGenAI } from "@google/genai";
import {
  createGenAIClient,
  generateContent,
  getJsonFromResponse,
  processWithRateLimit,
} from "../integration/gemini.ts";
import { JobAnalysisResult, JobItem, ResumeData } from "../types.ts";

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
  "hardSkillsRequired": ["<skill1>", "<skill2>", "<skill3>"],
  "yearsOfExperienceRequired": "<number of years>",
  "keyMatches": ["<skill1>", "<skill2>", "<skill3>"],
  "gaps": ["<missing skill1>", "<missing skill2>"],
  "recommendation": "<brief recommendation: 'Apply', 'Consider', or 'Skip'>",
  "estimatedCompensation": "<estimated compensation: value range, with currency/time unit e.g. '100k-120k CAD/year'>"
}

## SCORING GUIDELINES:
- 90-100: Perfect match, highly recommended
- 80-89: Very good match, strongly recommended
- 70-79: Good match, recommended
- 60-69: Moderate match, consider applying
- 50-59: Some alignment, low priority
- 40-49: Limited match, not recommended
- 0-39: Poor match, skip

Focus on the candidate's 4+ years of full-stack development experience, TypeScript/React expertise, Golang/SQL expertise and leadership experience. If the role does not accept candidates from Vancouver Metro Area, skip it and add this to the reason, if that's the case. the work arrengement can be hybrid or remote. If the role does not require a specific number of years of experience, set the yearsOfExperienceRequired to 0.
`;

// Analyze a single job's relevance
async function analyzeJobRelevance(
  job: JobItem,
  { resume, ai }: { resume: ResumeData; ai: GoogleGenAI },
): Promise<JobItem> {
  try {
    const prompt = RELEVANCE_PROMPT.replace(
      "{resume}",
      JSON.stringify(resume, null, 2),
    )
      .replace("{jobTitle}", job.title)
      .replace("{jobDescription}", job.content_text.substring(0, 10000)); // Limit description length

    const text = await generateContent(ai, prompt);
    const analysis = getJsonFromResponse(text) as JobAnalysisResult;

    // Validate the response structure
    if (
      isNaN(analysis.score) ||
      !analysis.yearsOfExperienceRequired ||
      typeof analysis.reason !== "string" ||
      typeof analysis.recommendation !== "string" ||
      typeof analysis.estimatedCompensation !== "string" ||
      !Array.isArray(analysis.hardSkillsRequired)
    ) {
      throw new Error("Invalid response structure from Gemini");
    }

    return {
      ...job,
      relevanceScore: analysis.score || 0,
      relevanceReason: analysis.reason || "Reason missing",
      recommendation: analysis.recommendation || "Skip",
      estimatedCompensation: analysis.estimatedCompensation || "Unknown",
      yearsOfExperienceRequired: analysis.yearsOfExperienceRequired || "0",
      hardSkillsRequired: analysis.hardSkillsRequired.join(", "),
    };
  } catch (error) {
    console.error(`Error analyzing job ${job.id}:`, error);
    return {
      ...job,
      relevanceScore: 0,
      relevanceReason: "Analysis failed",
      recommendation: "Skip",
      estimatedCompensation: "Unknown",
      yearsOfExperienceRequired: "0",
      hardSkillsRequired: "",
    };
  }
}

export async function analyzeJobsBatch(jobs: JobItem[], resume: ResumeData): Promise<JobItem[]> {
  console.log(`Starting analysis of ${jobs.length} jobs...`);

  const ai = createGenAIClient();
  const analyzedJobs = await processWithRateLimit(jobs, analyzeJobRelevance, { resume, ai });
  analyzedJobs.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  console.log(`Completed analysis of ${analyzedJobs.length} jobs`);
  return analyzedJobs;
}
