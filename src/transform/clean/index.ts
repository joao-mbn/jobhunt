import { db } from "../../db/database.ts";
import type { CleanJob } from "../../types/definitions/job.ts";
import type {
  TransformResultFailure,
  TransformResultSuccess,
} from "../types.ts";
import { transformBySource } from "../utils.ts";
import {
  builtInCleaner,
  indeedCleaner,
  levelsCleaner,
  linkedInCleaner,
} from "./cleaners/index.ts";
import {
  deleteCleanedRawJobs,
  insertNewCleanJobs,
  queryRawJobs,
  updateFailedCleaning,
} from "./db.ts";

export async function main() {
  try {
    console.log("Starting data cleaning process...");

    // Step 1: Get the raw jobs
    const rawJobs = queryRawJobs(db);
    console.log(`Found ${rawJobs.length} valid raw jobs to process`);

    // Step 2: Clean the raw jobs
    const cleanResults = await transformBySource(rawJobs, {
      linkedin: linkedInCleaner.clean,
      levels: levelsCleaner.clean,
      builtin: builtInCleaner.clean,
      indeed: indeedCleaner.clean,
    });

    const successfulResults = cleanResults.filter(
      (result): result is TransformResultSuccess<CleanJob> => result.success,
    );
    const failedResults = cleanResults.filter(
      (result): result is TransformResultFailure => !result.success,
    );
    console.log(
      `Cleaning completed: ${successfulResults.length} successful, ${failedResults.length} failed`,
    );

    await db.withTransaction(async () => {
      // Step 3: Update the fail_count for the failed jobs
      if (failedResults.length > 0) {
        console.log(
          `Updating fail_count for ${failedResults.length} failed jobs...`,
        );
        updateFailedCleaning(
          db,
          failedResults.map((result) => result.jobId),
        );
      }

      // Step 4: Insert the successful results and delete the raw jobs
      if (successfulResults.length > 0) {
        console.log(`Inserting ${successfulResults.length} new clean jobs...`);
        insertNewCleanJobs(db, successfulResults);

        console.log(`Deleting ${successfulResults.length} raw jobs...`);
        deleteCleanedRawJobs(
          db,
          successfulResults.map((result) => result.jobId),
        );
      }

      console.log("Data cleaning process completed successfully");
    });
  } catch (error) {
    console.error("Failed to clean data:", error);
    process.exitCode = 1;
  } finally {
    db.disconnect();
  }
}

if (import.meta.main) {
  main();
}
