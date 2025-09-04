import type { CleanJob } from "../../types/definitions/job.ts";
import { enhanceJobWithAI } from "./ai.ts";
import type { Enhancer, EnhanceResult } from "./types.ts";

export class LinkedInEnhancer implements Enhancer {
  async enhance(cleanJobs: CleanJob[]): Promise<EnhanceResult[]> {
    const promises = cleanJobs.map(async (cleanJob) => {
      if (!cleanJob.jobDescription && !(cleanJob.hardSkillsRequired && cleanJob.yearsOfExperienceRequired)) {
        return { success: false, jobId: cleanJob.jobId, job: null };
      }

      try {
        const enhancedInfo = await enhanceJobWithAI(cleanJob);

        const enhancedJob = { ...cleanJob, ...enhancedInfo, uploadedToSheet: false };

        return { success: true, jobId: cleanJob.jobId, job: enhancedJob };
      } catch (error) {
        console.error(`Failed to enhance LinkedIn job ${cleanJob.jobId}:`, error);
        return { success: false, jobId: cleanJob.jobId, job: null };
      }
    });

    return Promise.all(promises) as Promise<EnhanceResult[]>;
  }
}

// Export singleton instance
export const linkedInEnhancer = new LinkedInEnhancer();
