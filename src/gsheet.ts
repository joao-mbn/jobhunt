import fs from "fs";
import { google } from "googleapis";
import path from "path";

interface JobItem {
  id: string;
  url: string;
  title: string;
  content_text: string;
  content_html: string;
  image?: string;
  date_published: string;
  authors: Array<{ name: string }>;
  attachments?: Array<{ url: string }>;
}

interface RSSData {
  version: string;
  title: string;
  home_page_url: string;
  feed_url: string;
  favicon: string;
  language: string;
  description: string;
  items: JobItem[];
}

interface GoogleSheetConfig {
  spreadsheetId: string;
  sheetName: string;
  credentials: {
    client_email: string;
    private_key: string;
  };
}

function readDataFiles(): RSSData[] {
  const dataDir = path.join(process.cwd(), "data");
  const files = fs
    .readdirSync(dataDir)
    .filter((file) => file.endsWith(".json"));

  if (files.length === 0) {
    throw new Error("No JSON files found in the data directory");
  }

  const dataFiles: RSSData[] = [];

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content) as RSSData;
    dataFiles.push(data);
  }

  return dataFiles;
}

function flattenJobData(dataFiles: RSSData[]): string[][] {
  const headers = [
    "Date",
    "Job ID",
    "Title",
    "Company",
    "Location",
    "URL",
    "Published Date",
    "Content Preview",
  ];

  const rows: string[][] = [headers];

  for (const dataFile of dataFiles) {
    for (const item of dataFile.items) {
      // Extract company and location from title
      const titleParts = item.title.split(" hiring ");
      const company = titleParts[0] || "Unknown";
      const locationMatch = item.title.match(/in ([^,]+(?:, [^,]+)*)/);
      const location = locationMatch?.[1] ?? "Unknown";

      // Clean content text (remove HTML tags and limit length)
      const contentPreview =
        item.content_text
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
        publishedDate,
        contentPreview,
      ];

      rows.push(row);
    }
  }

  return rows;
}

async function uploadToGoogleSheet(
  data: string[][],
  config: GoogleSheetConfig
): Promise<void> {
  const auth = new google.auth.GoogleAuth({
    credentials: config.credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    // Clear existing data in the sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId: config.spreadsheetId,
      range: config.sheetName,
    });

    console.log(`Cleared existing data in sheet: ${config.sheetName}`);

    // Upload new data
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: data,
      },
    });

    console.log(
      `Successfully uploaded ${data.length - 1} job records to Google Sheet`
    );
    console.log(`Updated ${response.data.updatedCells} cells`);
    console.log(
      `Sheet URL: https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit#gid=0`
    );
  } catch (error) {
    console.error("Error uploading to Google Sheet:", error);
    throw error;
  }
}

export async function updateSheet(): Promise<void> {
  try {
    const config: GoogleSheetConfig = {
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || "",
      sheetName: process.env.GOOGLE_SHEET_NAME || "Job Data",
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL || "",
        private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(
          /\\n/g,
          "\n"
        ),
      },
    };

    // Validate configuration
    if (!config.spreadsheetId) {
      throw new Error("GOOGLE_SPREADSHEET_ID environment variable is required");
    }
    if (!config.credentials.client_email || !config.credentials.private_key) {
      throw new Error(
        "GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables are required"
      );
    }

    console.log("Reading data files...");
    const dataFiles = readDataFiles();
    console.log(`Found ${dataFiles.length} data files`);

    console.log("Processing job data...");
    const flattenedData = flattenJobData(dataFiles);
    console.log(`Processed ${flattenedData.length - 1} job records`);

    console.log("Uploading to Google Sheet...");
    await uploadToGoogleSheet(flattenedData, config);

    console.log(
      "✅ Successfully processed and uploaded job data to Google Sheet!"
    );
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}
