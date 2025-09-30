import type { RawJob } from "../../types/definitions/job.ts";
import type { IndeedData } from "../../types/definitions/source.ts";
import { extractInfoWithAI } from "./ai.ts";
import type { Cleaner, CleanResult } from "./types.ts";

export class IndeedCleaner implements Cleaner {
  async clean(rawJobs: RawJob[]): Promise<CleanResult[]> {
    const promises = rawJobs.map(async (rawJob) => {
      const jobDetails = rawJob.details as unknown as IndeedData;

      const jobDescription = [
        jobDetails.title,
        jobDetails.company,
        jobDetails.location,
        jobDetails.workArrangement,
        jobDetails.compensation,
        jobDetails.jobType,
        jobDetails.description,
        ...Object.entries(jobDetails.insights).map(([key, value]) => `${key}: ${value}`),
      ]
        .filter(Boolean)
        .join("\n\n");

      if (!jobDescription) {
        return { success: false, jobId: rawJob.jobId, job: null };
      }

      try {
        const extractedInfo = await extractInfoWithAI(jobDescription, rawJob.jobId);
        return {
          success: true,
          jobId: rawJob.jobId,
          job: {
            ...rawJob,
            ...extractedInfo,
            jobDescription,
            workArrangement: extractedInfo.workArrangement || jobDetails.workArrangement || "Not specified",
            compensation: extractedInfo.compensation || jobDetails.compensation || "Not specified",
            company: extractedInfo.company || jobDetails.company || "Not specified",
            location: extractedInfo.location || jobDetails.location || "Not specified",
            role: extractedInfo.role || jobDetails.title || "Not specified",
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

export const indeedCleaner = new IndeedCleaner();
