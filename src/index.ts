import "jsr:@std/dotenv/load";
import process from "node:process";
import { analyzeJobsBatch } from "./gemini.ts";
import { uploadToGoogleSheet } from "./gsheet.ts";
import { saveJobs } from "./jobs.ts";
import { loadResumeData } from "./resume.ts";
import { fetchRSSFeed } from "./rss.ts";

async function main() {
  try {
    console.log("🚀 Starting job hunt automation...\n");

    // Step 1: Fetch RSS feed and get jobs in memory
    console.log("📡 Fetching RSS feed...");
    const jobsData = await fetchRSSFeed();
    console.log(`✅ Fetched ${jobsData.items.length} jobs\n`);

    // Step 2: Load resume data
    console.log("📄 Loading resume data...");
    const resumeData = loadResumeData();
    console.log("✅ Resume data loaded\n");

    // Step 3: Analyze job relevance
    console.log("🔍 Analyzing job relevance...");
    const analyzedJobs = await analyzeJobsBatch(jobsData.items, resumeData);

    // Step 4: Update the jobs data with analyzed results
    jobsData.items = analyzedJobs;
    console.log("✅ Job analysis completed\n");

    // Step 5: Save jobs with relevance scores in the data folder
    saveJobs(jobsData);
    console.log("✅ Jobs saved with relevance scores\n");

    // Step 6: Upload to Google Sheets
    console.log("📊 Uploading to Google Sheets...");
    await uploadToGoogleSheet(jobsData);
    console.log("✅ Uploaded to Google Sheets\n");
  } catch (error) {
    console.error("❌ Error in job hunt automation:", error);
    process.exit(1);
  }
}

main();
