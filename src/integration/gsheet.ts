import { google } from "googleapis";
import type { JobItem, RSSData } from "../types.ts";
import { breakdownTitle, formatContentPreview, formatDate } from "../utils/format.ts";

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
  "Resume Text",
  "Cover Letter Text",
];

function connectToGoogleSheets() {
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
  return { sheets, spreadsheetId, sheetName };
}

async function getExistingUrls(): Promise<Set<string>> {
  const { sheets, spreadsheetId, sheetName } = connectToGoogleSheets();

  try {
    console.log("📋 Checking existing jobs in Google Sheet...");
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

    console.log(`📊 Found ${existingUrls.size} existing job URLs in sheet`);
    return existingUrls;
  } catch (error) {
    console.error("❌ Error checking existing URLs:", error);
    console.log("⚠️  Continuing without duplicate check...");
    return new Set<string>();
  }
}

export async function filterNewJobs(jobsData: RSSData): Promise<JobItem[]> {
  const existingUrls = await getExistingUrls();

  const newJobs = jobsData.items.filter((item) => !existingUrls.has(item.url));
  console.log(`🔍 Filtered jobs: ${jobsData.items.length} total, ${newJobs.length} new`);

  return newJobs.map((item) => {
    const { company, role, location } = breakdownTitle(item.title);
    return {
      ...item,
      company,
      role,
      location,
      contentPreview: formatContentPreview(item.content_text),
      publishedDate: formatDate(new Date(item.date_published)),
    };
  });
}

export async function uploadToGoogleSheet(jobs: JobItem[]): Promise<void> {
  const { sheets, spreadsheetId, sheetName } = connectToGoogleSheets();

  // Check if we have any jobs to upload
  if (jobs.length === 0) {
    console.log("📝 No new jobs to upload to Google Sheets");
    return;
  }

  try {
    // Get existing URLs to determine if we need headers
    console.log("Reading existing data from sheet...");
    const existingDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });

    const existingRows = existingDataResponse.data.values || [];

    const newRows: string[][] = [];

    for (const job of jobs) {
      const row = [
        new Date().toLocaleDateString(), // Processing date
        job.id ?? "",
        job.title ?? "",
        job.company ?? "",
        job.location ?? "",
        job.url ?? "",
        job.role ?? "",
        job.publishedDate ?? "",
        job.contentPreview ?? "",
        job.relevanceScore?.toString() ?? "",
        job.relevanceReason ?? "",
        job.recommendation ?? "",
        job.tailoredResume ?? "",
        job.coverLetter ?? "",
      ];

      newRows.push(row);
    }

    // If sheet is empty, add headers first
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
