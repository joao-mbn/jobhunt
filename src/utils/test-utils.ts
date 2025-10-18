import type { CleanJob, RawJob } from "../types/definitions/job.ts";

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
    jobs.push({
      name: `Test Job ${i + 1}`,
      jobId: `${source}-${i + 1}`,
      url: `https://example.com/job${i + 1}`,
      details: {
        company: `Test Company ${i + 1}`,
        location: "Remote",
        description: `This is a test job description for job ${i + 1}`,
      },
      source,
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
