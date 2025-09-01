import type { RawJob } from "../types/job.ts";

export interface Scraper {
  fetchJobs: () => Promise<RawJob[]>;
}
