import type { CleanJob, RawJob } from "../../../types/definitions/job.ts";
import { generateCleanJobs } from "../../../utils/test-utils.ts";
import type { TransformResult } from "../../types.ts";
import {
  createTransformResultFailure,
  createTransformResultSuccess,
} from "../../utils.ts";
import type { Cleaner } from "./types.ts";

export class SuccessCleaner implements Cleaner {
  async clean(rawJobs: RawJob[]): Promise<TransformResult<CleanJob>[]> {
    if (rawJobs.length === 0) {
      return [];
    }

    const cleanJobs = generateCleanJobs(rawJobs.length, rawJobs[0].source);

    const updatedCleanJobs = cleanJobs.map((cleanJob, index) => {
      const rawJob = rawJobs[index];
      return { ...cleanJob, ...rawJob };
    });

    return updatedCleanJobs.map(createTransformResultSuccess);
  }
}

export class FailureCleaner implements Cleaner {
  async clean(rawJobs: RawJob[]): Promise<TransformResult<CleanJob>[]> {
    return rawJobs.map(createTransformResultFailure);
  }
}

export class MixedResultsCleaner implements Cleaner {
  async clean(rawJobs: RawJob[]): Promise<TransformResult<CleanJob>[]> {
    const cleanJobs = generateCleanJobs(
      rawJobs.length,
      rawJobs[0] ? rawJobs[0].source : "linkedin",
    );

    const updatedCleanJobs = cleanJobs.map((cleanJob, index) => {
      const rawJob = rawJobs[index];
      return { ...cleanJob, ...rawJob };
    });

    const successCount = Math.floor(rawJobs.length / 2);

    return updatedCleanJobs.map((cleanJob, index) =>
      index < successCount
        ? createTransformResultSuccess(cleanJob)
        : createTransformResultFailure(cleanJob),
    );
  }
}

export class ErrorThrowingCleaner implements Cleaner {
  async clean(rawJobs: RawJob[]): Promise<TransformResult<CleanJob>[]> {
    console.log(`ErrorThrowingCleaner received ${rawJobs.length} jobs`);
    throw new Error("Cleaner failure");
  }
}
