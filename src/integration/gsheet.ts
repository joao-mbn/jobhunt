import { google, sheets_v4 } from "googleapis";
import type { JobItem } from "../types.ts";
import { MIN_RELEVANCE_SCORE } from "../utils/constants.ts";
import {
  breakdownTitle,
  formatContentPreview,
  formatDate,
  formatDateTime,
} from "../utils/format.ts";

const COLUMN_WIDTH = 100;
const ROW_HEIGHT = 21;
const HEADERS = [
  "Date",
  "Job ID",
  "URL",
  "Title",
  "Company",
  "Location",
  "Role",
  "Estimated Compensation",
  "Published Date",
  "Content Preview",
  "Years of Experience Required",
  "Hard Skills Required",
  "Relevance Score",
  "Relevance Reason",
  "Recommendation",
  "Content",
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

async function getSheetId(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
): Promise<number> {
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = response.data.sheets?.find((s: sheets_v4.Schema$Sheet) =>
    s.properties?.title === sheetName
  );
  return sheet?.properties?.sheetId ?? 0;
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
    const urlIndex = existingRows[0].findIndex((cell) => cell === "URL");
    existingRows.forEach((row) => {
      if (
        row?.[urlIndex] && typeof row[urlIndex] === "string" && row[urlIndex].startsWith("https://")
      ) {
        existingUrls.add(row[urlIndex]);
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

export async function filterNewJobs(jobsData: JobItem[]): Promise<JobItem[]> {
  const existingUrls = await getExistingUrls();

  const newJobs = jobsData.filter((item) => !existingUrls.has(item.url));
  console.log(`🔍 Filtered jobs: ${jobsData.length} total, ${newJobs.length} new`);

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
  const jobsToUpload = jobs.filter((job) =>
    job.relevanceScore && job.relevanceScore >= MIN_RELEVANCE_SCORE
  );

  console.log(`🔍 Uploading ${jobsToUpload.length} out of ${jobs.length} jobs to Google Sheets`);

  // Check if we have any jobs to upload
  if (jobsToUpload.length === 0) {
    console.log("📝 No jobs to upload to Google Sheets");
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

    for (const job of jobsToUpload) {
      const row = [
        formatDateTime(new Date()), // Processing date
        job.id ?? "",
        job.url ?? "",
        job.title ?? "",
        job.company ?? "",
        job.location ?? "",
        job.role ?? "",
        job.estimatedCompensation ?? "",
        job.publishedDate ?? "",
        job.contentPreview ?? "",
        job.yearsOfExperienceRequired?.toString() ?? "",
        job.hardSkillsRequired?.toString() ?? "",
        job.relevanceScore?.toString() ?? "",
        job.relevanceReason ?? "",
        job.recommendation ?? "",
        job.content_text ?? "",
        job.tailoredResume ?? "",
        job.coverLetter ?? "",
      ];

      newRows.push(row);
    }

    // If sheet is empty, add headers first
    if (existingRows.length === 0) {
      console.log("Sheet is empty, adding headers and new data...");
      const allData = [HEADERS, ...newRows];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: allData,
        },
      });
      console.log(`Successfully uploaded ${newRows.length} job records to Google Sheet`);
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: sheetName,
        valueInputOption: "RAW",
        requestBody: {
          values: newRows,
        },
      });
      console.log(`Successfully appended ${newRows.length} job records to Google Sheet`);
    }

    await setSheetFormatting(
      sheets,
      spreadsheetId,
      sheetName,
      existingRows.length,
      newRows.length + existingRows.length,
    );
  } catch (error) {
    console.error("Error uploading to Google Sheet:", error);
    throw error;
  }
}

async function setSheetFormatting(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  startRow: number,
  endRow: number,
): Promise<void> {
  try {
    const sheetId = await getSheetId(sheets, spreadsheetId, sheetName);
    const requests: sheets_v4.Schema$Request[] = [];

    // Set fixed row heights
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: startRow,
          endIndex: endRow + 1,
        },
        properties: {
          pixelSize: ROW_HEIGHT,
        },
        fields: "pixelSize",
      },
    }, {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: HEADERS.length + 1,
        },
        properties: {
          pixelSize: COLUMN_WIDTH,
        },
        fields: "pixelSize",
      },
    }, {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: startRow,
          endRowIndex: endRow + 1,
          startColumnIndex: 0,
          endColumnIndex: HEADERS.length + 1,
        },
        cell: {
          userEnteredFormat: {
            wrapStrategy: "CLIP", // Prevents text wrapping and auto-expansion
          },
        },
        fields: "userEnteredFormat.wrapStrategy",
      },
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests,
      },
    });

    console.log(`✅ Applied formatting to rows ${startRow}-${endRow}`);
  } catch (error) {
    console.error("⚠️ Error applying formatting (continuing without it):", error);
  }
}
