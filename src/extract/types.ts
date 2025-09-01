import type { RawJob } from "../types/definitions/job.ts";

export interface Scraper {
  fetchJobs: () => Promise<RawJob[]>;
}
