import type { LinkedinData } from "../types/types.ts";
import type { Scraper } from "./scraper.ts";

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

      const data = (await response.json()) as LinkedinData;
      return data.items.map((item) => ({
        name: "linkedin",
        id: item.id,
        details: item as unknown as Record<string, unknown>,
      }));
    } catch (error) {
      console.error("Error fetching RSS feed:", error);
      return [];
    }
  }
}
