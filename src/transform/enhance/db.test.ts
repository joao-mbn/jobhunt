import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/database.ts";
import { setupDb, teardownDb } from "../../db/test-utils.ts";
import { insertRawJobs } from "../../extract/db.ts";
import { insertNewCleanJobs } from "../../transform/clean/db.ts";
import { generateCleanJobs, generateRawJobs } from "../../utils/test-utils.ts";
import { createTransformResultSuccess } from "../utils.ts";
import { queryCleanJobs } from "./db.ts";

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

describe("queryCleanJobs", () => {
  it("should return empty array when no clean jobs exist", () => {
    const result = queryCleanJobs(testDb);
    expect(result).toEqual([]);
  });

  it("should return jobs with fail_count <= MAX_FAIL_COUNT and filter out jobs with fail_count > MAX_FAIL_COUNT", () => {
    const rawJobs = generateRawJobs(4, "linkedin");
    insertRawJobs(testDb, rawJobs);

    const cleanJobs = generateCleanJobs(4, "linkedin");
    insertNewCleanJobs(testDb, cleanJobs.map(createTransformResultSuccess));

    testDb.query(
      "UPDATE clean_jobs SET fail_count = 0 WHERE job_id = 'linkedin-1'",
    );
    testDb.query(
      "UPDATE clean_jobs SET fail_count = 2 WHERE job_id = 'linkedin-2'",
    );
    testDb.query(
      "UPDATE clean_jobs SET fail_count = 3 WHERE job_id = 'linkedin-3'",
    );
    testDb.query(
      "UPDATE clean_jobs SET fail_count = 4 WHERE job_id = 'linkedin-4'",
    );

    const result = queryCleanJobs(testDb);
    expect(result).toHaveLength(3);

    const jobIds = result.map((job) => job.jobId).sort();
    expect(jobIds).toEqual(["linkedin-1", "linkedin-2", "linkedin-3"]);
  });

  it("should return maximum of 5 jobs when more exist", () => {
    const rawJobs = generateRawJobs(8, "linkedin");
    insertRawJobs(testDb, rawJobs);

    const cleanJobs = generateCleanJobs(8, "linkedin");
    insertNewCleanJobs(testDb, cleanJobs.map(createTransformResultSuccess));

    const result = queryCleanJobs(testDb);
    expect(result).toHaveLength(5);
  });

  it("should order results by created_at ASC (oldest first)", () => {
    const rawJobs = generateRawJobs(3, "linkedin");
    insertRawJobs(testDb, rawJobs);

    const cleanJobs = generateCleanJobs(3, "linkedin");
    insertNewCleanJobs(testDb, cleanJobs.map(createTransformResultSuccess));

    testDb.query(
      "UPDATE clean_jobs SET created_at = '2024-01-01 10:00:00' WHERE job_id = 'linkedin-1'",
    );
    testDb.query(
      "UPDATE clean_jobs SET created_at = '2024-01-01 08:00:00' WHERE job_id = 'linkedin-2'",
    );
    testDb.query(
      "UPDATE clean_jobs SET created_at = '2024-01-01 12:00:00' WHERE job_id = 'linkedin-3'",
    );

    const result = queryCleanJobs(testDb);
    expect(result).toHaveLength(3);

    expect(result[0].jobId).toBe("linkedin-2");
    expect(result[1].jobId).toBe("linkedin-1");
    expect(result[2].jobId).toBe("linkedin-3");
  });
});

describe("updateFailedEnhancement", () => {
  // Test cases will be added here
});

describe("deleteEnhancedCleanJobs", () => {
  // Test cases will be added here
});

describe("insertNewEnhancedJobs", () => {
  // Test cases will be added here
});
