import type { CleanJob, RawJob } from "../../types/definitions/job.ts";
import type { LinkedInData } from "../../types/definitions/source.ts";
import { extractInfoFromDescription } from "./ai.ts";
import type { Cleaner, CleanResult } from "./types.ts";

export class LinkedInCleaner implements Cleaner {
  async clean(rawJobs: RawJob[]): Promise<CleanResult[]> {
    const promises = rawJobs.map(async (rawJob) => {
      const jobDescription = (rawJob.details as LinkedInData["items"][0]).content_text;
      try {
        const extractedInfo = await extractInfoFromDescription(jobDescription, rawJob.jobId);
        return {
          success: true,
          jobId: rawJob.jobId,
          job: { ...rawJob, ...extractedInfo } satisfies CleanJob,
        };
      } catch (error) {
        console.error(`Failed to clean job ${rawJob.jobId}:`, error);
        return {
          success: false,
          jobId: rawJob.jobId,
          job: null,
        };
      }
    });

    return Promise.all(promises) as Promise<CleanResult[]>;
  }
}

// Export singleton instance
export const linkedInCleaner = new LinkedInCleaner();
