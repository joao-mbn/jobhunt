import type { AIClient } from "../../ai/types.ts";
import { ais } from "../../ai/utils.ts";
import { db } from "../../db/database.ts";
import type { EnhancedJob } from "../../types/definitions/job.ts";
import type {
  TransformResult,
  TransformResultFailure,
  TransformResultSuccess,
} from "../types.ts";
import {
  createTransformResultFailure,
  createTransformResultSuccess,
} from "../utils.ts";
import { enhanceJobWithAI } from "./ai.ts";
import {
  deleteEnhancedCleanJobs,
  insertNewEnhancedJobs,
  queryCleanJobs,
  updateFailedEnhancement,
} from "./db.ts";

export async function main(aiClients: AIClient[] = ais) {
  try {
    console.log("Starting data enhancement process...");

    // Step 1: Get the clean jobs
    const cleanJobs = queryCleanJobs(db);
    console.log(`Found ${cleanJobs.length} valid clean jobs to process`);

    // Step 2: Enhance the clean jobs
    const promises = cleanJobs.map(async (cleanJob) => {
      if (
        !cleanJob.jobDescription &&
        !(cleanJob.hardSkillsRequired && cleanJob.yearsOfExperienceRequired)
      ) {
        return createTransformResultFailure(cleanJob);
      }

      try {
        const enhancedInfo = await enhanceJobWithAI(cleanJob, aiClients);
        const enhancedJob = {
          ...cleanJob,
          ...enhancedInfo,
          uploadedToSheet: false,
        };
        return createTransformResultSuccess(enhancedJob);
      } catch (error) {
        console.error(`Failed to enhance job ${cleanJob.jobId}:`, error);
        return createTransformResultFailure(cleanJob);
      }
    });
    const enhanceResults = (await Promise.all(
      promises,
    )) as TransformResult<EnhancedJob>[];

    const successfulResults = enhanceResults.filter(
      (result): result is TransformResultSuccess<EnhancedJob> => result.success,
    );
    const failedResults = enhanceResults.filter(
      (result): result is TransformResultFailure => !result.success,
    );
    console.log(
      `Enhancement completed: ${successfulResults.length} successful, ${failedResults.length} failed`,
    );

    await db.withTransaction(async () => {
      // Step 3: Update the fail_count for the failed jobs
      if (failedResults.length > 0) {
        console.log(
          `Updating fail_count for ${failedResults.length} failed jobs...`,
        );
        updateFailedEnhancement(db, failedResults);
      }

      // Step 4: Insert the successful results and delete the clean jobs
      if (successfulResults.length > 0) {
        console.log(
          `Inserting ${successfulResults.length} new enhanced jobs...`,
        );
        insertNewEnhancedJobs(db, successfulResults);

        console.log(`Deleting ${successfulResults.length} clean jobs...`);
        deleteEnhancedCleanJobs(db, successfulResults);
      }

      console.log("Data enhancement process completed successfully");
    });
  } catch (error) {
    console.error("Failed to enhance data:", error);
    process.exitCode = 1;
  } finally {
    db.disconnect();
  }
}

if (import.meta.main) {
  main();
}
