import type { AIClient } from "../../../ai/types.ts";
import type { CleanJob, RawJob } from "../../../types/definitions/job.ts";
import { isBuiltInData } from "../../../types/validators/source.ts";
import type { TransformResult } from "../../types.ts";
import {
  createTransformResultFailure,
  createTransformResultSuccess,
} from "../../utils.ts";
import { extractInfoWithAI } from "../ai.ts";
import type { Cleaner } from "./types.ts";

export class BuiltInCleaner implements Cleaner {
  private aiClients: AIClient[];

  constructor(aiClients: AIClient[]) {
    this.aiClients = aiClients;
  }

  async clean(rawJobs: RawJob[]): Promise<TransformResult<CleanJob>[]> {
    const promises = rawJobs.map(async (rawJob) => {
      const jobDetails = rawJob.details;
      if (!isBuiltInData(jobDetails)) {
        return createTransformResultFailure(rawJob);
      }

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
        return createTransformResultFailure(rawJob);
      }

      try {
        const extractedInfo = await extractInfoWithAI(
          jobDescription,
          rawJob.jobId,
          this.aiClients,
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
        return createTransformResultFailure(rawJob);
      }
    });

    return Promise.all(promises) as Promise<TransformResult<CleanJob>[]>;
  }
}
