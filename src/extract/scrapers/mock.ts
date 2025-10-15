import type { RawJob } from "../../types/definitions/job.ts";
import type { Scraper } from "./types.ts";

/**
 * Generates RawJob objects for testing
 * @param count - Number of jobs to generate
 * @param source - Source for the jobs (default: "linkedin")
 * @returns Array of RawJob objects
 */
export function generateJobs(
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

export class HappyScraper implements Scraper {
  jobs: RawJob[];

  constructor(jobs: RawJob[] = []) {
    this.jobs = jobs;
  }

  async fetchJobs(): Promise<RawJob[]> {
    return this.jobs;
  }
}

export class ErrorThrowingScraper implements Scraper {
  errorMessage: string;

  constructor(errorMessage: string = "Scraper failure") {
    this.errorMessage = errorMessage;
  }

  async fetchJobs(): Promise<RawJob[]> {
    throw new Error(this.errorMessage);
  }
}
