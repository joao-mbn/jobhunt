import fs from "fs";

// Cache the resume data at module level
let resumeDataCache: Record<string, unknown> | null = null;

export function getResume(): Record<string, unknown> | null {
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
