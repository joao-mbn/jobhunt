import type { AIClient } from "../../../ai/types.ts";
import type { CleanJob, RawJob } from "../../../types/definitions/job.ts";
import { isLinkedInDataItem } from "../../../types/validators/source.ts";
import { fromDateStringSafely } from "../../../utils/date.ts";
import type { TransformResult } from "../../types.ts";
import {
  createTransformResultFailure,
  createTransformResultSuccess,
} from "../../utils.ts";
import { extractInfoWithAI } from "../ai.ts";
import type { Cleaner } from "./types.ts";

export class LinkedInCleaner implements Cleaner {
  private aiClients: AIClient[];

  constructor(aiClients: AIClient[]) {
    this.aiClients = aiClients;
  }

  async clean(rawJobs: RawJob[]): Promise<TransformResult<CleanJob>[]> {
    const promises = rawJobs.map(async (rawJob) => {
      const jobDetails = rawJob.details;
      if (!isLinkedInDataItem(jobDetails)) {
        return createTransformResultFailure(rawJob);
      }

      const jobDescription = jobDetails.content_text;
      if (!jobDescription) {
        return createTransformResultFailure(rawJob);
      }

      try {
        const extractedInfo = await extractInfoWithAI(
          jobDescription,
          rawJob.jobId,
          this.aiClients,
        );
        const publishedDate = fromDateStringSafely(jobDetails.date_published);
        return createTransformResultSuccess({
          ...rawJob,
          ...extractedInfo,
          publishedDate,
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
