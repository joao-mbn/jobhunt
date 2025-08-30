import { chromium } from "playwright";
import type { JobItem } from "../types.ts";
import { randomDelay, retryWithBackoff } from "./utils.ts";

const LEVELS_FYI_BASE_URL = "https://www.levels.fyi";
const JOBS_URL = `${LEVELS_FYI_BASE_URL}/jobs`;

export function fetchLevelsFYIJobs(): Promise<JobItem[]> {
  console.log("🔍 Starting levels.fyi job scraping...");

  return retryWithBackoff(async () => {
    let browser: any = undefined;
    try {
      // Launch browser for personal use
      browser = await chromium.launch({
        headless: false,
      });

      const page = await browser.newPage();

      // Set user agent to avoid detection
      await page.setExtraHTTPHeaders({
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      });

      // Set viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      console.log("📄 Navigating to levels.fyi jobs page...");
      await page.goto(JOBS_URL, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Add a small delay to ensure page is fully loaded
      await randomDelay(2000, 4000);
      return [];
    } finally {
      await browser?.close();
    }
  });
}
