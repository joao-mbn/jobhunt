import { TailoredResume } from "../types.ts";

export function formatTailoredResume(resume: TailoredResume): string {
  let text = "";

  text += `RELEVANT EXPERIENCE\n`;
  resume.tailoredExperience.forEach((exp) => {
    text += `${exp.position}\n`;
    text += `${exp.company} | ${exp.duration}\n`;
    text += `Technologies: ${exp.relevantTechnologies.join(", ")}\n`;
    text += `Key Achievements:\n`;
    exp.tailoredAchievements.forEach((achievement) => {
      text += `• ${achievement}\n`;
    });
    text += `\n`;
  });

  text += `\n\n`;
  text += `PROJECTS\n`;
  resume.tailoredProjects.forEach((project) => {
    text += `${project.title}\n`;
    text += `${project.description}\n`;
    text += `Technologies: ${project.relevantTechnologies.join(", ")}\n`;
    text += `Key Achievements:\n`;
    project.tailoredAchievements.forEach((achievement) => {
      text += `• ${achievement}\n`;
    });
    text += `\n`;
  });

  return text;
}

export function formatContentPreview(content: string): string {
  return content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().substring(0, 200) + "...";
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function breakdownTitle(title: string): { company: string; role: string; location: string } {
  const titleParts = title.split(" hiring ");
  const company = titleParts[0] || "Unknown";
  const roleAndLocation = titleParts[1]?.split(" in ") || ["Unknown", "Unknown"];
  const role = roleAndLocation[0];
  const location = roleAndLocation[1];
  return { company, role, location };
}
