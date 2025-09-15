import { chromium, type Browser, type Page } from "@playwright/test";
import type { RawJob } from "../types/definitions/job.ts";
import type { LevelsData } from "../types/definitions/source.ts";
import { USER_AGENT } from "../utils/constants.ts";
import type { Scraper } from "./types.ts";

export class LevelsScraper implements Scraper {
  private readonly url: string;

  constructor() {
    const url = process.env.LEVELS_ENDPOINT;
    if (!url) {
      throw new Error("LEVELS_ENDPOINT is not set");
    }
    this.url = url;
  }

  async fetchJobs(): Promise<RawJob[]> {
    console.log("🔍 Starting levels job scraping...");

    let browser: Browser | undefined = undefined;
    const rawJobs: RawJob[] = [];
    try {
      browser = await chromium.launch();
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ "User-Agent": USER_AGENT });
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.goto(this.url);
      await page.getByRole("button", { name: "Close" }).first().click();
      await this.setupCurrency(page);

      console.log("🔍 Looking for job links...");
      let offset = 0;

      while (offset < 100 /* safety break */) {
        await page.goto(`${this.url}&offset=${offset}`);
        const rawJobsForPage = await this.extractJobsOnPage(page);
        if (rawJobsForPage.length === 0) {
          break;
        }
        rawJobs.push(...rawJobsForPage);

        // There are 5 companies per page, but there might be more jobs because a company might have multiple jobs
        offset += 5;
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      await browser?.close();
      return rawJobs; /* returns partial results if there are errors */
    }
  }

  private async extractJobsOnPage(page: Page) {
    const jobLinks = await page.locator('a[href^="/jobs?jobId="]').all();
    console.log(`📋 Found ${jobLinks.length} job links`);

    const rawJobs: RawJob[] = [];
    for (const jobLink of jobLinks) {
      await jobLink.click();
      const jobId = (await jobLink.getAttribute("href")).split("jobId=")[1];
      const headerContainer = page.locator('section[class*="job-details-header"]').first();
      const title = await headerContainer.locator("h1").first().textContent();
      const headerDetails = await headerContainer
        .locator('p[class*="job-details-header_detailsRow"]')
        .first()
        .textContent();
      const applyUrl = await headerContainer
        .locator('a[class*="job-details-header_applyNowButton"]')
        .first()
        .getAttribute("href");

      const compensationElement = headerContainer.locator('div[class*="job-details-header_compensationRow"]').first();
      const compensation = (await compensationElement.count()) > 0 ? await compensationElement.textContent() : null;

      const content = page.locator('div[class*="job-details-about_markdownText"]');
      const description = (await content.count()) > 0 ? await content.textContent() : null;

      const details: Record<string, unknown> = {
        title,
        headerDetails,
        applyUrl,
        compensation,
        description,
      } satisfies LevelsData;

      rawJobs.push({
        source: "levels",
        name: title,
        jobId,
        url: `https://www.levels.fyi/jobs?jobId=${jobId}`,
        details,
      });
    }

    return rawJobs;
  }

  private async setupCurrency(page: Page) {
    await page.locator('button[class*="currencyButton"]').click();
    await page.locator("button").filter({ hasText: "Canadian Dollar" }).first().click();

    await page.locator('button[class*="currencyButton"]').click();
    await page.locator('button[role="tab"]').filter({ hasText: "Annual" }).click();
    await page.locator('ul[class*="currency-locale-selector"] button').filter({ hasText: "Annual" }).first().click();
  }
}

export const levelsScraper = new LevelsScraper();
