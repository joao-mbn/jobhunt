import type { CleanJob, RawJob } from "../../../types/definitions/job.ts";
import type { LevelsData } from "../../../types/definitions/source.ts";
import type { TransformResult } from "../../types.ts";
import {
  createTransformResultFailure,
  createTransformResultSuccess,
} from "../../utils.ts";
import { extractInfoWithAI } from "../ai.ts";
import type { Cleaner } from "./types.ts";

export class LevelsCleaner implements Cleaner {
  async clean(rawJobs: RawJob[]): Promise<TransformResult<CleanJob>[]> {
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
        return createTransformResultFailure(rawJob);
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
        });
      } catch (error) {
        console.error(`Failed to clean job ${rawJob.jobId}:`, error);
        return createTransformResultFailure(rawJob);
      }
    });

    return Promise.all(promises) as Promise<TransformResult<CleanJob>[]>;
  }
}
