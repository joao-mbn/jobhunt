import { updateSheet } from "./gsheet";
import { fetchRSSFeed } from "./rss";

async function main() {
  try {
    await fetchRSSFeed();
    await updateSheet();
    console.log("RSS feed fetch completed successfully");
  } catch (error) {
    console.error("Failed to fetch RSS feed:", error);
    process.exit(1);
  }
}

main();
