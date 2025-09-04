import fs from "fs";
import type { ResumeData } from "../types/definitions/types.ts";

// Cache the resume data at module level
let resumeDataCache: ResumeData | null = null;

export function getResume(): ResumeData | null {
  if (resumeDataCache !== null) {
    return resumeDataCache;
  }

  try {
    const resumePath = "data/my-resume.json";
    const resumeContent = fs.readFileSync(resumePath, "utf-8");
    resumeDataCache = JSON.parse(resumeContent);
    return resumeDataCache;
  } catch (error) {
    console.error("Error loading resume data:", error);
    return null;
  }
}
