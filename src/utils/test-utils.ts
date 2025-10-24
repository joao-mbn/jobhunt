import type {
  CleanJob,
  EnhancedJob,
  RawJob,
} from "../types/definitions/job.ts";
import type {
  BuiltInData,
  IndeedData,
  LevelsData,
  LinkedInData,
} from "../types/definitions/source.ts";

/**
 * Generates RawJob objects for testing
 * @param count - Number of jobs to generate
 * @param source - Source for the jobs (default: "linkedin")
 * @returns Array of RawJob objects
 */
export function generateRawJobs(
  count: number,
  source: "linkedin" | "levels" | "builtin" | "indeed" = "linkedin",
): RawJob[] {
  const jobs: RawJob[] = [];

  for (let i = 0; i < count; i++) {
    let details: Record<string, unknown>;
    if (source === "builtin") {
      details = {
        title: `Test Job ${i + 1}`,
        company: `Test Company ${i + 1}`,
        location: "Remote",
        workArrengement: "Remote",
        seniorityLevel: "Mid-Level",
        datePublished: "2025-01-01",
        description: `This is a test job description for job ${i + 1}`,
        topSkills: "Test Top Skills",
      } satisfies BuiltInData;
    } else if (source === "linkedin") {
      details = {
        id: `linkedin-${i + 1}`,
        title: `Test Job ${i + 1}`,
        url: `https://example.com/job${i + 1}`,
        content_text: `This is a test job description for job ${i + 1}`,
        date_published: "2025-01-01",
        content_html: "<p>This is a test job description for job ${i + 1}</p>",
      } satisfies LinkedInData["items"][number];
    } else if (source === "levels") {
      details = {
        title: `Test Job ${i + 1}`,
        headerDetails: "Test Header Details",
        description: `This is a test job description for job ${i + 1}`,
        applyUrl: "https://example.com/apply",
        compensation: "Test Compensation",
      } satisfies LevelsData;
    } else if (source === "indeed") {
      details = {
        title: `Test Job ${i + 1}`,
        company: `Test Company ${i + 1}`,
        insights: {
          "Test Insight": "Test Insight Value",
        },
        description: `This is a test job description for job ${i + 1}`,
        workArrangement: "Remote",
        compensation: "Test Compensation",
        jobType: "Full-Time",
        location: "Remote",
      } satisfies IndeedData;
    }

    jobs.push({
      name: `Test Job ${i + 1}`,
      jobId: `${source}-${i + 1}`,
      url: `https://example.com/job${i + 1}`,
      source,
      details,
    });
  }

  return jobs;
}

/**
 * Generates CleanJob objects for testing
 * @param count - Number of jobs to generate
 * @param source - Source for the jobs (default: "linkedin")
 * @returns Array of CleanJob objects
 */
export function generateCleanJobs(
  count: number,
  source: "linkedin" | "levels" | "builtin" | "indeed" = "linkedin",
): CleanJob[] {
  const rawJobs = generateRawJobs(count, source);

  return rawJobs.map((rawJob) => ({
    ...rawJob,
    workArrangement: "Remote" as const,
    compensation: "$100k - $150k",
    company: `Test Company ${rawJob.jobId.split("-")[1]}`,
    location: "Remote",
    role: "Software Engineer",
    publishedDate: new Date("2025-01-01"),
    yearsOfExperienceRequired: "3-5 years",
    hardSkillsRequired: "TypeScript, Node.js, React",
    jobDescription: `This is a test job description for job ${rawJob.jobId.split("-")[1]}`,
  }));
}

/**
 * Generates EnhancedJob objects for testing
 * @param count - Number of jobs to generate
 * @param source - Source for the jobs (default: "linkedin")
 * @param uploadedToSheet - Whether jobs should be marked as uploaded to sheet (default: false)
 * @returns Array of EnhancedJob objects
 */
export function generateEnhancedJobs(
  count: number,
  source: "linkedin" | "levels" | "builtin" | "indeed" = "linkedin",
  uploadedToSheet: boolean = false,
): EnhancedJob[] {
  const cleanJobs = generateCleanJobs(count, source);

  return cleanJobs.map((cleanJob, index) => {
    // Generate realistic relevance scores (0-100)
    const relevanceScore = Math.floor(Math.random() * 101);

    // Generate recommendations based on relevance score
    let recommendation: "Apply" | "Consider" | "Skip";
    if (relevanceScore >= 80) {
      recommendation = "Apply";
    } else if (relevanceScore >= 50) {
      recommendation = "Consider";
    } else {
      recommendation = "Skip";
    }

    // Generate relevance reasons based on score
    const relevanceReasons = [
      "Strong match with required skills and experience",
      "Good company culture and growth opportunities",
      "Remote work arrangement aligns with preferences",
      "Compensation range meets expectations",
      "Role responsibilities match career goals",
      "Company is in a growing industry",
      "Limited growth opportunities in this role",
      "Skills mismatch with current experience",
      "Compensation below market rate",
      "Location requirements don't align",
    ];

    const relevanceReason = relevanceReasons[index % relevanceReasons.length];

    return {
      ...cleanJob,
      relevanceScore,
      relevanceReason,
      recommendation,
      uploadedToSheet,
    };
  });
}
