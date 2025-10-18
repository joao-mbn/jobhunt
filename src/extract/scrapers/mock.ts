import type { RawJob } from "../../types/definitions/job.ts";
import type { Scraper } from "./types.ts";

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
