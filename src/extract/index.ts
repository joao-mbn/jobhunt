import { levelsScraper } from "./levels.ts";
import { linkedinScraper } from "./linked-in.ts";

async function main() {
  try {
    // Step 1: Fetch jobs from scrapers
    console.log("📡 Fetching jobs from scrapers...");
    const scrapers = [levelsScraper, linkedinScraper];
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
