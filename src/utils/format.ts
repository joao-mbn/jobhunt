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

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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
