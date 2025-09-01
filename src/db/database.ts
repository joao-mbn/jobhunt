import { existsSync, mkdirSync } from "fs";
import { DatabaseSync, type DatabaseSyncOptions } from "node:sqlite";
import { join } from "path";

class DatabaseManager {
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

  /**
   * Disposes of the database connection (for use with try-with-resources pattern)
   */
  [Symbol.dispose](): void {
    this.disconnect();
  }
}

// Export a singleton instance
export const db = new DatabaseManager();
