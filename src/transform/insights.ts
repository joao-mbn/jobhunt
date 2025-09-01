import { attemptPromptSequentially } from "../ai/ai-client.ts";
import { gemini2_0FlashLiteAIClient, gemini2_5FlashLiteAIClient, gemini2_5ProAIClient } from "../ai/gemini.ts";
import { localAIClient } from "../ai/local-ai.ts";
import type { JobAnalysisResult, JobItem, ResumeData } from "../types/types.ts";

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

function generatePrompt(job: JobItem, resume: ResumeData): string {
  return RELEVANCE_PROMPT.replace("{resume}", JSON.stringify(resume, null, 2))
    .replace("{jobTitle}", job.title)
    .replace("{jobDescription}", job.content_text.substring(0, 10000));
}

export async function analyzeJobsBatch(jobs: JobItem[], resume: ResumeData): Promise<JobItem[]> {
  console.log(`Starting analysis of ${jobs.length} jobs...`);

  const ais = [gemini2_5ProAIClient, gemini2_5FlashLiteAIClient, gemini2_0FlashLiteAIClient, localAIClient];
  const promises = jobs.map(async (job): Promise<JobItem | null> => {
    const prompt = generatePrompt(job, resume);
    try {
      const { response } = await attemptPromptSequentially(ais, {
        prompt,
        key: job.id,
        options: { asJson: true, validateJson: isJobAnalysisResult },
      });
      return {
        ...job,
        ...(response as JobAnalysisResult),
        relevanceScore: (response as JobAnalysisResult).score,
        relevanceReason: (response as JobAnalysisResult).reason,
        hardSkillsRequired: (response as JobAnalysisResult).hardSkillsRequired.join(", "),
        yearsOfExperienceRequired: (response as JobAnalysisResult).yearsOfExperienceRequired,
        recommendation: (response as JobAnalysisResult).recommendation,
        estimatedCompensation: (response as JobAnalysisResult).estimatedCompensation,
      };
    } catch {
      return {
        ...job,
        relevanceScore: 0,
        relevanceReason: "Analysis failed",
        estimatedCompensation: "Unknown",
        yearsOfExperienceRequired: "0",
        recommendation: "Skip",
      };
    }
  });

  const analyzedJobs = (await Promise.all(promises))
    .filter((job) => job !== null)
    .toSorted((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  console.log(`Completed analysis of ${analyzedJobs.length} jobs`);
  return analyzedJobs;
}

function isJobAnalysisResult(response: unknown): response is JobAnalysisResult {
  if (typeof response !== "object" || response === null) {
    return false;
  }

  const requiredFields = ["yearsOfExperienceRequired", "reason", "recommendation", "estimatedCompensation", "hardSkillsRequired"];
  for (const field of requiredFields) {
    if (!(field in response)) {
      return false;
    }
  }

  return "score" in response && !isNaN((response as JobAnalysisResult).score);
}
