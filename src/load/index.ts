import { db } from "../db/database.ts";
import { enhancedJobWithPrefillsToGsheetRow } from "../types/converters/job-to-gsheet.ts";
import { markJobsAsUploaded, queryEnhancedJobsWithPrefills } from "./db.ts";
import { getExistingJobIds, uploadToGoogleSheet } from "./gsheet.ts";

export async function main(): Promise<void> {
  try {
    console.log("🚀 Starting load process...");

    // Step 1: Get new jobs with prefills
    const newJobsWithPrefills = queryEnhancedJobsWithPrefills();
    if (newJobsWithPrefills.length === 0) {
      console.log("📝 No jobs with prefills found to upload");
      return;
    }

    // Step 2: Get existing job IDs from Google Sheets to avoid duplicates
    const existingJobIds = await getExistingJobIds();

    // Step 3: Filter out jobs that are already uploaded
    const newJobsToUpload = newJobsWithPrefills.filter((job) => !existingJobIds.has(job.jobId));
    if (newJobsToUpload.length === 0) {
      console.log("📝 All jobs are already uploaded to Google Sheets");
      return;
    }

    // Step 4: Convert to JobItem format for upload
    const jobsForUpload = newJobsToUpload.map(enhancedJobWithPrefillsToGsheetRow);

    // Step 5: Upload to Google Sheets
    await uploadToGoogleSheet(jobsForUpload);
    console.log(`✅ Successfully loaded ${newJobsToUpload.length} jobs to Google Sheets`);

    // Step 6: Mark jobs as uploaded to prevent duplicates
    const jobIds = newJobsToUpload.map((job) => job.jobId);
    markJobsAsUploaded(jobIds);
    console.log(`✅ Successfully marked ${jobIds.length} jobs as uploaded`);
  } catch (error) {
    process.exitCode = 1;
    console.error("❌ Error in load process:", error);
  } finally {
    db.disconnect();
  }
}

if (import.meta.main) {
  main();
}
