import fs from "fs";
import type { ResumeData } from "../types/types.ts";

export function loadResumeData(): ResumeData {
  try {
    const resumePath = "my-resume.json";
    const resumeContent = fs.readFileSync(resumePath, "utf-8");
    return JSON.parse(resumeContent);
  } catch (error) {
    console.error("Error loading resume data:", error);
    throw new Error("Failed to load resume data");
  }
}
