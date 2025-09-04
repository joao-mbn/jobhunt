import { db } from "../../db/database.ts";
import { transformBySource } from "../utils.ts";
import { deleteEnhancedCleanJobs, insertNewEnhancedJobs, queryCleanJobs, updateFailedEnhancement } from "./db.ts";
import { linkedInEnhancer } from "./linked-in.ts";
import type { EnhanceResultFailure, EnhanceResultSuccess } from "./types.ts";

async function main() {
  try {
    console.log("Starting data enhancement process...");

    // Step 1: Get the clean jobs
    const cleanJobs = queryCleanJobs();
    console.log(`Found ${cleanJobs.length} valid clean jobs to process`);

    // Step 2: Enhance the clean jobs
    const enhanceResults = await transformBySource(cleanJobs, {
      linkedin: linkedInEnhancer.enhance,
      levels: undefined,
    });

    const successfulResults = enhanceResults.filter((result): result is EnhanceResultSuccess => result.success);
    const failedResults = enhanceResults.filter((result): result is EnhanceResultFailure => !result.success);
    console.log(`Enhancement completed: ${successfulResults.length} successful, ${failedResults.length} failed`);

    await db.withTransaction(async () => {
      // Step 3: Update the fail_count for the failed jobs
      if (failedResults.length > 0) {
        console.log(`Updating fail_count for ${failedResults.length} failed jobs...`);
        updateFailedEnhancement(failedResults);
      }

      // Step 4: Insert the successful results and delete the clean jobs
      if (successfulResults.length > 0) {
        console.log(`Inserting ${successfulResults.length} new enhanced jobs...`);
        insertNewEnhancedJobs(successfulResults);

        console.log(`Deleting ${successfulResults.length} clean jobs...`);
        deleteEnhancedCleanJobs(successfulResults);
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
