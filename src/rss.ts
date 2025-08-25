import fs from "fs";

interface RSSData {
  items: any[];
  [key: string]: any;
}

export async function fetchRSSFeed(): Promise<void> {
  const url = new URL("https://rss.app/feeds/v1.1/sUOBma3URjECoaqq.json");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as RSSData;
    const today = new Date().toISOString().split("T")[0];

    fs.writeFileSync(
      `data/linkedinJobs/linkedinJobs-${today}.json`,
      JSON.stringify(data, null, 2)
    );
    console.log(
      `Fetched ${data.items.length} items and saved to data/linkedinJobs/linkedinJobs-${today}.json`
    );
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
