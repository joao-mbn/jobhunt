import "jsr:@std/dotenv/load";
import process from "node:process";
import { analyzeJobsBatch } from "./gemini.ts";
import { uploadToGoogleSheet } from "./gsheet.ts";
import { loadResumeData } from "./resume.ts";
import { fetchRSSFeed, saveJobsWithRelevance } from "./rss.ts";

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

    // Update the jobs data with analyzed results
    jobsData.items = analyzedJobs;
    console.log("✅ Job analysis completed\n");

    // Step 4: Save jobs with relevance scores
    const today = new Date().toISOString().split("T")[0];
    const filename = `linkedinJobs-${today}-analyzed.json`;
    saveJobsWithRelevance(jobsData, filename);
    console.log("✅ Jobs saved with relevance scores\n");

    // Step 5: Display top jobs
    console.log("🏆 Top 10 Most Relevant Jobs:");
    const topJobs = analyzedJobs.slice(0, 10);
    topJobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title}`);
      console.log(`   Score: ${job.relevanceScore}/100`);
      console.log(`   Reason: ${job.relevanceReason}`);
      console.log(`   URL: ${job.url}\n`);
    });

    // Step 6: Upload to Google Sheets (if configured)
    const isSheetsOnEnv = Deno.env.get("GOOGLE_SPREADSHEET_ID") &&
      Deno.env.get("GOOGLE_CLIENT_EMAIL") &&
      Deno.env.get("GOOGLE_PRIVATE_KEY");

    if (isSheetsOnEnv) {
      console.log("📊 Uploading to Google Sheets...");
      await uploadToGoogleSheet(jobsData, {
        spreadsheetId: Deno.env.get("GOOGLE_SPREADSHEET_ID")!,
        sheetName: Deno.env.get("GOOGLE_SHEET_NAME") || "Job Data",
        credentials: {
          client_email: Deno.env.get("GOOGLE_CLIENT_EMAIL")!,
          private_key: Deno.env.get("GOOGLE_PRIVATE_KEY")!.replace(/\\n/g, "\n"),
        },
      });
      console.log("✅ Uploaded to Google Sheets\n");
    } else {
      console.log("⚠️  Google Sheets upload skipped (missing environment variables)\n");
    }

    console.log("🎉 Job hunt automation completed successfully!");
  } catch (error) {
    console.error("❌ Error in job hunt automation:", error);
    process.exit(1);
  }
}

main();
