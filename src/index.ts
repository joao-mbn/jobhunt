import { analyzeJobsBatch } from "./gemini";
import { uploadToGoogleSheet } from "./gsheet";
import { loadResumeData } from "./resume";
import { fetchRSSFeed, saveJobsWithRelevance } from "./rss";

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
    const filename = `linkedinJobs-${today}-analyzedon`;
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
    const shouldUploadToSheets =
      process.env.GOOGLE_SPREADSHEET_ID &&
      process.env.GOOGLE_CLIENT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY;

    if (shouldUploadToSheets) {
      console.log("📊 Uploading to Google Sheets...");
      await uploadToGoogleSheet(jobsData, {
        spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
        sheetName: process.env.GOOGLE_SHEET_NAME || "Job Data",
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL!,
          private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
        },
      });
      console.log("✅ Uploaded to Google Sheets\n");
    } else {
      console.log(
        "⚠️  Google Sheets upload skipped (missing environment variables)\n"
      );
    }

    console.log("🎉 Job hunt automation completed successfully!");

    // Summary statistics
    const highRelevanceJobs = analyzedJobs.filter(
      (job) => (job.relevanceScore || 0) >= 80
    );
    const mediumRelevanceJobs = analyzedJobs.filter(
      (job) => (job.relevanceScore || 0) >= 60 && (job.relevanceScore || 0) < 80
    );

    console.log(`\n📈 Summary:`);
    console.log(`   Total jobs analyzed: ${analyzedJobs.length}`);
    console.log(`   High relevance (80+): ${highRelevanceJobs.length}`);
    console.log(`   Medium relevance (60-79): ${mediumRelevanceJobs.length}`);
    console.log(
      `   Average relevance score: ${(analyzedJobs.reduce((sum, job) => sum + (job.relevanceScore || 0), 0) / analyzedJobs.length).toFixed(1)}`
    );
  } catch (error) {
    console.error("❌ Error in job hunt automation:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  main();
}

export { main };
