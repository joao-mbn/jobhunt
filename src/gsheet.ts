import { google } from "googleapis";
import type { RSSData } from "./types.ts";

// Create data for new jobs only
const headers = [
  "Date",
  "Job ID",
  "Title",
  "Company",
  "Location",
  "URL",
  "Role",
  "Published Date",
  "Content Preview",
  "Relevance Score",
  "Relevance Reason",
  "Recommendation",
];

export async function uploadToGoogleSheet(data: RSSData): Promise<void> {
  const spreadsheetId = Deno.env.get("GOOGLE_SPREADSHEET_ID")!;
  const sheetName = Deno.env.get("GOOGLE_SHEET_NAME") || "Job Data";
  const credentials = {
    client_email: Deno.env.get("GOOGLE_CLIENT_EMAIL")!,
    private_key: Deno.env.get("GOOGLE_PRIVATE_KEY")!.replace(/\\n/g, "\n"),
  };

  const isSheetsOnEnv = Deno.env.get("GOOGLE_SPREADSHEET_ID") &&
    Deno.env.get("GOOGLE_CLIENT_EMAIL") &&
    Deno.env.get("GOOGLE_PRIVATE_KEY");

  if (!isSheetsOnEnv) {
    throw new Error("Google Sheets environment variables are not set");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  try {
    // First, read existing data to get existing URLs
    console.log("Reading existing data from sheet...");
    const existingDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });

    const existingRows = existingDataResponse.data.values || [];
    const existingUrls = new Set<string>();
    existingRows.forEach((row) => {
      if (row?.[5] && typeof row[5] === "string" && row[5].startsWith("https://")) {
        existingUrls.add(row[5]);
      }
    });

    console.log(`Found ${existingUrls.size} existing job URLs in sheet`);

    // Filter out jobs that already exist
    const newJobs = data.items.filter((item) => !existingUrls.has(item.url));

    if (newJobs.length === 0) {
      console.log("No new jobs to add - all jobs already exist in the sheet");
      return;
    }

    console.log(`Found ${newJobs.length} new jobs to add`);

    const newRows: string[][] = [];

    for (const item of newJobs) {
      // Extract company and location from title
      const titleParts = item.title.split(" hiring ");
      const company = titleParts[0] || "Unknown";
      const roleAndLocation = titleParts[1]?.split(" in ") || ["Unknown", "Unknown"];
      const role = roleAndLocation[0];
      const location = roleAndLocation[1];

      // Clean content text (remove HTML tags and limit length)
      const contentPreview = item.content_text
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 200) + "...";

      // Format date
      const publishedDate = new Date(item.date_published).toLocaleDateString();

      const row = [
        new Date().toLocaleDateString(), // Processing date
        item.id,
        item.title,
        company,
        location,
        item.url,
        role,
        publishedDate,
        contentPreview,
        item.relevanceScore?.toString() || "N/A",
        item.relevanceReason || "N/A",
        item.recommendation || "N/A",
      ];

      newRows.push(row);
    }

    // If sheet is empty (only has headers or is completely empty), add headers first
    if (existingRows.length === 0) {
      console.log("Sheet is empty, adding headers and new data...");
      const allData = [headers, ...newRows];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: allData,
        },
      });

      console.log(`Successfully uploaded ${newRows.length} job records to Google Sheet`);
      return;
    }

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetName,
      valueInputOption: "RAW",
      requestBody: {
        values: newRows,
      },
    });

    console.log(`Successfully appended ${newRows.length} job records to Google Sheet`);
    console.log(`Updated ${response.data.updates?.updatedCells} cells`);
  } catch (error) {
    console.error("Error uploading to Google Sheet:", error);
    throw error;
  }
}
