import fs from "node:fs";
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
    const today = new Date().toISOString().split("T")[0];

    // Ensure the directory exists
    const dir = "data/linkedinJobs";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      `${dir}/linkedinJobs-${today}.json`,
      JSON.stringify(data, null, 2),
    );
    console.log(
      `Fetched ${data.items.length} items and saved to ${dir}/linkedinJobs-${today}.json`,
    );

    return data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

export function saveJobsWithRelevance(jobs: RSSData, filename: string): void {
  const dir = "data/linkedinJobs";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(`${dir}/${filename}`, JSON.stringify(jobs, null, 2));
  console.log(
    `Saved ${jobs.items.length} jobs with relevance scores to ${dir}/${filename}`,
  );
}
