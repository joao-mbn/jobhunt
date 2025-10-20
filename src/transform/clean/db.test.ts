import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/database.ts";
import { setupDb, teardownDb } from "../../db/test-utils.ts";
import { insertRawJobs } from "../../extract/db.ts";
import { fromDBCleanJobToCleanJob } from "../../types/converters/schema-to-job.ts";
import type { DBCleanJob } from "../../types/definitions/schema.ts";
import { isDBCleanJob } from "../../types/validators/schema.ts";
import { generateCleanJobs, generateRawJobs } from "../../utils/test-utils.ts";
import { createTransformResultSuccess } from "../utils.ts";
import {
  deleteCleanedRawJobs,
  insertNewCleanJobs,
  queryRawJobs,
  updateFailedCleaning,
} from "./db.ts";

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

describe("queryRawJobs", () => {
  it("should return empty array when no raw jobs exist", () => {
    const result = queryRawJobs(testDb);
    expect(result).toEqual([]);
  });

  it("should return jobs with fail_count <= MAX_FAIL_COUNT and filter out jobs with fail_count > MAX_FAIL_COUNT", () => {
    const jobs = generateRawJobs(4, "linkedin");

    insertRawJobs(testDb, jobs);

    testDb.query(
      "UPDATE raw_jobs SET fail_count = 0 WHERE job_id = 'linkedin-1'",
    );
    testDb.query(
      "UPDATE raw_jobs SET fail_count = 2 WHERE job_id = 'linkedin-2'",
    );
    testDb.query(
      "UPDATE raw_jobs SET fail_count = 3 WHERE job_id = 'linkedin-3'",
    );
    testDb.query(
      "UPDATE raw_jobs SET fail_count = 4 WHERE job_id = 'linkedin-4'",
    );

    const result = queryRawJobs(testDb);
    expect(result).toHaveLength(3);

    const jobIds = result.map((job) => job.jobId).sort();
    expect(jobIds).toEqual(["linkedin-1", "linkedin-2", "linkedin-3"]);
  });

  it("should return maximum of 5 jobs when more exist", () => {
    const jobs = generateRawJobs(8, "linkedin");

    insertRawJobs(testDb, jobs);

    const result = queryRawJobs(testDb);
    expect(result).toHaveLength(5);
  });

  it("should order results by created_at ASC (oldest first)", () => {
    const jobs = generateRawJobs(3, "linkedin");

    insertRawJobs(testDb, jobs);

    testDb.query(
      "UPDATE raw_jobs SET created_at = '2024-01-01 10:00:00' WHERE job_id = 'linkedin-1'",
    );
    testDb.query(
      "UPDATE raw_jobs SET created_at = '2024-01-01 08:00:00' WHERE job_id = 'linkedin-2'",
    );
    testDb.query(
      "UPDATE raw_jobs SET created_at = '2024-01-01 12:00:00' WHERE job_id = 'linkedin-3'",
    );

    const result = queryRawJobs(testDb);
    expect(result).toHaveLength(3);

    expect(result[0].jobId).toBe("linkedin-2");
    expect(result[1].jobId).toBe("linkedin-1");
    expect(result[2].jobId).toBe("linkedin-3");
  });
});

describe("updateFailedCleaning", () => {
  it("should do nothing when empty array is provided", () => {
    const jobs = generateRawJobs(2, "linkedin");
    insertRawJobs(testDb, jobs);

    const initialFailCounts = testDb.query(
      "SELECT job_id, fail_count FROM raw_jobs ORDER BY job_id",
    );

    updateFailedCleaning(testDb, []);

    const finalFailCounts = testDb.query(
      "SELECT job_id, fail_count FROM raw_jobs ORDER BY job_id",
    );

    expect(finalFailCounts).toEqual(initialFailCounts);
  });

  it("should increment fail_count for failed jobs and not affect others", () => {
    const jobs = generateRawJobs(3, "linkedin");
    insertRawJobs(testDb, jobs);

    const failedJobIds = ["linkedin-1", "linkedin-3"];

    updateFailedCleaning(testDb, failedJobIds);

    const results = testDb.query(
      "SELECT job_id, fail_count FROM raw_jobs ORDER BY job_id",
    );
    expect(results[0].fail_count).toBe(1);
    expect(results[1].fail_count).toBe(0);
    expect(results[2].fail_count).toBe(1);
  });

  it("should correctly increment fail_count from various starting values", () => {
    const jobs = generateRawJobs(3, "linkedin");
    insertRawJobs(testDb, jobs);

    testDb.query(
      "UPDATE raw_jobs SET fail_count = 0 WHERE job_id = 'linkedin-1'",
    );
    testDb.query(
      "UPDATE raw_jobs SET fail_count = 1 WHERE job_id = 'linkedin-2'",
    );
    testDb.query(
      "UPDATE raw_jobs SET fail_count = 2 WHERE job_id = 'linkedin-3'",
    );

    const failedJobIds = ["linkedin-1", "linkedin-2", "linkedin-3"];

    updateFailedCleaning(testDb, failedJobIds);

    const results = testDb.query(
      "SELECT job_id, fail_count FROM raw_jobs ORDER BY job_id",
    );
    expect(results[0].fail_count).toBe(1);
    expect(results[1].fail_count).toBe(2);
    expect(results[2].fail_count).toBe(3);
  });
});

