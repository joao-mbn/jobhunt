import type { RawJob } from "../../types/definitions/job.ts";
import type { LinkedInData } from "../../types/definitions/source.ts";
import { fromDateStringSafely } from "../../utils/date.ts";
import { extractInfoWithAI } from "./ai.ts";
import type { Cleaner, CleanResult } from "./types.ts";

export class LinkedInCleaner implements Cleaner {
  async clean(rawJobs: RawJob[]): Promise<CleanResult[]> {
    const promises = rawJobs.map(async (rawJob) => {
      const jobDetails = rawJob.details as LinkedInData["items"][0];
      const jobDescription = jobDetails.content_text;
      if (!jobDescription) {
        return { success: false, jobId: rawJob.jobId, job: null };
      }

      try {
        const extractedInfo = await extractInfoWithAI(jobDescription, rawJob.jobId);
        const publishedDate = fromDateStringSafely(jobDetails.date_published);
        return {
          success: true,
          jobId: rawJob.jobId,
          job: {
            ...rawJob,
            ...extractedInfo,
            publishedDate: publishedDate ?? extractedInfo.publishedDate,
            jobDescription,
          },
        };
      } catch (error) {
        console.error(`Failed to clean job ${rawJob.jobId}:`, error);
        return { success: false, jobId: rawJob.jobId, job: null };
      }
    });

    return Promise.all(promises) as Promise<CleanResult[]>;
  }
}

// Export singleton instance
export const linkedInCleaner = new LinkedInCleaner();
