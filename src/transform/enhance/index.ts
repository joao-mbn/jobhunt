import { db } from "../../db/database.ts";
import { enhanceJobWithAI } from "./ai.ts";
import { deleteEnhancedCleanJobs, insertNewEnhancedJobs, queryCleanJobs, updateFailedEnhancement } from "./db.ts";
import type { EnhanceResult, EnhanceResultFailure, EnhanceResultSuccess } from "./types.ts";

export async function main() {
  try {
    console.log("Starting data enhancement process...");

    // Step 1: Get the clean jobs
    const cleanJobs = queryCleanJobs();
    console.log(`Found ${cleanJobs.length} valid clean jobs to process`);

    // Step 2: Enhance the clean jobs
    const promises = cleanJobs.map(async (cleanJob) => {
      if (!cleanJob.jobDescription && !(cleanJob.hardSkillsRequired && cleanJob.yearsOfExperienceRequired)) {
        return { success: false, jobId: cleanJob.jobId, job: null };
      }

      try {
        const enhancedInfo = await enhanceJobWithAI(cleanJob);
        const enhancedJob = { ...cleanJob, ...enhancedInfo, uploadedToSheet: false };
        return { success: true, jobId: cleanJob.jobId, job: enhancedJob };
      } catch (error) {
        console.error(`Failed to enhance job ${cleanJob.jobId}:`, error);
        return { success: false, jobId: cleanJob.jobId, job: null };
      }
    });
    const enhanceResults = (await Promise.all(promises)) as EnhanceResult[];

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
