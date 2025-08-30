import "jsr:@std/dotenv/load";
import process from "node:process";
import { generateCoverLetter } from "./business/application.ts";
import { analyzeJobsBatch } from "./business/insights.ts";
import { loadResumeData, saveJobs } from "./integration/file-system.ts";
import { filterNewJobs, uploadToGoogleSheet } from "./integration/gsheet.ts";
import { fetchRSSFeed } from "./integration/rss.ts";
import { MIN_RELEVANCE_SCORE } from "./utils/constants.ts";

export async function main() {
  try {
    console.log("🚀 Starting job hunt automation...\n");

    // Step 1: Fetch RSS feed and get jobs in memory
    console.log("📡 Fetching RSS feed...");
    const jobsData = await fetchRSSFeed();
    console.log(`✅ Fetched ${jobsData.length} jobs\n`);

    // Step 2: Check for new jobs in Google Sheets (early filtering)
    console.log("🔍 Checking for new jobs...");
    let newJobsData = await filterNewJobs(jobsData);
    if (newJobsData.length === 0) {
      console.log("🎉 No new jobs found! All jobs already exist in the sheet.");
      console.log("✅ Job hunt automation completed successfully!");
      return;
    }
    console.log(`📝 Found ${newJobsData.length} new jobs to process\n`);

    // Step 3: Load resume data
    console.log("📄 Loading resume data...");
    const resumeData = loadResumeData();
    console.log("✅ Resume data loaded\n");

    // Step 4: Analyze job relevance
    console.log("🤖 Analyzing job relevance...");
    newJobsData = await analyzeJobsBatch(newJobsData, resumeData);

    // Step 5: Save jobs to file system
    saveJobs(newJobsData);
    console.log("✅ Jobs saved with relevance scores\n");

    // Step 6: Filter out jobs with low relevance scores
    newJobsData = newJobsData.filter((job) =>
      job.relevanceScore && job.relevanceScore >= MIN_RELEVANCE_SCORE
    );

    // Step 7: Generate application materials for high-scoring jobs
    console.log("📝 Generating application materials for high-scoring jobs...");
    newJobsData = await generateCoverLetter(newJobsData, resumeData);

    // Step 8: Upload jobs to Google Sheets
    console.log("📊 Uploading to Google Sheets...");
    await uploadToGoogleSheet(newJobsData);

    console.log("🎉 Job hunt automation completed successfully!");
  } catch (error) {
    console.error("❌ Error in job hunt automation:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
