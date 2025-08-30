import fs from "node:fs";
import { JobItem, ResumeData } from "../types.ts";
import { formatDateTime } from "../utils/format.ts";

export function saveJobs(jobs: JobItem[]): void {
  const dir = "data/jobs";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const today = formatDateTime(new Date());
  const filename = `jobs-${today}.json`;

  fs.writeFileSync(`${dir}/${filename}`, JSON.stringify(jobs, null, 2));
  console.log(
    `Saved ${jobs.length} jobs with relevance scores to ${dir}/${filename}`,
  );
}

export function loadResumeData(): ResumeData {
  try {
    const resumePath = "data/myResume.json";
    const resumeContent = fs.readFileSync(resumePath, "utf-8");
    return JSON.parse(resumeContent);
  } catch (error) {
    console.error("Error loading resume data:", error);
    throw new Error("Failed to load resume data");
  }
}
