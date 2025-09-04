import type { CleanJob } from "../../types/definitions/job.ts";
import type { LinkedInData } from "../../types/definitions/source.ts";
import { enhanceJobWithAI } from "./ai.ts";
import type { Enhancer, EnhanceResult } from "./types.ts";

export class LinkedInEnhancer implements Enhancer {
  async enhance(cleanJobs: CleanJob[]): Promise<EnhanceResult[]> {
    const promises = cleanJobs.map(async (cleanJob) => {
      const jobDetails = cleanJob.details as LinkedInData["items"][0];
      const jobDescription = jobDetails.content_text;

      if (!jobDescription) {
        return { success: false, jobId: cleanJob.jobId, job: null };
      }

      try {
        // Extract job data for AI enhancement
        const jobData = {
          company: cleanJob.company,
          role: cleanJob.role,
          location: cleanJob.location,
          workArrangement: cleanJob.workArrangement,
          compensation: cleanJob.compensation,
          yearsOfExperienceRequired: cleanJob.yearsOfExperienceRequired,
          hardSkillsRequired: cleanJob.hardSkillsRequired,
          jobDescription: jobDescription,
        };

        // Enhance job with AI analysis
        const enhancedInfo = await enhanceJobWithAI(jobData, cleanJob.jobId);

        // Create enhanced job with all fields
        const enhancedJob = {
          ...cleanJob,
          ...enhancedInfo,
          uploadedToSheet: false, // Default to false, will be updated by load step
        };

        return {
          success: true,
          jobId: cleanJob.jobId,
          job: enhancedJob,
        };
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
