import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Database } from "../../db/database.ts";
import { setupDb, teardownDb } from "../../db/test-utils.ts";
import { fromDBPrefillsToPrefills } from "../../types/converters/schema-to-job.ts";
import type { DBPrefills } from "../../types/definitions/schema.ts";
import { MAX_FAIL_COUNT, MIN_RELEVANCE_SCORE } from "../../utils/constants.ts";
import { generateEnhancedJobs } from "../../utils/test-utils.ts";
import { insertNewEnhancedJobs } from "../enhance/db.ts";
import { createTransformResultSuccess } from "../utils.ts";
import * as prefillsAI from "./ai.ts";
import * as prefillsDb from "./db.ts";
import { main } from "./index.ts";
import type { AIGeneratedPrefillsInfo } from "./types.ts";

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

function mockGeneratePrefillsWithAI(
  mockImplementation: typeof prefillsAI.generatePrefillsWithAI,
) {
  vi.spyOn(prefillsAI, "generatePrefillsWithAI").mockImplementation(
    mockImplementation,
  );

  return () => vi.spyOn(prefillsAI, "generatePrefillsWithAI").mockRestore();
}

function createSuccessfulPrefillsResponse(): AIGeneratedPrefillsInfo {
  return {
    coverLetter:
      "Dear Hiring Manager,\n\nI am writing to express my interest...",
  };
}

function insertEnhancedJobsForPrefills(
  db: Database,
  count: number,
  source: "linkedin" | "levels" | "builtin" | "indeed" = "linkedin",
) {
  const enhancedJobs = generateEnhancedJobs(count, source);
  insertNewEnhancedJobs(db, enhancedJobs.map(createTransformResultSuccess));
  return enhancedJobs;
}

it("should successfully generate and store prefills for new enhanced jobs", async () => {
  const linkedinJobs = generateEnhancedJobs(1, "linkedin");
  const builtinJobs = generateEnhancedJobs(1, "builtin");
  const levelsJobs = generateEnhancedJobs(1, "levels");
  const indeedJobs = generateEnhancedJobs(1, "indeed");

  const allEnhancedJobs = [
    ...linkedinJobs,
    ...builtinJobs,
    ...levelsJobs,
    ...indeedJobs,
  ];

  const successfulResults = allEnhancedJobs.map(createTransformResultSuccess);
  insertNewEnhancedJobs(testDb, successfulResults);

  const restoreGeneratePrefillsWithAI = mockGeneratePrefillsWithAI(async () =>
    createSuccessfulPrefillsResponse(),
  );

  await main([], testDb);

  restoreGeneratePrefillsWithAI();

  expect(testDb.isConnected).toBe(false);

  const enhancedJobsResult = testDb.query("SELECT job_id FROM enhanced_jobs");
  const prefillsResult = testDb.query("SELECT enhanced_job_id FROM prefills");

  expect(enhancedJobsResult).toHaveLength(4);
  expect(prefillsResult).toHaveLength(4);

  const enhancedJobIds = enhancedJobsResult.map((job) => job.job_id);
  const prefillsJobIds = prefillsResult.map(
    (prefill) => prefill.enhanced_job_id,
  );

  expect(enhancedJobIds).toContain("linkedin-1");
  expect(enhancedJobIds).toContain("builtin-1");
  expect(enhancedJobIds).toContain("levels-1");
  expect(enhancedJobIds).toContain("indeed-1");

  expect(prefillsJobIds).toContain("linkedin-1");
  expect(prefillsJobIds).toContain("builtin-1");
  expect(prefillsJobIds).toContain("levels-1");
  expect(prefillsJobIds).toContain("indeed-1");
});

it("should add database properties to prefills", async () => {
  const enhancedJobs = insertEnhancedJobsForPrefills(testDb, 1, "linkedin");
  const expectedEnhancedJob = enhancedJobs[0];

  const expectedPrefillsInfo = createSuccessfulPrefillsResponse();

  const restoreGeneratePrefillsWithAI = mockGeneratePrefillsWithAI(
    async () => expectedPrefillsInfo,
  );

  await main([], testDb);

  restoreGeneratePrefillsWithAI();

  const dbPrefills = testDb.query(
    "SELECT * FROM prefills WHERE enhanced_job_id = ?",
    "linkedin-1",
  )[0] as unknown as DBPrefills;
  const actualPrefills = fromDBPrefillsToPrefills(dbPrefills);

  expect(actualPrefills.id).toBeDefined();
  expect(actualPrefills.createdAt).toBeDefined();
  expect(actualPrefills.updatedAt).toBeDefined();

  expect(actualPrefills.enhancedJobId).toBe(expectedEnhancedJob.jobId);
  expect(actualPrefills.coverLetter).toBe(expectedPrefillsInfo.coverLetter);
});

