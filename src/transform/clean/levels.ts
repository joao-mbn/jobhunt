import type { RawJob } from "../../types/definitions/job.ts";
import type { LevelsData } from "../../types/definitions/source.ts";
import { extractInfoWithAI } from "./ai.ts";
import type { Cleaner, CleanResult } from "./types.ts";

export class LevelsCleaner implements Cleaner {
  async clean(rawJobs: RawJob[]): Promise<CleanResult[]> {
    const promises = rawJobs.map(async (rawJob) => {
      const jobDetails = rawJob.details as unknown as LevelsData;

      const jobDescription = [
        jobDetails.title,
        jobDetails.headerDetails,
        jobDetails.compensation,
        jobDetails.description,
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
export const levelsCleaner = new LevelsCleaner();
