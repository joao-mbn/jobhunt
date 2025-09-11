import type { RawJob } from "../types/definitions/job.ts";
import type { LinkedInData } from "../types/definitions/source.ts";
import type { Scraper } from "./types.ts";

export class LinkedInScraper implements Scraper {
  private readonly url: string;

  constructor() {
    const url = process.env.LINKEDIN_ENDPOINT;
    if (!url) {
      throw new Error("LINKEDIN_ENDPOINT is not set");
    }
    this.url = url;
  }

  async fetchJobs(): Promise<RawJob[]> {
    try {
      const response = await fetch(this.url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as LinkedInData;
      return data.items.map((item) => ({
        name: item.title,
        jobId: item.url.split("view/")[1] ?? item.id,
        url: item.url,
        details: item,
        source: "linkedin",
      }));
    } catch (error) {
      console.error("Error fetching RSS feed:", error);
      return [];
    }
  }
}

export const linkedInScraper = new LinkedInScraper();