it("should only process oldest 5 jobs respecting filters", async () => {
  insertEnhancedJobsForPrefills(testDb, 9, "linkedin");

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  testDb.query(
    `
    UPDATE enhanced_jobs
    SET created_at = ?
    WHERE job_id IN ('linkedin-1', 'linkedin-2', 'linkedin-3', 'linkedin-4', 'linkedin-5')
  `,
    yesterday.toISOString(),
  );

  testDb.query(
    `
    UPDATE enhanced_jobs
    SET created_at = ?, fail_count = ${MAX_FAIL_COUNT + 1}
    WHERE job_id = 'linkedin-6'
  `,
    twoDaysAgo.toISOString(),
  );

  testDb.query(
    `
    UPDATE enhanced_jobs
    SET created_at = ?, relevance_score = ${MIN_RELEVANCE_SCORE - 1}
    WHERE job_id = 'linkedin-7'
  `,
    twoDaysAgo.toISOString(),
  );

  testDb.query(
    `
    UPDATE enhanced_jobs
    SET created_at = ?, uploaded_to_sheet = 1
    WHERE job_id = 'linkedin-8'
  `,
    twoDaysAgo.toISOString(),
  );

  testDb.query(
    `
    UPDATE enhanced_jobs
    SET created_at = ?
    WHERE job_id = 'linkedin-9'
  `,
    twoDaysAgo.toISOString(),
  );
  testDb.query(
    "INSERT INTO prefills (enhanced_job_id, cover_letter) VALUES ('linkedin-9', 'Test cover letter')",
  );

  const restoreGeneratePrefillsWithAI = mockGeneratePrefillsWithAI(async () =>
    createSuccessfulPrefillsResponse(),
  );
  const prefillsBefore = testDb.query("SELECT enhanced_job_id FROM prefills");
  expect(prefillsBefore).toHaveLength(1);

  await main([], testDb);

  restoreGeneratePrefillsWithAI();

  const enhancedJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM enhanced_jobs ORDER BY job_id",
  );
  const prefillsResult = testDb.query(
    "SELECT enhanced_job_id FROM prefills ORDER BY enhanced_job_id",
  );

  expect(enhancedJobsResult).toHaveLength(9);
  expect(prefillsResult.length - prefillsBefore.length).toBe(5);

  const prefillsJobIds = prefillsResult.map(
    (prefill) => prefill.enhanced_job_id,
  );

  expect(prefillsJobIds).toEqual([
    "linkedin-1",
    "linkedin-2",
    "linkedin-3",
    "linkedin-4",
    "linkedin-5",
    "linkedin-9",
  ]);
});

it("should handle mix of successful and failed prefills generation", async () => {
  insertEnhancedJobsForPrefills(testDb, 4, "linkedin");

  testDb.query(
    `UPDATE enhanced_jobs SET fail_count = 1 WHERE job_id = 'linkedin-3'`,
  );

  const restoreGeneratePrefillsWithAI = mockGeneratePrefillsWithAI(
    async (enhancedJob) => {
      if (
        enhancedJob.jobId === "linkedin-1" ||
        enhancedJob.jobId === "linkedin-2"
      ) {
        return createSuccessfulPrefillsResponse();
      }
      throw new Error("Failed to generate prefills");
    },
  );

  await main([], testDb);

  restoreGeneratePrefillsWithAI();

  expect(testDb.isConnected).toBe(false);

  const enhancedJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM enhanced_jobs ORDER BY job_id",
  );
  const prefillsResult = testDb.query("SELECT enhanced_job_id FROM prefills");

  expect(enhancedJobsResult).toHaveLength(4);
  expect(prefillsResult).toHaveLength(2);

  const prefillsJobIds = prefillsResult.map(
    (prefill) => prefill.enhanced_job_id,
  );
  expect(prefillsJobIds).toContain("linkedin-1");
  expect(prefillsJobIds).toContain("linkedin-2");

  const [job1, job2, job3, job4] = enhancedJobsResult;
  expect(job1.fail_count).toBe(0);
  expect(job2.fail_count).toBe(0);
  expect(job3.fail_count).toBe(2);
  expect(job4.fail_count).toBe(1);
});

it("should increment fail_count when all jobs fail", async () => {
  insertEnhancedJobsForPrefills(testDb, 3, "linkedin");

  testDb.query(
    `UPDATE enhanced_jobs SET fail_count = 2 WHERE job_id = 'linkedin-2'`,
  );

  const restoreGeneratePrefillsWithAI = mockGeneratePrefillsWithAI(async () => {
    throw new Error("Failed to generate prefills");
  });

  await main([], testDb);

  restoreGeneratePrefillsWithAI();

  expect(testDb.isConnected).toBe(false);

  const enhancedJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM enhanced_jobs ORDER BY job_id",
  );
  const prefillsResult = testDb.query("SELECT enhanced_job_id FROM prefills");

  expect(enhancedJobsResult).toHaveLength(3);
  expect(prefillsResult).toHaveLength(0);

  const [job1, job2, job3] = enhancedJobsResult;

  expect(job1.fail_count).toBe(1);
  expect(job2.fail_count).toBe(3);
  expect(job3.fail_count).toBe(1);
});

