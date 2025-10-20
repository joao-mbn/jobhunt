import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../db/database.ts";
import { setupDb, teardownDb } from "../db/test-utils.ts";
import { insertNewCleanJobs } from "../transform/clean/db.ts";
import { insertNewEnhancedJobs } from "../transform/enhance/db.ts";
import { createTransformResultSuccess } from "../transform/utils.ts";
import {
  generateCleanJobs,
  generateEnhancedJobs,
  generateRawJobs,
} from "../utils/test-utils.ts";
import { insertRawJobs, queryJobIds } from "./db.ts";

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

describe("queryJobIds", () => {
  it("should return empty array when no tables have job IDs", () => {
    const result = queryJobIds(testDb);
    expect(result).toEqual([]);
  });

  it("should return job IDs from raw_jobs table only", () => {
    const testJobs = generateRawJobs(2);

    insertRawJobs(testDb, testJobs);

    const result = queryJobIds(testDb);
    expect(result).toHaveLength(2);
    expect(result.map((row) => row.job_id)).toContain("linkedin-1");
    expect(result.map((row) => row.job_id)).toContain("linkedin-2");
  });

  it("should return job IDs from clean_jobs table only", () => {
    const testJobs = generateCleanJobs(2);

    const successfulResults = testJobs.map(createTransformResultSuccess);
    insertNewCleanJobs(testDb, successfulResults);

    const result = queryJobIds(testDb);
    expect(result).toHaveLength(2);
    expect(result.map((row) => row.job_id)).toContain("linkedin-1");
    expect(result.map((row) => row.job_id)).toContain("linkedin-2");
  });

  it("should return job IDs from enhanced_jobs table only", () => {
    const testJobs = generateEnhancedJobs(2);

    const successfulResults = testJobs.map(createTransformResultSuccess);
    insertNewEnhancedJobs(testDb, successfulResults);

    const result = queryJobIds(testDb);
    expect(result).toHaveLength(2);
    expect(result.map((row) => row.job_id)).toContain("linkedin-1");
    expect(result.map((row) => row.job_id)).toContain("linkedin-2");
  });

  it("should return unique job IDs from multiple tables", () => {
    const rawJob = generateRawJobs(1)[0];
    rawJob.jobId = "job-1";
    insertRawJobs(testDb, [rawJob]);

    const cleanJob = generateCleanJobs(1)[0];
    cleanJob.jobId = "job-2";
    const cleanResult = createTransformResultSuccess(cleanJob);
    insertNewCleanJobs(testDb, [cleanResult]);

    const enhancedJob = generateEnhancedJobs(1)[0];
    enhancedJob.jobId = "job-3";
    const enhancedResult = createTransformResultSuccess(enhancedJob);
    insertNewEnhancedJobs(testDb, [enhancedResult]);

    const result = queryJobIds(testDb);
    expect(result).toHaveLength(3);
    expect(result.map((row) => row.job_id)).toEqual(
      expect.arrayContaining(["job-1", "job-2", "job-3"]),
    );
  });

  it("should handle duplicate job IDs across tables (UNION removes duplicates)", () => {
    const duplicateJobId = "duplicate-job";

    const rawJob = generateRawJobs(1)[0];
    rawJob.jobId = duplicateJobId;
    insertRawJobs(testDb, [rawJob]);

    const cleanJob = generateCleanJobs(1)[0];
    cleanJob.jobId = duplicateJobId;
    const cleanResult = createTransformResultSuccess(cleanJob);
    insertNewCleanJobs(testDb, [cleanResult]);

    const enhancedJob = generateEnhancedJobs(1)[0];
    enhancedJob.jobId = duplicateJobId;
    const enhancedResult = createTransformResultSuccess(enhancedJob);
    insertNewEnhancedJobs(testDb, [enhancedResult]);

    const result = queryJobIds(testDb);
    expect(result).toHaveLength(1);
    expect(result[0].job_id).toBe("duplicate-job");
  });
});

describe("insertRawJobs", () => {
  it("should handle empty array without error", () => {
    expect(() => insertRawJobs(testDb, [])).not.toThrow();

    const result = testDb.query("SELECT COUNT(*) as count FROM raw_jobs");
    expect(Number(result[0].count)).toBe(0);
  });

  it("should insert single job successfully", () => {
    const testJobs = generateRawJobs(1);
    insertRawJobs(testDb, testJobs);

    const result = testDb.query(
      "SELECT * FROM raw_jobs WHERE job_id = ?",
      testJobs[0].jobId,
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(testJobs[0].name);
    expect(result[0].job_id).toBe(testJobs[0].jobId);
    expect(result[0].url).toBe(testJobs[0].url);
    expect(result[0].source).toBe(testJobs[0].source);
    expect(Number(result[0].fail_count)).toBe(0);
    expect(JSON.parse(String(result[0].details))).toEqual(testJobs[0].details);
  });

  it("should insert multiple jobs successfully", () => {
    const testJobs = generateRawJobs(2);
    insertRawJobs(testDb, testJobs);

    const result = testDb.query("SELECT * FROM raw_jobs ORDER BY job_id");
    expect(result).toHaveLength(2);

    expect(result[0].name).toBe(testJobs[0].name);
    expect(result[0].job_id).toBe(testJobs[0].jobId);
    expect(result[0].url).toBe(testJobs[0].url);
    expect(result[0].source).toBe(testJobs[0].source);
    expect(Number(result[0].fail_count)).toBe(0);
    expect(JSON.parse(String(result[0].details))).toEqual(testJobs[0].details);

    expect(result[1].name).toBe(testJobs[1].name);
    expect(result[1].job_id).toBe(testJobs[1].jobId);
    expect(result[1].url).toBe(testJobs[1].url);
    expect(result[1].source).toBe(testJobs[1].source);
    expect(Number(result[1].fail_count)).toBe(0);
    expect(JSON.parse(String(result[1].details))).toEqual(testJobs[1].details);
  });

  it("should throw error when trying to insert duplicate job_id", () => {
    const testJob = generateRawJobs(1)[0];
    insertRawJobs(testDb, [testJob]);

    expect(() => insertRawJobs(testDb, [testJob])).toThrow();
  });

  it("should handle jobs with complex details object", () => {
    const complexDetails = {
      company: "Complex Corp",
      location: "Remote",
      salary: { min: 80000, max: 120000, currency: "USD" },
      benefits: ["health", "dental", "401k"],
      requirements: {
        experience: "3+ years",
        skills: ["TypeScript", "React", "Node.js"],
        education: "Bachelor's degree",
      },
      metadata: {
        posted: "2024-01-15",
        expires: "2024-02-15",
        tags: ["senior", "full-time", "remote-first"],
      },
    };

    const testJob = generateRawJobs(1)[0];
    testJob.details = complexDetails;

    insertRawJobs(testDb, [testJob]);

    const result = testDb.query(
      "SELECT * FROM raw_jobs WHERE job_id = ?",
      testJob.jobId,
    );
    expect(result).toHaveLength(1);
    expect(JSON.parse(String(result[0].details))).toEqual(complexDetails);
  });

  it("should add database-generated properties during insertion", async () => {
    const jobs = generateRawJobs(1, "linkedin");
    const job = jobs[0];

    expect(job.id).toBeUndefined();
    expect(job.createdAt).toBeUndefined();
    expect(job.updatedAt).toBeUndefined();
    expect(job.failCount).toBeUndefined();

    insertRawJobs(testDb, [job]);

    const result = testDb.query("SELECT * FROM raw_jobs");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeDefined();
    expect(result[0].updated_at).toBeDefined();
    expect(result[0].fail_count).toBe(0);
  });
});
