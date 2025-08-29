import type { JobItem, RSSData } from "../types.ts";

export async function fetchRSSFeed(): Promise<JobItem[]> {
  const url = Deno.env.get("RSS_ENDPOINT");
  if (!url) {
    throw new Error("RSS_ENDPOINT is not set");
  }

  try {
    const response = await fetch("https://rss.app/feeds/v1.1/5l6cbW6vRLn99r0i.json", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as RSSData;
    return data.items;
  } catch (error) {
    console.error("Error fetching RSS feed:", error);
    return [];
  }
}