describe("deleteCleanedRawJobs", () => {
  it("should do nothing when empty array is provided", () => {
    const jobs = generateRawJobs(2, "linkedin");
    insertRawJobs(testDb, jobs);

    const initialCount = testDb.query(
      "SELECT COUNT(*) as count FROM raw_jobs",
    )[0].count;

    deleteCleanedRawJobs(testDb, []);

    const finalCount = testDb.query("SELECT COUNT(*) as count FROM raw_jobs")[0]
      .count;

    expect(finalCount).toBe(initialCount);
  });

  it("should delete raw jobs and not delete jobs outside of the list", () => {
    const jobs = generateRawJobs(3, "linkedin");
    insertRawJobs(testDb, jobs);

    const successfulJobIds = ["linkedin-1", "linkedin-3"];

    deleteCleanedRawJobs(testDb, successfulJobIds);

    const remainingJobs = testDb.query(
      "SELECT job_id FROM raw_jobs ORDER BY job_id",
    );
    expect(remainingJobs).toHaveLength(1);
    expect(remainingJobs[0].job_id).toBe("linkedin-2");
  });
});

describe("insertNewCleanJobs", () => {
  it("should do nothing when empty array is provided", () => {
    const initialCount = testDb.query(
      "SELECT COUNT(*) as count FROM clean_jobs",
    )[0].count;

    insertNewCleanJobs(testDb, []);

    const finalCount = testDb.query(
      "SELECT COUNT(*) as count FROM clean_jobs",
    )[0].count;

    expect(finalCount).toBe(initialCount);
  });

  it("should insert all new clean jobs", () => {
    const cleanJobs = generateCleanJobs(2, "linkedin");
    const successfulResults = cleanJobs.map(createTransformResultSuccess);

    insertNewCleanJobs(testDb, successfulResults);

    const insertedJobs = testDb.query(
      "SELECT job_id FROM clean_jobs ORDER BY job_id",
    );
    expect(insertedJobs).toHaveLength(2);
    expect(insertedJobs[0].job_id).toBe("linkedin-1");
    expect(insertedJobs[1].job_id).toBe("linkedin-2");
  });

  it("should filter out existing clean jobs and only insert new ones", () => {
    const existingCleanJob = generateCleanJobs(1, "linkedin")[0];
    const newCleanJob = generateCleanJobs(1, "linkedin")[0];
    newCleanJob.jobId = "linkedin-2";

    insertNewCleanJobs(testDb, [
      createTransformResultSuccess(existingCleanJob),
    ]);

    const successfulResults = [
      createTransformResultSuccess(existingCleanJob),
      createTransformResultSuccess(newCleanJob),
    ];

    insertNewCleanJobs(testDb, successfulResults);

    const allJobs = testDb.query(
      "SELECT job_id FROM clean_jobs ORDER BY job_id",
    );
    expect(allJobs).toHaveLength(2);
    expect(allJobs[0].job_id).toBe("linkedin-1");
    expect(allJobs[1].job_id).toBe("linkedin-2");
  });

  it("should correctly insert all properties and add database-generated fields", () => {
    const cleanJob = generateCleanJobs(1, "linkedin")[0];
    const successfulResult = createTransformResultSuccess(cleanJob);

    expect(cleanJob.id).toBeUndefined();
    expect(cleanJob.createdAt).toBeUndefined();
    expect(cleanJob.updatedAt).toBeUndefined();
    expect(cleanJob.failCount).toBeUndefined();

    insertNewCleanJobs(testDb, [successfulResult]);

    const insertedDBJobs = testDb.query(
      "SELECT * FROM clean_jobs ORDER BY job_id",
    );

    const dbCleanJob = (
      insertedDBJobs.filter(isDBCleanJob) as unknown as DBCleanJob[]
    ).map(fromDBCleanJobToCleanJob)[0];

    for (const key of Object.keys(cleanJob)) {
      expect(dbCleanJob[key]).toEqual(cleanJob[key]);
    }

    expect(dbCleanJob.id).toBeDefined();
    expect(dbCleanJob.createdAt).toBeDefined();
    expect(dbCleanJob.updatedAt).toBeDefined();
    expect(dbCleanJob.failCount).toBe(0);
  });
});
