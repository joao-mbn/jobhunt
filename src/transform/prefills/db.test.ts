import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/database.ts";
import { setupDb, teardownDb } from "../../db/test-utils.ts";
import { insertNewEnhancedJobs } from "../../transform/enhance/db.ts";
import { fromDBPrefillsToPrefills } from "../../types/converters/schema-to-job.ts";
import type { DBPrefills } from "../../types/definitions/schema.ts";
import { isDBPrefills } from "../../types/validators/schema.ts";
import { MIN_RELEVANCE_SCORE } from "../../utils/constants.ts";
import {
  generateEnhancedJobs,
  generatePrefills,
} from "../../utils/test-utils.ts";
import {
  createPrefillsResultSuccess,
  createTransformResultSuccess,
} from "../utils.ts";
import {
  insertNewPrefills,
  queryEnhancedJobsWithoutPrefills,
  updateFailedPrefills,
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

describe("queryEnhancedJobsWithoutPrefills", () => {
  it("should return empty array when no enhanced jobs exist", () => {
    const result = queryEnhancedJobsWithoutPrefills(testDb);
    expect(result).toEqual([]);
  });

  it("should return jobs with fail_count <= MAX_FAIL_COUNT and filter out jobs exceeding limit", () => {
    const enhancedJobs = generateEnhancedJobs(4, "linkedin");
    insertNewEnhancedJobs(
      testDb,
      enhancedJobs.map(createTransformResultSuccess),
    );

    testDb.query(
      "UPDATE enhanced_jobs SET fail_count = 0 WHERE job_id = 'linkedin-1'",
    );
    testDb.query(
      "UPDATE enhanced_jobs SET fail_count = 2 WHERE job_id = 'linkedin-2'",
    );
    testDb.query(
      "UPDATE enhanced_jobs SET fail_count = 3 WHERE job_id = 'linkedin-3'",
    );
    testDb.query(
      "UPDATE enhanced_jobs SET fail_count = 4 WHERE job_id = 'linkedin-4'",
    );

    const result = queryEnhancedJobsWithoutPrefills(testDb);
    expect(result).toHaveLength(3);

    const jobIds = result.map((job) => job.jobId).sort();
    expect(jobIds).toEqual(["linkedin-1", "linkedin-2", "linkedin-3"]);
  });

  it("should return maximum of 5 jobs when more exist", () => {
    const enhancedJobs = generateEnhancedJobs(8, "linkedin");
    insertNewEnhancedJobs(
      testDb,
      enhancedJobs.map(createTransformResultSuccess),
    );

    const result = queryEnhancedJobsWithoutPrefills(testDb);
    expect(result).toHaveLength(5);
  });

  it("should order results by created_at ASC (oldest first)", () => {
    const enhancedJobs = generateEnhancedJobs(3, "linkedin");
    insertNewEnhancedJobs(
      testDb,
      enhancedJobs.map(createTransformResultSuccess),
    );

    testDb.query(
      "UPDATE enhanced_jobs SET created_at = '2024-01-01 10:00:00' WHERE job_id = 'linkedin-1'",
    );
    testDb.query(
      "UPDATE enhanced_jobs SET created_at = '2024-01-01 08:00:00' WHERE job_id = 'linkedin-2'",
    );
    testDb.query(
      "UPDATE enhanced_jobs SET created_at = '2024-01-01 12:00:00' WHERE job_id = 'linkedin-3'",
    );

    const result = queryEnhancedJobsWithoutPrefills(testDb);
    expect(result).toHaveLength(3);

    expect(result[0].jobId).toBe("linkedin-2");
    expect(result[1].jobId).toBe("linkedin-1");
    expect(result[2].jobId).toBe("linkedin-3");
  });

  it("should filter out jobs that already have prefills", () => {
    const enhancedJobs = generateEnhancedJobs(3, "linkedin");
    insertNewEnhancedJobs(
      testDb,
      enhancedJobs.map(createTransformResultSuccess),
    );

    testDb.query(
      "INSERT INTO prefills (enhanced_job_id, cover_letter) VALUES ('linkedin-1', 'Test cover letter')",
    );

    const result = queryEnhancedJobsWithoutPrefills(testDb);
    expect(result).toHaveLength(2);

    const jobIds = result.map((job) => job.jobId).sort();
    expect(jobIds).toEqual(["linkedin-2", "linkedin-3"]);
  });

  it("should filter out jobs with relevance_score < MIN_RELEVANCE_SCORE", () => {
    const enhancedJobs = generateEnhancedJobs(3, "linkedin");
    insertNewEnhancedJobs(
      testDb,
      enhancedJobs.map(createTransformResultSuccess),
    );

    testDb.query(
      `UPDATE enhanced_jobs SET relevance_score = ${MIN_RELEVANCE_SCORE - 1} WHERE job_id = 'linkedin-1'`,
    );
    testDb.query(
      `UPDATE enhanced_jobs SET relevance_score = ${MIN_RELEVANCE_SCORE} WHERE job_id = 'linkedin-2'`,
    );
    testDb.query(
      `UPDATE enhanced_jobs SET relevance_score = ${MIN_RELEVANCE_SCORE + 1} WHERE job_id = 'linkedin-3'`,
    );

    const result = queryEnhancedJobsWithoutPrefills(testDb);
    expect(result).toHaveLength(2);

    const jobIds = result.map((job) => job.jobId).sort();
    expect(jobIds).toEqual(["linkedin-2", "linkedin-3"]);
  });

  it("should filter out jobs with uploaded_to_sheet = 1", () => {
    const enhancedJobs = generateEnhancedJobs(3, "linkedin");
    insertNewEnhancedJobs(
      testDb,
      enhancedJobs.map(createTransformResultSuccess),
    );

    testDb.query(
      "UPDATE enhanced_jobs SET uploaded_to_sheet = 1 WHERE job_id = 'linkedin-1'",
    );

    const result = queryEnhancedJobsWithoutPrefills(testDb);
    expect(result).toHaveLength(2);

    const jobIds = result.map((job) => job.jobId).sort();
    expect(jobIds).toEqual(["linkedin-2", "linkedin-3"]);
  });

  it("should combine multiple filters correctly", () => {
    const enhancedJobs = generateEnhancedJobs(5, "linkedin");
    insertNewEnhancedJobs(
      testDb,
      enhancedJobs.map(createTransformResultSuccess),
    );

    // Job 1: Has prefills (should be filtered out)
    testDb.query(
      "INSERT INTO prefills (enhanced_job_id, cover_letter) VALUES ('linkedin-1', 'Test cover letter')",
    );

    // Job 2: Low relevance score (should be filtered out)
    testDb.query(
      "UPDATE enhanced_jobs SET relevance_score = 20 WHERE job_id = 'linkedin-2'",
    );

    // Job 3: Uploaded to sheet (should be filtered out)
    testDb.query(
      "UPDATE enhanced_jobs SET uploaded_to_sheet = 1 WHERE job_id = 'linkedin-3'",
    );

    // Job 4: High fail count (should be filtered out)
    testDb.query(
      "UPDATE enhanced_jobs SET fail_count = 4 WHERE job_id = 'linkedin-4'",
    );

    // Job 5: Should pass all filters
    testDb.query(
      "UPDATE enhanced_jobs SET relevance_score = 80, uploaded_to_sheet = 0, fail_count = 1 WHERE job_id = 'linkedin-5'",
    );

    const result = queryEnhancedJobsWithoutPrefills(testDb);
    expect(result).toHaveLength(1);
    expect(result[0].jobId).toBe("linkedin-5");
  });
});

describe("updateFailedPrefills", () => {
  it("should do nothing when empty array is provided", () => {
    const enhancedJobs = generateEnhancedJobs(2, "linkedin");
    insertNewEnhancedJobs(
      testDb,
      enhancedJobs.map(createTransformResultSuccess),
    );

    const initialFailCounts = testDb.query(
      "SELECT job_id, fail_count FROM enhanced_jobs ORDER BY job_id",
    );

    updateFailedPrefills(testDb, []);

    const finalFailCounts = testDb.query(
      "SELECT job_id, fail_count FROM enhanced_jobs ORDER BY job_id",
    );

    expect(finalFailCounts).toEqual(initialFailCounts);
  });

  it("should increment fail_count for failed jobs and not affect others", () => {
    const enhancedJobs = generateEnhancedJobs(3, "linkedin");
    insertNewEnhancedJobs(
      testDb,
      enhancedJobs.map(createTransformResultSuccess),
    );

    const failedJobIds = ["linkedin-1", "linkedin-3"];

    updateFailedPrefills(testDb, failedJobIds);

    const results = testDb.query(
      "SELECT job_id, fail_count FROM enhanced_jobs ORDER BY job_id",
    );
    expect(results[0].fail_count).toBe(1);
    expect(results[1].fail_count).toBe(0);
    expect(results[2].fail_count).toBe(1);
  });

  it("should correctly increment fail_count from various starting values", () => {
    const enhancedJobs = generateEnhancedJobs(3, "linkedin");
    insertNewEnhancedJobs(
      testDb,
      enhancedJobs.map(createTransformResultSuccess),
    );

    testDb.query(
      "UPDATE enhanced_jobs SET fail_count = 0 WHERE job_id = 'linkedin-1'",
    );
    testDb.query(
      "UPDATE enhanced_jobs SET fail_count = 1 WHERE job_id = 'linkedin-2'",
    );
    testDb.query(
      "UPDATE enhanced_jobs SET fail_count = 2 WHERE job_id = 'linkedin-3'",
    );

    const failedJobIds = ["linkedin-1", "linkedin-2", "linkedin-3"];

    updateFailedPrefills(testDb, failedJobIds);

    const results = testDb.query(
      "SELECT job_id, fail_count FROM enhanced_jobs ORDER BY job_id",
    );
    expect(results[0].fail_count).toBe(1);
    expect(results[1].fail_count).toBe(2);
    expect(results[2].fail_count).toBe(3);
  });
});

describe("insertNewPrefills", () => {
  it("should do nothing when empty array is provided", () => {
    const initialCount = testDb.query(
      "SELECT COUNT(*) as count FROM prefills",
    )[0].count;

    insertNewPrefills(testDb, []);

    const finalCount = testDb.query("SELECT COUNT(*) as count FROM prefills")[0]
      .count;

    expect(finalCount).toBe(initialCount);
  });

  it("should insert all new prefills", () => {
    const enhancedJobs = generateEnhancedJobs(2, "linkedin");
    insertNewEnhancedJobs(
      testDb,
      enhancedJobs.map(createTransformResultSuccess),
    );

    const successfulResults = generatePrefills(2, "linkedin").map(
      createPrefillsResultSuccess,
    );

    insertNewPrefills(testDb, successfulResults);

    const insertedPrefills = testDb.query(
      "SELECT enhanced_job_id, cover_letter FROM prefills ORDER BY enhanced_job_id",
    );
    expect(insertedPrefills).toHaveLength(2);
    expect(insertedPrefills[0].enhanced_job_id).toBe("linkedin-1");
    expect(insertedPrefills[0].cover_letter).toBe("Test cover letter 1");
    expect(insertedPrefills[1].enhanced_job_id).toBe("linkedin-2");
    expect(insertedPrefills[1].cover_letter).toBe("Test cover letter 2");
  });

  it("should filter out existing prefills and only insert new ones", () => {
    const enhancedJobs = generateEnhancedJobs(2, "linkedin");
    insertNewEnhancedJobs(
      testDb,
      enhancedJobs.map(createTransformResultSuccess),
    );

    const existingCoverLetter = "Existing cover letter";
    testDb.query(
      `INSERT INTO prefills (enhanced_job_id, cover_letter) VALUES ('linkedin-1', '${existingCoverLetter}')`,
    );
    const successfulResults = generatePrefills(2, "linkedin").map(
      createPrefillsResultSuccess,
    );

    insertNewPrefills(testDb, successfulResults);

    const allPrefills = testDb.query(
      "SELECT enhanced_job_id, cover_letter FROM prefills ORDER BY enhanced_job_id",
    );
    expect(allPrefills).toHaveLength(2);
    expect(allPrefills[0].enhanced_job_id).toBe("linkedin-1");
    expect(allPrefills[0].cover_letter).toBe(existingCoverLetter);
    expect(allPrefills[1].enhanced_job_id).toBe(
      successfulResults[1].enhancedJobId,
    );
    expect(allPrefills[1].cover_letter).toBe(
      successfulResults[1].prefills.coverLetter,
    );
  });

  it("should correctly insert all properties and add database-generated fields", () => {
    const enhancedJobs = generateEnhancedJobs(1, "linkedin");
    insertNewEnhancedJobs(
      testDb,
      enhancedJobs.map(createTransformResultSuccess),
    );

    const prefills = generatePrefills(1, "linkedin")[0];
    const successfulResult = createPrefillsResultSuccess(prefills);

    expect(prefills.id).toBeUndefined();
    expect(prefills.createdAt).toBeUndefined();
    expect(prefills.updatedAt).toBeUndefined();

    insertNewPrefills(testDb, [successfulResult]);

    const insertedDBPrefills = testDb.query(
      "SELECT * FROM prefills ORDER BY enhanced_job_id",
    );

    const dbPrefill = (
      insertedDBPrefills.filter(isDBPrefills) as unknown as DBPrefills[]
    ).map(fromDBPrefillsToPrefills)[0];

    expect(dbPrefill.enhancedJobId).toBe(prefills.enhancedJobId);
    expect(dbPrefill.coverLetter).toBe(prefills.coverLetter);
    expect(dbPrefill.id).toBeDefined();
    expect(dbPrefill.createdAt).toBeDefined();
    expect(dbPrefill.updatedAt).toBeDefined();
  });
});
