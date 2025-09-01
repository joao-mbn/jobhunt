import type { LinkedInData } from "../types/definitions/source.ts";
import type { Scraper } from "./types.ts";

export class LinkedInScraper implements Scraper {
  async fetchJobs() {
    const url = process.env.RSS_ENDPOINT;
    if (!url) {
      throw new Error("RSS_ENDPOINT is not set");
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as LinkedInData;
      return data.items.map((item) => ({
        name: item.title,
        jobId: item.id,
        details: item,
        source: "linkedin",
      }));
    } catch (error) {
      console.error("Error fetching RSS feed:", error);
      return [];
    }
  }
}

export const linkedinScraper = new LinkedInScraper();
