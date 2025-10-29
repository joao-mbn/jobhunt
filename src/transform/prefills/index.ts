import type { AIClient } from "../../ai/types.ts";
import { ais } from "../../ai/utils.ts";
import type { Database } from "../../db/database.ts";
import { db } from "../../db/database.ts";
import type { PrefillsResultFailure, PrefillsResultSuccess } from "../types.ts";
import {
  createPrefillsResultFailure,
  createPrefillsResultSuccess,
} from "../utils.ts";
import { generatePrefillsWithAI } from "./ai.ts";
import {
  insertNewPrefills,
  queryEnhancedJobsWithoutPrefills,
  updateFailedPrefills,
} from "./db.ts";

export async function main(aiClients: AIClient[] = ais, _db: Database = db) {
  try {
    console.log("Starting prefills generation process...");

    // Step 1: Get enhanced jobs without prefills
    const enhancedJobs = queryEnhancedJobsWithoutPrefills(_db);
    console.log(
      `Found ${enhancedJobs.length} enhanced jobs without prefills to process`,
    );

    if (enhancedJobs.length === 0) {
      console.log(
        "No enhanced jobs found that need prefills. Process completed.",
      );
      return;
    }

    // Step 2: Generate prefills for the enhanced jobs
    const promises = enhancedJobs.map(async (enhancedJob) => {
      if (
        !enhancedJob.jobDescription &&
        !(
          enhancedJob.hardSkillsRequired &&
          enhancedJob.yearsOfExperienceRequired
        )
      ) {
        return createPrefillsResultFailure(enhancedJob.jobId);
      }

      try {
        const prefillsInfo = await generatePrefillsWithAI(
          enhancedJob,
          aiClients,
        );
        const prefills = { enhancedJobId: enhancedJob.jobId, ...prefillsInfo };
        return createPrefillsResultSuccess(prefills);
      } catch (error) {
        console.error(
          `Failed to generate prefills for enhanced job ${enhancedJob.jobId}:`,
          error,
        );
        return createPrefillsResultFailure(enhancedJob.jobId);
      }
    });
    const prefillsResults = await Promise.all(promises);

    const successfulResults = prefillsResults.filter(
      (result): result is PrefillsResultSuccess => result.success,
    );
    const failedResults = prefillsResults.filter(
      (result): result is PrefillsResultFailure => !result.success,
    );
    console.log(
      `Prefills generation completed: ${successfulResults.length} successful, ${failedResults.length} failed`,
    );

    await _db.withTransaction(async () => {
      // Step 3: Update the fail_count for the failed jobs
      if (failedResults.length > 0) {
        console.log(
          `Updating fail_count for ${failedResults.length} failed enhanced jobs...`,
        );
        updateFailedPrefills(
          _db,
          failedResults.map((result) => result.enhancedJobId),
        );
      }

      // Step 4: Insert the successful prefills
      if (successfulResults.length > 0) {
        console.log(`Inserting ${successfulResults.length} new prefills...`);
        insertNewPrefills(_db, successfulResults);
      }

      console.log("Prefills generation process completed successfully");
    });
  } catch (error) {
    console.error("Failed to generate prefills:", error);
    process.exitCode = 1;
  } finally {
    _db.disconnect();
  }
}

if (import.meta.main) {
  main();
}
