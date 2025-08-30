import "jsr:@std/dotenv/load";
import process from "node:process";
import { saveJobs } from "./integration/file-system.ts";
import { fetchLevelsFYIJobs } from "./scraper/levels-fyi.ts";

async function main() {
  try {
    console.log("🚀 Starting levels.fyi scraper...\n");

    // Step 1: Fetch jobs from levels.fyi
    console.log("📡 Fetching jobs from levels.fyi...");
    const jobs = await fetchLevelsFYIJobs();

    if (jobs.length === 0) {
      console.log("❌ No jobs found from levels.fyi");
      return;
    }

    console.log(`✅ Successfully fetched ${jobs.length} jobs from levels.fyi\n`);

    // Step 2: Display job summary
    console.log("📊 Job Summary:");
    jobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title} at ${job.company}`);
      console.log(`   Location: ${job.location}`);
      console.log(`   Compensation: ${job.estimatedCompensation}`);
      console.log(`   Experience: ${job.yearsOfExperienceRequired}`);
      console.log(`   URL: ${job.url}`);
      console.log("");
    });

    // Step 3: Save jobs to file system
    console.log("💾 Saving jobs to file system...");
    saveJobs(jobs);
    console.log("✅ Jobs saved successfully\n");

    console.log("🎉 Levels.fyi scraper completed successfully!");
  } catch (error) {
    console.error("❌ Error in levels.fyi scraper:", error);
    process.exit(1);
  }
}

// Run the scraper
if (import.meta.main) {
  main();
}
