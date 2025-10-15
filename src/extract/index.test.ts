import { afterEach, beforeEach, expect, it } from "vitest";
import type { Database } from "../db/database.ts";
import { setupDb, teardownDb } from "../db/test-utils.ts";
import { insertRawJobs } from "./db.ts";
import { main } from "./index.ts";
import {
  ErrorThrowingScraper,
  generateJobs,
  HappyScraper,
} from "./scrapers/mock.ts";

let testDb: Database;
let testDbPath: string;

beforeEach(async () => {
  const setup = await setupDb();
  testDb = setup.db;
  testDbPath = setup.dbPath;
});

afterEach(() => {
  teardownDb(testDb, testDbPath);
});

it("should successfully extract and store new jobs", async () => {
  const scraper1 = new HappyScraper(generateJobs(1, "linkedin"));
  const scraper2 = new HappyScraper(generateJobs(2, "builtin"));
  const scrapers = [scraper1, scraper2];

  await main(testDb, scrapers);

  const result = testDb.query("SELECT job_id FROM raw_jobs ORDER BY job_id");
  expect(result).toHaveLength(3);
  expect(result[0].job_id).toBe("builtin-1");
  expect(result[1].job_id).toBe("builtin-2");
  expect(result[2].job_id).toBe("linkedin-1");
});

it("should add database-generated properties during insertion", async () => {
  const jobs = generateJobs(1, "linkedin");
  const job = jobs[0];

  expect(job.id).toBeUndefined();
  expect(job.createdAt).toBeUndefined();
  expect(job.updatedAt).toBeUndefined();
  expect(job.failCount).toBeUndefined();

  const scraper = new HappyScraper(jobs);
  await main(testDb, [scraper]);

  const result = testDb.query("SELECT * FROM raw_jobs");
  expect(result).toHaveLength(1);

  const insertedJob = result[0];
  expect(insertedJob.id).toBeDefined();
  expect(insertedJob.created_at).toBeDefined();
  expect(insertedJob.updated_at).toBeDefined();
  expect(insertedJob.fail_count).toBe(0);
});

it("should filter out jobs already in the database", async () => {
  const existingJobs = generateJobs(2, "linkedin");
  const existingJobs2 = generateJobs(1, "builtin");

  insertRawJobs(testDb, [...existingJobs, ...existingJobs2]);

  const initialResult = testDb.query("SELECT job_id FROM raw_jobs");
  expect(initialResult).toHaveLength(3);

  const newJobs = generateJobs(2, "levels");
  const mixedJobs = [...existingJobs, ...newJobs];

  const scraper = new HappyScraper(mixedJobs);

  await main(testDb, [scraper]);

  const result = testDb.query("SELECT job_id FROM raw_jobs ORDER BY job_id");
  expect(result).toHaveLength(5);

  const jobIds = result.map((row) => row.job_id);
  expect(jobIds).toContain("levels-1");
  expect(jobIds).toContain("levels-2");
  expect(jobIds).toContain("builtin-1");
  expect(jobIds).toContain("linkedin-1");
  expect(jobIds).toContain("linkedin-2");
});

it("should handle multiple scrapers with varying results", async () => {
  const scraper1 = new HappyScraper(generateJobs(5, "linkedin"));
  const scraper2 = new HappyScraper(generateJobs(3, "builtin"));
  const scraper3 = new HappyScraper([]);
  const scrapers = [scraper1, scraper2, scraper3];

  await main(testDb, scrapers);

  const result = testDb.query("SELECT job_id FROM raw_jobs ORDER BY job_id");
  expect(result).toHaveLength(8);

  const jobIds = result.map((row) => row.job_id);
  expect(jobIds).toContain("builtin-1");
  expect(jobIds).toContain("builtin-2");
  expect(jobIds).toContain("builtin-3");
  expect(jobIds).toContain("linkedin-1");
  expect(jobIds).toContain("linkedin-2");
  expect(jobIds).toContain("linkedin-3");
  expect(jobIds).toContain("linkedin-4");
  expect(jobIds).toContain("linkedin-5");
});

it("should handle scrapers returning all duplicate jobs", async () => {
  const existingJobs = generateJobs(2, "linkedin");
  insertRawJobs(testDb, existingJobs);

  const initialResult = testDb.query("SELECT job_id FROM raw_jobs");
  expect(initialResult).toHaveLength(2);

  const scraper = new HappyScraper(existingJobs);

  await main(testDb, [scraper]);

  const result = testDb.query("SELECT job_id FROM raw_jobs ORDER BY job_id");
  expect(result).toHaveLength(2);

  const jobIds = result.map((row) => row.job_id);
  expect(jobIds).toContain("linkedin-1");
  expect(jobIds).toContain("linkedin-2");
});

it("should handle empty results from all scrapers", async () => {
  const scraper1 = new HappyScraper([]);
  const scraper2 = new HappyScraper([]);
  const scrapers = [scraper1, scraper2];

  await main(testDb, scrapers);

  const result = testDb.query("SELECT job_id FROM raw_jobs");
  expect(result).toHaveLength(0);
});

it("should handle large batch of jobs", async () => {
  const scraper = new HappyScraper(generateJobs(500, "linkedin"));

  await main(testDb, [scraper]);

  const result = testDb.query("SELECT job_id FROM raw_jobs");
  expect(result).toHaveLength(500);
});

it("should disconnect database when scraper throws error", async () => {
  const scraper = new ErrorThrowingScraper("Scraper failure");

  await main(testDb, [scraper]);

  expect(testDb.isConnected).toBe(false);
});

it("should stop inserting jobs after first constraint violation", async () => {
  const jobs = generateJobs(3, "linkedin");

  delete jobs[1].jobId;

  const scraper = new HappyScraper(jobs);

  const initialResult = testDb.query("SELECT job_id FROM raw_jobs");
  expect(initialResult).toHaveLength(0);

  await main(testDb, [scraper]);

  const finalResult = testDb.query(
    "SELECT job_id FROM raw_jobs ORDER BY job_id",
  );
  expect(finalResult).toHaveLength(1);
  expect(finalResult[0].job_id).toBe("linkedin-1");
});
