import type { RSSData } from "../types.ts";

export async function fetchRSSFeed(): Promise<RSSData> {
  const url = Deno.env.get("RSS_ENDPOINT");
  if (!url) {
    throw new Error("RSS_ENDPOINT is not set");
  }

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
