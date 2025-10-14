import { Database, db } from "../db/database.ts";
import { insertRawJobs, queryJobIds } from "./db.ts";
import {
  BuiltInScraper,
  IndeedScraper,
  LevelsScraper,
  LinkedInScraper,
  type Scraper,
} from "./scrapers/index.ts";

export async function main(
  _db: Database = db,
  _scrapers: Scraper[] = createScrapers(),
) {
  try {
    // Step 1: Fetch jobs from scrapers
    console.log("📡 Fetching jobs from scrapers...");
    const extractedJobs = (
      await Promise.all(_scrapers.map((s) => s.fetchJobs()))
    ).flat();

    if (extractedJobs.length === 0) {
      console.log("❌ No jobs found");
      return;
    }
    console.log(`✅ Successfully fetched ${extractedJobs.length} jobs\n`);

    // Step 2: Filter out jobs that are already in the database
    console.log("🔍 Filtering out jobs that are already in the database...");
    const existingJobs = queryJobIds(_db);
    const newJobs = extractedJobs.filter(
      (job) => !existingJobs.some((j) => j.job_id === job.jobId),
    );
    if (newJobs.length === 0) {
      console.log("❌ No jobs to store");
      return;
    }
    console.log(`✅ Found ${newJobs.length} new jobs\n`);

    // Step 3: Store jobs in the database
    console.log("📤 Storing jobs in the database...");
    await _db.withTransaction(async () => {
      insertRawJobs(_db, newJobs);
    });
    console.log("🎉 Jobs stored in the database successfully!");
  } catch (error) {
    console.error("❌ Error in levels scraper:", error);
    process.exitCode = 1;
  } finally {
    _db.disconnect();
  }
}

export function createScrapers(): Scraper[] {
  return [
    new IndeedScraper(process.env.INDEED_ENDPOINT),
    new BuiltInScraper(process.env.BUILTIN_ENDPOINT),
    new LinkedInScraper(process.env.LINKEDIN_ENDPOINT),
    new LevelsScraper(process.env.LEVELS_ENDPOINT),
  ];
}

// Run the scraper
if (import.meta.main) {
  main();
}
