import { readFileSync } from "fs";
import { join } from "path";
import { Database, db } from "./database.ts";

export async function main(_db: Database = db) {
  try {
    const schemaPath = join(process.cwd(), "src", "db", "schema.sql");
    const schemaSQL = readFileSync(schemaPath, "utf-8");

    console.log("Creating database schema...");
    _db.exec(schemaSQL);

    const tables = _db.query(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    console.log("Created tables:", tables.map((r) => r.name).join(", "));
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exitCode = 1;
  } finally {
    _db.disconnect();
  }
}

if (import.meta.main) {
  main();
}
