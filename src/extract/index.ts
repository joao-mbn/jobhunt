import { scrapers } from "./scraper.ts";

async function main() {
  try {

    // Step 1: Fetch jobs from scrapers
    console.log("📡 Fetching jobs from scrapers...");
    const jobs = (await Promise.all(scrapers.map((scraper) => scraper.fetchJobs()))).flat();

    if (jobs.length === 0) {
      console.log("❌ No jobs found from levels");
      return;
    }

    console.log(`✅ Successfully fetched ${jobs.length} jobs from levels\n`);

    console.log("🎉 Levels scraper completed successfully!");
  } catch (error) {
    console.error("❌ Error in levels scraper:", error);
    process.exit(1);
  }
}

// Run the scraper
if (import.meta.main) {
  main();
}
