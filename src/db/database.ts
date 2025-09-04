import { existsSync, mkdirSync } from "fs";
import type { DatabaseSyncOptions, SQLInputValue, SQLOutputValue } from "node:sqlite";
import { DatabaseSync } from "node:sqlite";
import { join } from "path";

class Database {
  private database: DatabaseSync | null = null;
  private dbPath = "./data/jobhunt.db";
  private config: DatabaseSyncOptions;

  constructor(config?: DatabaseSyncOptions) {
    this.config = { timeout: 5000, ...config };
    this.ensureDataDirectory();
  }

  private ensureDataDirectory(): void {
    const dir = join(process.cwd(), this.dbPath, "..");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  connect(): DatabaseSync {
    if (this.database && this.database.isOpen) {
      return this.database;
    }

    try {
      this.database = new DatabaseSync(this.dbPath, this.config);
      console.log(`Connected to database: ${this.dbPath}`);
      return this.database;
    } catch (error) {
      console.error("Failed to connect to database:", error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.database && this.database.isOpen) {
      this.database.close();
      this.database = null;
      console.log("Database connection closed");
    }
  }

  getDatabase(): DatabaseSync {
    if (!this.database || !this.database.isOpen) {
      return this.connect();
    }
    return this.database;
  }

  exec(sql: string): void {
    const db = this.getDatabase();
    try {
      db.exec(sql);
    } catch (error) {
      console.error("Error executing SQL:", error);
      throw error;
    }
  }

  query(sql: string, ...params: SQLInputValue[]): Record<string, SQLOutputValue>[] {
    const db = this.getDatabase();
    try {
      return db.prepare(sql).all(...params);
    } catch (error) {
      console.error("Error executing SQL:", error);
      throw error;
    }
  }

  insert(table: string, columns: string[], paramsArray: SQLInputValue[][]): void {
    if (paramsArray.length === 0) return;

    const db = this.getDatabase();
    try {
      const insert = db.prepare(`
        INSERT INTO ${table} (${columns.join(", ")})
        VALUES (${Array(columns.length).fill("?").join(", ")});
      `);
      for (const params of paramsArray) {
        insert.run(...params);
      }
    } catch (error) {
      console.error("Error executing bulk insert:", error);
      throw error;
    }
  }

  beginTransaction(): void {
    const db = this.getDatabase();
    db.exec(`BEGIN TRANSACTION`);
  }

  commitTransaction(): void {
    const db = this.getDatabase();
    db.exec(`COMMIT`);
  }

  async withTransaction(callback: () => Promise<void>): Promise<void> {
    this.beginTransaction();
    await callback();
    this.commitTransaction();
  }

  /**
   * Disposes of the database connection (for use with try-with-resources pattern)
   */
  [Symbol.dispose](): void {
    this.disconnect();
  }
}

// Export a singleton instance
export const db = new Database();
