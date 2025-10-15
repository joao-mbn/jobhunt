import { existsSync, mkdirSync } from "fs";
import type {
  DatabaseSyncOptions,
  SQLInputValue,
  SQLOutputValue,
} from "node:sqlite";
import { DatabaseSync } from "node:sqlite";
import { join } from "path";
import { buildPlaceholders } from "./utils.ts";

export class Database {
  private database: DatabaseSync | null = null;
  private dbPath: string;
  private config: DatabaseSyncOptions;

  constructor(config?: DatabaseSyncOptions, path?: string) {
    this.config = { timeout: 5000, ...config };

    this.dbPath = path || process.env.DB_PATH;
    if (!this.dbPath) {
      throw new Error("DB_PATH is not set");
    }

    this.ensureDataDirectory();
  }

  private ensureDataDirectory(): void {
    const dir = join(process.cwd(), this.dbPath, "..");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  connect(): DatabaseSync {
    if (this.isConnected) {
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
    if (this.isConnected) {
      this.database.close();
      console.log("Database connection closed");
    }
  }

  getDatabase(): DatabaseSync {
    if (!this.isConnected) {
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

  query(
    sql: string,
    ...params: SQLInputValue[]
  ): Record<string, SQLOutputValue>[] {
    const db = this.getDatabase();
    try {
      return db.prepare(sql).all(...params);
    } catch (error) {
      console.error("Error executing SQL:", error);
      throw error;
    }
  }

  insert(
    table: string,
    columns: string[],
    paramsArray: SQLInputValue[][],
  ): void {
    if (paramsArray.length === 0) return;

    const db = this.getDatabase();
    try {
      const insert = db.prepare(`
        INSERT INTO ${table} (${columns.join(", ")})
        VALUES ${buildPlaceholders(columns)};
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

  get isConnected(): boolean {
    return this.database?.isOpen ?? false;
  }
}

export const db = new Database();
