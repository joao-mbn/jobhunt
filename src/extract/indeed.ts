import { chromium, type Browser, type Page } from "@playwright/test";
import type { RawJob } from "../types/definitions/job.ts";
import type { IndeedData } from "../types/definitions/source.ts";
import { USER_AGENT } from "../utils/constants.ts";
import type { Scraper } from "./types.ts";

export class IndeedScraper implements Scraper {
  private readonly url: string;

  constructor() {
    const url = process.env.INDEED_ENDPOINT;
    if (!url) {
      throw new Error("INDEED_ENDPOINT is not set");
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

      console.log("🔍 Looking for job links...");

      let offset = 0;
      const jobsAvailable = await page.locator("div.jobsearch-JobCountAndSortPane-jobCount span").first().textContent();
      let jobsCount = parseInt(jobsAvailable);
      if (isNaN(jobsCount) || jobsCount > 100) {
        jobsCount = 100; // safety break
      }

      while (offset < jobsCount) {
        try {
          await page.goto(`${this.url}&start=${offset}`);

          const links = await page.locator("a[data-jk]").all();
          for (const anchor of links) {
            await anchor.click();

            // check if the new page url has been redirected away from /jobs page
            const url = page.url();
            if (!url.includes("indeed.com/jobs")) {
              throw new Error("Cannot handle verification required");
            }

            const link = await anchor.getAttribute("data-jk");
            if (!link) {
              continue;
            }

            const rawJob = await this.extractJobOnPage(page, link);
            rawJobs.push(rawJob);
          }

          offset += links.length;
        } catch (error) {
          console.error("Error fetching jobs for offset:", offset, error);
          break;
        }
      }

      console.log(`✅ Indeed scraper completed - found ${rawJobs.length} total jobs`);

      return rawJobs;
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      await browser?.close();
      return rawJobs; /* returns partial results if there are errors */
    }
  }

  private async extractJobOnPage(page: Page, jobId: string) {
    const header = page.locator("div.jobsearch-HeaderContainer").first();
    const title = await header
      .locator("h2 span")
      .first()
      .evaluate((el) => {
        // Get only direct text nodes, excluding nested elements
        return Array.from(el.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.trim())
          .filter((text) => text)
          .join("");
      });

    const company = await header.locator("div[data-testid*='inlineHeader-companyName']").first().textContent();
    const locationAndWorkArrangement = await header
      .locator("div[data-testid*='inlineHeader-companyLocation']")
      .first()
      .textContent();
    let location = locationAndWorkArrangement.split("•")[0]?.trim() ?? "";
    const workArrangement = locationAndWorkArrangement.split("•")[1]?.trim() ?? "";
    const compensationAndJobType = await header.locator("div#salaryInfoAndJobType").first().textContent();
    let [compensation, jobType] = compensationAndJobType.split(" - ").map((s) => s.trim()) ?? [];

    const body = page.locator("div.jobsearch-BodyContainer").first();
    if (!location) {
      location = await body.locator("div[data-testid='jobsearch-JobInfoHeader-companyLocation']").first().textContent();
    }

    const insightsProvider = await body.locator("div[class^='js-match-insights-provider'][role='group']").all();
    const insights: Record<string, string> = {};
    for (const insight of insightsProvider) {
      const insightTitle = await insight.locator("h3").first().textContent();
      const insightDescriptionLocators = await insight.locator("li[data-testid='list-item']").all();

      const insightDescription = await Promise.all(
        insightDescriptionLocators.map((locator) => locator.textContent())
      ).then((texts) => texts.join(", "));
      if (!insightDescription) {
        continue;
      }
      insights[insightTitle] = insightDescription;

      if (!jobType && insightTitle === "Job Type") {
        jobType = insightDescription;
      }
      if (!compensation && insightTitle === "Pay") {
        compensation = insightDescription;
      }
    }
    const benefits = await body.locator("div#benefits li").all();
    if (benefits.length > 0) {
      insights["Benefits"] = await Promise.all(benefits.map((benefit) => benefit.textContent())).then((texts) =>
        texts.join(", ")
      );
    }

    const description = (await body.locator("div#jobDescriptionText").first().textContent()).trim();

    const details: Record<string, unknown> = {
      title,
      company,
      location,
      workArrangement,
      compensation,
      jobType,
      insights,
      description,
    } satisfies IndeedData;

    const rawJob: RawJob = {
      source: "indeed",
      name: title,
      jobId: `indeed-${jobId}`,
      url: `${this.url}&vjk=${jobId}`,
      details,
    };

    return rawJob;
  }
}

export const indeedScraper = new IndeedScraper();
