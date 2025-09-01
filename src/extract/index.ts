import { db } from "../db/database.ts";
import { levelsScraper } from "./levels.ts";
import { linkedinScraper } from "./linked-in.ts";

async function main() {
  try {
    // Step 1: Fetch jobs from scrapers
    console.log("📡 Fetching jobs from scrapers...");
    const scrapers = [levelsScraper, linkedinScraper];
    const extractedJobs = (await Promise.all(scrapers.map((s) => s.fetchJobs()))).flat();

    if (extractedJobs.length === 0) {
      console.log("❌ No jobs found");
      return;
    }
    console.log(`✅ Successfully fetched ${extractedJobs.length} jobs\n`);

    // Step 2: Filter out jobs that are already in the database
    console.log("🔍 Filtering out jobs that are already in the database...");
    const existingJobs = db.query(`
      SELECT job_id FROM raw_jobs
      UNION
      SELECT job_id FROM clean_jobs
      UNION
      SELECT job_id FROM enhanced_jobs;
    `);
    const newJobs = extractedJobs.filter((job) => !existingJobs.some((j) => j.job_id === job.jobId));
    if (newJobs.length === 0) {
      console.log("❌ No jobs to store");
      return;
    }
    console.log(`✅ Found ${newJobs.length} new jobs\n`);

    // Step 3: Store jobs in the database
    console.log("📤 Storing jobs in the database...");
    db.insert(
      "raw_jobs",
      ["name", "job_id", "details", "source"],
      newJobs.map((job) => [job.name, job.jobId, JSON.stringify(job.details), job.source])
    );

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
