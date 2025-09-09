import { google, sheets_v4 } from "googleapis";
import { GSHEET_JOB_MAPPER, gsheetRowToEnhancedJobWithPrefills } from "../types/converters/job-to-gsheet.ts";
import type { GSheetRow } from "../types/definitions/gsheet.ts";

const COLUMN_WIDTH = 100;
const ROW_HEIGHT = 21;
const GSHEET_HEADERS = GSHEET_JOB_MAPPER.toSorted((a, b) => a.gsheetIndex - b.gsheetIndex).map(
  (mapper) => mapper.gsheetColumn
);

function connectToGoogleSheets() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  const sheetName = process.env.GOOGLE_SHEET_NAME;
  const credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL!,
    private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  };

  const isSheetsOnEnv =
    process.env.GOOGLE_SPREADSHEET_ID && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;

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

async function getSheetId(sheets: sheets_v4.Sheets, spreadsheetId: string, sheetName: string): Promise<number> {
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = response.data.sheets?.find((s: sheets_v4.Schema$Sheet) => s.properties?.title === sheetName);
  return sheet?.properties?.sheetId ?? 0;
}

export async function getExistingJobIds(): Promise<Set<string>> {
  const { sheets, spreadsheetId, sheetName } = connectToGoogleSheets();

  try {
    console.log("📋 Checking existing jobs in Google Sheet...");
    const existingDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });

    const jobs = existingDataResponse.data.values.map(gsheetRowToEnhancedJobWithPrefills);
    return new Set(jobs.map((job) => job.jobId));
  } catch (error) {
    console.error("❌ Error checking existing job IDs:", error);
    console.log("⚠️  Continuing without duplicate check...");
    return new Set<string>();
  }
}

export async function uploadToGoogleSheet(jobs: GSheetRow[]): Promise<void> {
  const { sheets, spreadsheetId, sheetName } = connectToGoogleSheets();

  try {
    console.log("Reading existing data from sheet...");
    const existingDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });

    const existingRows = existingDataResponse.data.values || [];
    if (existingRows.length === 0) {
      console.log("Sheet is empty, adding headers and new data...");
      const allData = [[...GSHEET_HEADERS], ...jobs];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: allData,
        },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: sheetName,
        valueInputOption: "RAW",
        requestBody: {
          values: jobs,
        },
      });
    }
    console.log(`Successfully appended ${jobs.length} job records to Google Sheet`);

    await setSheetFormatting(sheets, spreadsheetId, sheetName, existingRows.length, jobs.length + existingRows.length);
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
  endRow: number
): Promise<void> {
  try {
    const sheetId = await getSheetId(sheets, spreadsheetId, sheetName);
    const requests: sheets_v4.Schema$Request[] = [];

    requests.push(
      {
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
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: GSHEET_HEADERS.length + 1,
          },
          properties: {
            pixelSize: COLUMN_WIDTH,
          },
          fields: "pixelSize",
        },
      },
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: startRow,
            endRowIndex: endRow + 1,
            startColumnIndex: 0,
            endColumnIndex: GSHEET_HEADERS.length + 1,
          },
          cell: {
            userEnteredFormat: {
              wrapStrategy: "CLIP",
            },
          },
          fields: "userEnteredFormat.wrapStrategy",
        },
      }
    );

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
