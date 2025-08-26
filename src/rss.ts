import type { RSSData } from "./types.ts";

export async function fetchRSSFeed(): Promise<RSSData> {
  const url = new URL("https://rss.app/feeds/v1.1/sUOBma3URjECoaqq.json");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as RSSData;
    return data;
  } catch (error) {
    console.error("Error fetching RSS feed:", error);
    throw error;
  }
}
