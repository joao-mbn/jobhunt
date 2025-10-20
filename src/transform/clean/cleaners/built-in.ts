import type { CleanJob, RawJob } from "../../types/definitions/job.ts";
import type { BuiltInData } from "../../types/definitions/source.ts";
import type { TransformResult } from "../types.ts";
import { createTransformResultSuccess } from "../utils.ts";
import { extractInfoWithAI } from "./ai.ts";
import type { Cleaner } from "./types.ts";

export class BuiltInCleaner implements Cleaner {
  async clean(rawJobs: RawJob[]): Promise<TransformResult<CleanJob>[]> {
    const promises = rawJobs.map(async (rawJob) => {
      const jobDetails = rawJob.details as unknown as BuiltInData;

      const jobDescription = [
        jobDetails.title,
        jobDetails.company,
        jobDetails.location,
        jobDetails.workArrengement,
        jobDetails.seniorityLevel,
        jobDetails.datePublished,
        jobDetails.description,
        jobDetails.topSkills,
      ]
        .filter(Boolean)
        .join("\n\n");

      if (!jobDescription) {
        return { success: false, jobId: rawJob.jobId, job: null };
      }

      try {
        const extractedInfo = await extractInfoWithAI(
          jobDescription,
          rawJob.jobId,
        );
        return createTransformResultSuccess({
          ...rawJob,
          ...extractedInfo,
          jobDescription,
          yearsOfExperienceRequired:
            !extractedInfo.yearsOfExperienceRequired ||
            extractedInfo.yearsOfExperienceRequired === "Not specified"
              ? jobDetails.seniorityLevel
              : extractedInfo.yearsOfExperienceRequired,
          hardSkillsRequired:
            !extractedInfo.hardSkillsRequired ||
            extractedInfo.hardSkillsRequired === "Not specified"
              ? jobDetails.topSkills
              : extractedInfo.hardSkillsRequired,
        });
      } catch (error) {
        console.error(`Failed to clean job ${rawJob.jobId}:`, error);
        return { success: false, jobId: rawJob.jobId, job: null };
      }
    });

    return Promise.all(promises) as Promise<TransformResult<CleanJob>[]>;
  }
}