it("should handle no enhanced jobs to process", async () => {
  const restoreGeneratePrefillsWithAI = mockGeneratePrefillsWithAI(async () =>
    createSuccessfulPrefillsResponse(),
  );

  await main([], testDb);

  restoreGeneratePrefillsWithAI();

  const enhancedJobsResult = testDb.query("SELECT job_id FROM enhanced_jobs");
  const prefillsResult = testDb.query("SELECT enhanced_job_id FROM prefills");

  expect(enhancedJobsResult).toHaveLength(0);
  expect(prefillsResult).toHaveLength(0);
});

it("should skip jobs without sufficient data for prefills", async () => {
  insertEnhancedJobsForPrefills(testDb, 4, "linkedin");

  // Remove required data for prefills generation
  testDb.query(
    `UPDATE enhanced_jobs
     SET job_description = NULL,
         hard_skills_required = NULL,
         years_of_experience_required = NULL
     WHERE job_id = 'linkedin-1'`,
  );
  testDb.query(
    `UPDATE enhanced_jobs
     SET job_description = NULL,
         years_of_experience_required = NULL
     WHERE job_id = 'linkedin-2'`,
  );
  testDb.query(
    `UPDATE enhanced_jobs
     SET job_description = NULL,
         hard_skills_required = NULL
     WHERE job_id = 'linkedin-3'`,
  );
  // Acceptable
  testDb.query(
    `UPDATE enhanced_jobs
     SET years_of_experience_required = NULL,
         hard_skills_required = NULL
     WHERE job_id = 'linkedin-4'`,
  );

  const restoreGeneratePrefillsWithAI = mockGeneratePrefillsWithAI(async () =>
    createSuccessfulPrefillsResponse(),
  );

  await main([], testDb);

  restoreGeneratePrefillsWithAI();

  const enhancedJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM enhanced_jobs",
  );
  const prefillsResult = testDb.query("SELECT enhanced_job_id FROM prefills");

  expect(enhancedJobsResult).toHaveLength(4);
  expect(prefillsResult).toHaveLength(1);

  expect(enhancedJobsResult[0].fail_count).toBe(1);
  expect(enhancedJobsResult[1].fail_count).toBe(1);
  expect(enhancedJobsResult[2].fail_count).toBe(1);
  expect(enhancedJobsResult[3].fail_count).toBe(0);
});

it("should rollback transaction if insertNewPrefills fails", async () => {
  insertEnhancedJobsForPrefills(testDb, 3, "linkedin");

  const restoreGeneratePrefillsWithAI = mockGeneratePrefillsWithAI(async () =>
    createSuccessfulPrefillsResponse(),
  );

  const insertSpy = vi
    .spyOn(prefillsDb, "insertNewPrefills")
    .mockImplementation(() => {
      throw new Error("Database constraint violation");
    });

  await main([], testDb);

  restoreGeneratePrefillsWithAI();
  insertSpy.mockRestore();

  expect(testDb.isConnected).toBe(false);

  const enhancedJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM enhanced_jobs ORDER BY job_id",
  );
  const prefillsResult = testDb.query("SELECT enhanced_job_id FROM prefills");

  expect(enhancedJobsResult).toHaveLength(3);
  expect(prefillsResult).toHaveLength(0);

  enhancedJobsResult.forEach((job) => {
    expect(job.fail_count).toBe(0);
  });
});

it("should rollback transaction if updateFailedPrefills fails", async () => {
  insertEnhancedJobsForPrefills(testDb, 3, "linkedin");

  const restoreGeneratePrefillsWithAI = mockGeneratePrefillsWithAI(
    async (enhancedJob) => {
      if (enhancedJob.jobId === "linkedin-1") {
        return createSuccessfulPrefillsResponse();
      }
      throw new Error("Failed to generate prefills");
    },
  );

  const updateSpy = vi
    .spyOn(prefillsDb, "updateFailedPrefills")
    .mockImplementation(() => {
      throw new Error("Update operation failed");
    });

  await main([], testDb);

  restoreGeneratePrefillsWithAI();
  updateSpy.mockRestore();

  expect(testDb.isConnected).toBe(false);

  const enhancedJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM enhanced_jobs ORDER BY job_id",
  );
  const prefillsResult = testDb.query("SELECT enhanced_job_id FROM prefills");

  expect(enhancedJobsResult).toHaveLength(3);
  expect(prefillsResult).toHaveLength(0);

  enhancedJobsResult.forEach((job) => {
    expect(job.fail_count).toBe(0);
  });
});
