import fs from "node:fs";
import type { RSSData } from "./types.ts";

export function saveJobs(jobs: RSSData): void {
  const dir = "data/linkedinJobs";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date());
  const filename = `linkedinJobs-${today}.json`;

  fs.writeFileSync(`${dir}/${filename}`, JSON.stringify(jobs, null, 2));
  console.log(
    `Saved ${jobs.items.length} jobs with relevance scores to ${dir}/${filename}`,
  );
}
