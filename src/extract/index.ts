import { db } from "../db/database.ts";
import { insertRawJobs, queryJobIds } from "./db.ts";
import { levelsScraper } from "./levels.ts";

export async function main() {
  try {
    // Step 1: Fetch jobs from scrapers
    console.log("📡 Fetching jobs from scrapers...");
    const scrapers = [levelsScraper];
    const extractedJobs = (await Promise.all(scrapers.map((s) => s.fetchJobs()))).flat();

    if (extractedJobs.length === 0) {
      console.log("❌ No jobs found");
      return;
    }
    console.log(`✅ Successfully fetched ${extractedJobs.length} jobs\n`);

    // Step 2: Filter out jobs that are already in the database
    console.log("🔍 Filtering out jobs that are already in the database...");
    const existingJobs = queryJobIds();
    const newJobs = extractedJobs.filter((job) => !existingJobs.some((j) => j.job_id === job.jobId));
    if (newJobs.length === 0) {
      console.log("❌ No jobs to store");
      return;
    }
    console.log(`✅ Found ${newJobs.length} new jobs\n`);

    // Step 3: Store jobs in the database
    console.log("📤 Storing jobs in the database...");
    await db.withTransaction(async () => {
      insertRawJobs(newJobs);
    });
    console.log("🎉 Jobs stored in the database successfully!");
  } catch (error) {
    console.error("❌ Error in levels scraper:", error);
    process.exitCode = 1;
  } finally {
    db.disconnect();
  }
}

// Run the scraper
if (import.meta.main) {
  main();
}
