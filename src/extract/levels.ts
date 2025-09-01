import { chromium, type Browser, type Page } from "@playwright/test";
import { retryWithBackoff } from "../utils/promise.ts";
import type { RawSource, Scraper } from "./scraper.ts";

const JOBS_URL = "https://www.levels.fyi/jobs";

export class LevelsScraper implements Scraper {
  fetchJobs() {
    console.log("🔍 Starting levels job scraping...");

    return retryWithBackoff(async () => {
      let browser: Browser | undefined = undefined;
      try {
        // Launch browser for personal use
        browser = await chromium.launch({ headless: false });

        const page = await browser.newPage();

        // Set user agent to avoid detection
        await page.setExtraHTTPHeaders({
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        });

        // Set viewport
        await page.setViewportSize({ width: 1920, height: 1080 });

        console.log("📄 Navigating to levels.fyi jobs page...");
        await page.goto(JOBS_URL);

        // Close initial popup
        await page.getByRole("button", { name: "Close" }).first().click();

        await this.setupFilters(page);

        // Wait for results to load
        console.log("⏳ Waiting for job results to load...");

        // Find job links using the href pattern
        console.log("🔍 Looking for job links...");
        const jobLinks = await page.locator('a[href^="/jobs?jobId="]').all();
        console.log(`📋 Found ${jobLinks.length} job links`);

        const rawJobs: RawSource[] = [];
        for (const jobLink of jobLinks) {
          await jobLink.click();
          const id = (await jobLink.getAttribute("href")).split("jobId=")[1];
          const headerContainer = page.locator('section[class*="job-details-header"]').first();
          const title = await headerContainer.locator("h1").first().textContent();
          const headerDetails = await headerContainer.locator('p[class*="job-details-header_detailsRow"]').first().textContent();
          const applyUrl = await headerContainer.locator('a[class*="job-details-header_applyNowButton"]').first().getAttribute("href");

          // Check if compensation element exists before trying to get its text content
          const compensationElement = headerContainer.locator('div[class*="job-details-header_compensationRow"]').first();
          const compensation = (await compensationElement.count()) > 0 ? await compensationElement.textContent() : null;

          const description = await page.locator('div[class*="job-details-about_plainTextDescription"]').first().textContent();
          rawJobs.push({
            name: "levels",
            id,
            details: {
              title,
              headerDetails,
              applyUrl,
              compensation,
              description,
            },
          });
        }

        return rawJobs;
      } finally {
        await browser?.close();
      }
    });
  }

  private async setupFilters(page: Page) {
    console.log("📄 Setting up filters...");

    // Select currency
    await page.getByRole("button", { name: "R$ BRL / mo" }).click();
    await page.getByRole("button", { name: "🇨🇦 CAD - C$ Canadian Dollar" }).click();

    // Select location
    await page.getByRole("button", { name: "Location", exact: true }).click();
    await page.getByRole("checkbox", { name: "🇨🇦Canada" }).click();
    await page.locator("html").click();

    // Select title
    await page.getByRole("button", { name: "Title" }).click();
    await page.getByRole("checkbox", { name: "💻Software Engineer", exact: true }).click();
    await page.locator("html").click();

    // Select level
    await page.getByRole("button", { name: "Level" }).click();
    await page.getByRole("checkbox", { name: "Entry Level" }).click();
    await page.getByRole("checkbox", { name: "Senior" }).click();
    await page.getByRole("checkbox", { name: "Principal" }).click();
    await page.locator("html").click();

    // Select remote
    await page.getByRole("button", { name: "Remote" }).click();
    await page.getByRole("checkbox", { name: "Fully Remote" }).click();
    await page.getByRole("checkbox", { name: "Hybrid" }).click();
    await page.getByRole("checkbox", { name: "Hybrid" }).press("Escape");

    // Select date posted
    await page.getByRole("button", { name: "Date Posted" }).click();
    await page.getByRole("textbox", { name: "30" }).click();
    await page.getByRole("textbox", { name: "30" }).fill("3");
    await page.locator("html").click();
  }
}
