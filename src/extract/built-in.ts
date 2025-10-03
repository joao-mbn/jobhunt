import { chromium, type Browser, type Page } from "@playwright/test";
import { load } from "cheerio";
import type { RawJob } from "../types/definitions/job.ts";
import type { BuiltInData } from "../types/definitions/source.ts";
import { USER_AGENT } from "../utils/constants.ts";
import type { Scraper } from "./types.ts";

export class BuiltInScraper implements Scraper {
  private readonly url: string;

  constructor() {
    const url = process.env.BUILTIN_ENDPOINT;
    if (!url) {
      throw new Error("BUILTIN_ENDPOINT is not set");
    }
    this.url = url;
  }

  async fetchJobs(): Promise<RawJob[]> {
    console.log("🔍 Starting built-in job scraping...");

    let browser: Browser | undefined = undefined;
    const rawJobs: RawJob[] = [];

    const jobsToScrape = await this.fetchJobsToScrape();
    if (jobsToScrape.length === 0) {
      console.log("❌ No jobs found");
      return rawJobs;
    }

    try {
      browser = await chromium.launch();
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ "User-Agent": USER_AGENT });
      await page.setViewportSize({ width: 1920, height: 1080 });

      for (const jobToScrape of jobsToScrape) {
        const rawJobsForPage = await this.extractJobOnPage(page, jobToScrape);
        rawJobs.push(rawJobsForPage);
      }

      console.log(
        `✅ Built-in scraper completed - found ${rawJobs.length} total job URLs`,
      );
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      await browser?.close();
      return rawJobs; /* returns partial results if there are errors */
    }
  }

  private async extractJobOnPage(
    page: Page,
    jobToScrape: Pick<RawJob, "url" | "jobId">,
  ): Promise<RawJob> {
    await page.goto(jobToScrape.url);

    const header = page.locator('div[data-id="job-card"]').first();
    const title = await header.locator("h1").first().textContent();
    const company = await header
      .locator("h2[data-id='company-title']")
      .first()
      .textContent();
    let location = await header
      .locator("div.d-flex.align-items-start.gap-sm:has(i.fa-location-dot)")
      .first()
      .textContent();
    location = location?.trim().split(" in ")[1] || location?.trim();
    const workArrengement = (
      await header
        .locator("div.d-flex.align-items-start.gap-sm:has(i.fa-house-building)")
        .first()
        .textContent()
    ).trim();
    const seniorityLevel = (
      await header
        .locator("div.d-flex.align-items-start.gap-sm:has(i.fa-trophy)")
        .first()
        .textContent()
    ).trim();
    const datePublished = (
      await header
        .locator(
          "div.d-flex.flex-column.flex-md-row.d-md-inline-flex:has(i.fa-clock)",
        )
        .first()
        .textContent()
    ).trim();
    const description = await page
      .locator("div[id*=job-post-body-]")
      .first()
      .textContent();
    const topSkillsContainer = page
      .locator(
        "div.bg-white.rounded-3.p-md.p-lg-lg.mb-sm.mb-lg-md.full-size:has(h2)",
      )
      .first();
    const topSkills = (
      await Promise.all(
        (
          await topSkillsContainer
            .locator(
              "div.py-xs.px-sm.d-inline-block.rounded-3.fs-sm.text-nowrap.border",
            )
            .all()
        ).map((skill) => skill.textContent()),
      )
    ).join(", ");

    const details: Record<string, unknown> = {
      title,
      company,
      location,
      workArrengement,
      seniorityLevel,
      datePublished,
      description,
      topSkills,
    } satisfies BuiltInData;
    const rawJobs: RawJob = {
      name: title,
      jobId: jobToScrape.jobId,
      url: jobToScrape.url,
      details,
      source: "builtin",
    };
    return rawJobs;
  }

  private async fetchJobsToScrape(): Promise<Pick<RawJob, "url" | "jobId">[]> {
    const jobUrls: Pick<RawJob, "url" | "jobId">[] = [];
    const baseUrl = this.getBaseUrl();

    try {
      for (let page = 1; page <= 10; page++) {
        const pageUrl =
          page === 1
            ? this.url
            : `${this.url}&handler=SearchResults&page=${page}`;
        console.log(`📄 Fetching page ${page}...`);

        const response = await fetch(pageUrl, {
          method: "GET",
          headers: { "User-Agent": USER_AGENT },
        });

        if (!response.ok) {
          console.log(
            `Error fetching page with status ${response.status} on page ${page}: ${response.statusText}`,
          );
          continue;
        }

        const html = await response.text();
        const $ = load(html);

        const pageJobUrls: Pick<RawJob, "url" | "jobId">[] = [];

        // Find all <a> tags that are children of <h2> tags with data-builtin-track-job-id
        $("h2 a[data-builtin-track-job-id]").each((_, element) => {
          const $jobLink = $(element);
          const jobPath = $jobLink.attr("href");
          const jobId = jobPath?.split("job/")[1];

          if (!jobPath || !jobId) {
            return;
          }

          const fullJobUrl = `${baseUrl}${jobPath}`;
          pageJobUrls.push({ url: fullJobUrl, jobId: `builtin-${jobId}` });
        });

        if (pageJobUrls.length === 0) {
          console.log(`🛑 No jobs found on page ${page}, stopping pagination`);
          break;
        }

        console.log(`✅ Found ${pageJobUrls.length} job URLs on page ${page}`);
        jobUrls.push(...pageJobUrls);
      }
    } catch (error) {
      console.error("❌ Error fetching jobs:", error);
    }

    console.log(`✅ Found ${jobUrls.length} job URLs`);
    return jobUrls;
  }

  private getBaseUrl(): string {
    try {
      const url = new URL(this.url);
      return `${url.protocol}//${url.host}`;
    } catch (error) {
      throw new Error(`Invalid URL format: ${this.url}`);
    }
  }
}

export const builtInScraper = new BuiltInScraper();
