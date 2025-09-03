import { db } from "../../db/database.ts";
import type { Job, RawJob } from "../../types/definitions/job.ts";
import { deleteCleanedRawJobs, insertNewCleanJobs, queryRawJobs, updateFailedCleaning } from "./db.ts";
import { levelsCleaner } from "./levels.ts";
import { linkedInCleaner } from "./linked-in.ts";
import type { CleanResult, CleanResultFailure, CleanResultSuccess } from "./types.ts";

async function main() {
  try {
    console.log("Starting data cleaning process...");

    // Step 1: Get the raw jobs
    const rawJobs = queryRawJobs();
    console.log(`Found ${rawJobs.length} valid raw jobs to process`);

    // Step 2: Clean the raw jobs
    const cleanResults = await cleanJobs(rawJobs);

    const successfulResults = cleanResults.filter((result): result is CleanResultSuccess => result.success);
    const failedResults = cleanResults.filter((result): result is CleanResultFailure => !result.success);
    console.log(`Cleaning completed: ${successfulResults.length} successful, ${failedResults.length} failed`);

    db.beginTransaction();

    // Step 3: Update the fail_count for the failed jobs
    if (failedResults.length > 0) {
      console.log(`Updating fail_count for ${failedResults.length} failed jobs...`);
      updateFailedCleaning(failedResults);
    }

    // Step 4: Insert the successful results and delete the raw jobs
    if (successfulResults.length > 0) {
      console.log(`Inserting ${successfulResults.length} new clean jobs...`);
      insertNewCleanJobs(successfulResults);

      console.log(`Deleting ${successfulResults.length} raw jobs...`);
      deleteCleanedRawJobs(successfulResults);
    }

    db.commitTransaction();
    console.log("Data cleaning process completed successfully");
  } catch (error) {
    console.error("Failed to clean data:", error);
    process.exitCode = 1;
  } finally {
    db.disconnect();
  }
}

async function cleanJobs(rawJobs: RawJob[]): Promise<CleanResult[]> {
  const jobsBySource = rawJobs.reduce((acc, job) => {
    if (!acc[job.source]) {
      acc[job.source] = [];
    }
    acc[job.source].push(job);
    return acc;
  }, {} as Record<Job["source"], RawJob[]>);

  const cleanResults = (
    await Promise.all(
      Object.entries(jobsBySource).map(([source, jobs]) => {
        switch (source) {
          case "linkedin":
            return linkedInCleaner.clean(jobs);
          case "levels":
            return levelsCleaner.clean(jobs);
          default:
            console.warn(`Unknown source: ${source}`);
            return Promise.resolve([]);
        }
      })
    )
  ).flat();
  return cleanResults;
}

if (import.meta.main) {
  main();
}
