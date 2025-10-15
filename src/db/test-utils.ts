import { randomUUID } from "crypto";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { Database } from "./database.ts";
import { main as initDbSchema } from "./index.ts";

/**
 * Sets up a test database with a unique path and initialized schema
 * @returns Promise resolving to an object containing the database instance and path
 */
export async function setupDb(): Promise<{ db: Database; dbPath: string }> {
  const testId = randomUUID();
  const testDbPath = join(process.cwd(), "data", `test-${testId}.db`);

  const testDb = new Database({}, testDbPath);
  await initDbSchema(testDb);

  return { db: testDb, dbPath: testDbPath };
}

/**
 * Tears down a test database by disconnecting and deleting the file
 * @param db - The database instance to disconnect
 * @param dbPath - The path to the database file to delete
 */
export function teardownDb(db: Database, dbPath: string): void {
  if (db) {
    db.disconnect();
  }

  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
}
