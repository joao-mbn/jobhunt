import { db } from "../../db/database.ts";
import { generatePrefillsWithAI } from "./ai.ts";
import { insertNewPrefills, queryEnhancedJobsWithoutPrefills, updateFailedPrefills } from "./db.ts";
import type { PrefillsResult, PrefillsResultFailure, PrefillsResultSuccess } from "./types.ts";

export async function main() {
  try {
    console.log("Starting prefills generation process...");

    // Step 1: Get enhanced jobs without prefills
    const enhancedJobs = queryEnhancedJobsWithoutPrefills();
    console.log(`Found ${enhancedJobs.length} enhanced jobs without prefills to process`);

    if (enhancedJobs.length === 0) {
      console.log("No enhanced jobs found that need prefills. Process completed.");
      return;
    }

    // Step 2: Generate prefills for the enhanced jobs
    const promises = enhancedJobs.map(async (enhancedJob) => {
      if (!enhancedJob.jobDescription && !(enhancedJob.hardSkillsRequired && enhancedJob.yearsOfExperienceRequired)) {
        return { success: false, jobId: enhancedJob.jobId, job: null };
      }

      try {
        const prefillsInfo = await generatePrefillsWithAI(enhancedJob);
        const prefills = { enhancedJobId: enhancedJob.jobId, ...prefillsInfo };
        return { success: true, enhancedJobId: enhancedJob.jobId, prefills };
      } catch (error) {
        console.error(`Failed to generate prefills for enhanced job ${enhancedJob.jobId}:`, error);
        return { success: false, enhancedJobId: enhancedJob.jobId, prefills: null };
      }
    });
    const prefillsResults = (await Promise.all(promises)) as PrefillsResult[];

    const successfulResults = prefillsResults.filter((result): result is PrefillsResultSuccess => result.success);
    const failedResults = prefillsResults.filter((result): result is PrefillsResultFailure => !result.success);
    console.log(
      `Prefills generation completed: ${successfulResults.length} successful, ${failedResults.length} failed`
    );

    await db.withTransaction(async () => {
      // Step 3: Update the fail_count for the failed jobs
      if (failedResults.length > 0) {
        console.log(`Updating fail_count for ${failedResults.length} failed enhanced jobs...`);
        updateFailedPrefills(failedResults);
      }

      // Step 4: Insert the successful prefills
      if (successfulResults.length > 0) {
        console.log(`Inserting ${successfulResults.length} new prefills...`);
        insertNewPrefills(successfulResults);
      }

      console.log("Prefills generation process completed successfully");
    });
  } catch (error) {
    console.error("Failed to generate prefills:", error);
    process.exitCode = 1;
  } finally {
    db.disconnect();
  }
}

if (import.meta.main) {
  main();
}
