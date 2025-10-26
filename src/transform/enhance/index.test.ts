import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Database } from "../../db/database.ts";
import { setupDb, teardownDb } from "../../db/test-utils.ts";
import { fromDBEnhancedJobToEnhancedJob } from "../../types/converters/schema-to-job.ts";
import type { DBEnhancedJob } from "../../types/definitions/schema.ts";
import { MAX_FAIL_COUNT } from "../../utils/constants.ts";
import { generateCleanJobs } from "../../utils/test-utils.ts";
import { insertNewCleanJobs } from "../clean/db.ts";
import { createTransformResultSuccess } from "../utils.ts";
import * as enhanceAI from "./ai.ts";
import * as enhanceDb from "./db.ts";
import { main } from "./index.ts";
import type { AIGeneratedEnhancedJobInfo } from "./types.ts";

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

function mockEnhanceJobWithAI(
  mockImplementation: typeof enhanceAI.enhanceJobWithAI,
) {
  vi.spyOn(enhanceAI, "enhanceJobWithAI").mockImplementation(
    mockImplementation,
  );

  return () => vi.spyOn(enhanceAI, "enhanceJobWithAI").mockRestore();
}

function createSuccessfulEnhancementResponse(): AIGeneratedEnhancedJobInfo {
  return {
    relevanceScore: 70,
    relevanceReason: "Strong match with required skills and experience",
    recommendation: "Consider",
  };
}

it("should successfully enhance and store new jobs", async () => {
  const linkedinJobs = generateCleanJobs(1, "linkedin");
  const builtinJobs = generateCleanJobs(1, "builtin");
  const levelsJobs = generateCleanJobs(1, "levels");
  const indeedJobs = generateCleanJobs(1, "indeed");

  const allCleanJobs = [
    ...linkedinJobs,
    ...builtinJobs,
    ...levelsJobs,
    ...indeedJobs,
  ];
  const successfulResults = allCleanJobs.map(createTransformResultSuccess);

  insertNewCleanJobs(testDb, successfulResults);

  const restoreEnhanceJobWithAI = mockEnhanceJobWithAI(async () =>
    createSuccessfulEnhancementResponse(),
  );

  await main(testDb);

  restoreEnhanceJobWithAI();

  expect(testDb.isConnected).toBe(false);

  const cleanJobsResult = testDb.query("SELECT job_id FROM clean_jobs");
  const enhancedJobsResult = testDb.query("SELECT job_id FROM enhanced_jobs");

  expect(cleanJobsResult).toHaveLength(0);
  expect(enhancedJobsResult).toHaveLength(4);

  const enhancedJobIds = enhancedJobsResult.map((job) => job.job_id);
  expect(enhancedJobIds).toContain("linkedin-1");
  expect(enhancedJobIds).toContain("builtin-1");
  expect(enhancedJobIds).toContain("levels-1");
  expect(enhancedJobIds).toContain("indeed-1");
});

it("should add database properties to enhanced jobs", async () => {
  const cleanJobs = generateCleanJobs(1, "linkedin");
  const successfulResults = cleanJobs.map(createTransformResultSuccess);
  insertNewCleanJobs(testDb, successfulResults);

  const expectedEnhancedInfo = createSuccessfulEnhancementResponse();
  const expectedCleanJob = cleanJobs[0];

  const restoreEnhanceJobWithAI = mockEnhanceJobWithAI(
    async () => expectedEnhancedInfo,
  );

  await main(testDb);

  restoreEnhanceJobWithAI();

  const dbEnhancedJob = testDb.query(
    "SELECT * FROM enhanced_jobs WHERE job_id = ?",
    "linkedin-1",
  )[0] as unknown as DBEnhancedJob;
  const actualEnhancedJob = fromDBEnhancedJobToEnhancedJob(dbEnhancedJob);

  expect(actualEnhancedJob.id).toBeDefined();
  expect(actualEnhancedJob.createdAt).toBeDefined();
  expect(actualEnhancedJob.updatedAt).toBeDefined();
  expect(actualEnhancedJob.uploadedToSheet).toBe(false);

  for (const key of Object.keys(expectedCleanJob)) {
    expect(actualEnhancedJob[key]).toEqual(expectedCleanJob[key]);
  }

  for (const key of Object.keys(expectedEnhancedInfo)) {
    expect(actualEnhancedJob[key]).toEqual(expectedEnhancedInfo[key]);
  }
});

it("should only process oldest 5 jobs respecting fail_count threshold", async () => {
  const cleanJobs = generateCleanJobs(7, "linkedin");
  const successfulResults = cleanJobs.map(createTransformResultSuccess);
  insertNewCleanJobs(testDb, successfulResults);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  testDb.query(
    `
    UPDATE clean_jobs
    SET created_at = ?
    WHERE job_id IN ('linkedin-1', 'linkedin-2', 'linkedin-3', 'linkedin-4', 'linkedin-5')
  `,
    yesterday.toISOString(),
  );

  testDb.query(
    `
    UPDATE clean_jobs
    SET created_at = ?, fail_count = ${MAX_FAIL_COUNT + 1}
    WHERE job_id = 'linkedin-6'
  `,
    twoDaysAgo.toISOString(),
  );

  const restoreEnhanceJobWithAI = mockEnhanceJobWithAI(async () =>
    createSuccessfulEnhancementResponse(),
  );

  await main(testDb);

  restoreEnhanceJobWithAI();

  const cleanJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM clean_jobs ORDER BY job_id",
  );
  const enhancedJobsResult = testDb.query(
    "SELECT job_id FROM enhanced_jobs ORDER BY job_id",
  );

  expect(cleanJobsResult).toHaveLength(2);
  expect(enhancedJobsResult).toHaveLength(5);

  const cleanJobIds = cleanJobsResult.map((job) => job.job_id);
  const enhancedJobIds = enhancedJobsResult.map((job) => job.job_id);

  expect(cleanJobIds).toEqual(["linkedin-6", "linkedin-7"]);
  expect(enhancedJobIds).toEqual([
    "linkedin-1",
    "linkedin-2",
    "linkedin-3",
    "linkedin-4",
    "linkedin-5",
  ]);
});

it("should handle mix of successful and failed enhancement results", async () => {
  const cleanJobs = generateCleanJobs(4, "linkedin");
  const successfulResults = cleanJobs.map(createTransformResultSuccess);
  insertNewCleanJobs(testDb, successfulResults);

  testDb.query(
    `UPDATE clean_jobs SET fail_count = 1 WHERE job_id = 'linkedin-3'`,
  );

  const restoreEnhanceJobWithAI = mockEnhanceJobWithAI(async (job) => {
    if (job.jobId === "linkedin-1" || job.jobId === "linkedin-2") {
      return createSuccessfulEnhancementResponse();
    }
    throw new Error("Failed to enhance job");
  });

  await main(testDb);

  restoreEnhanceJobWithAI();

  expect(testDb.isConnected).toBe(false);

  const cleanJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM clean_jobs ORDER BY job_id",
  );
  const enhancedJobsResult = testDb.query("SELECT job_id FROM enhanced_jobs");

  expect(cleanJobsResult).toHaveLength(2);
  expect(enhancedJobsResult).toHaveLength(2);

  const cleanJobIds = cleanJobsResult.map((job) => job.job_id);
  expect(cleanJobIds).toEqual(["linkedin-3", "linkedin-4"]);

  const [job3, job4] = cleanJobsResult;
  expect(job3.fail_count).toBe(2);
  expect(job4.fail_count).toBe(1);

  const enhancedJobIds = enhancedJobsResult.map((job) => job.job_id);
  expect(enhancedJobIds).toContain("linkedin-1");
  expect(enhancedJobIds).toContain("linkedin-2");
});

it("should increment fail_count when all jobs fail", async () => {
  const cleanJobs = generateCleanJobs(3, "linkedin");
  const successfulResults = cleanJobs.map(createTransformResultSuccess);
  insertNewCleanJobs(testDb, successfulResults);

  testDb.query(
    `UPDATE clean_jobs SET fail_count = 2 WHERE job_id = 'linkedin-2'`,
  );

  const restoreEnhanceJobWithAI = mockEnhanceJobWithAI(async () => {
    throw new Error("Failed to enhance job");
  });

  await main(testDb);

  restoreEnhanceJobWithAI();

  expect(testDb.isConnected).toBe(false);

  const cleanJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM clean_jobs ORDER BY job_id",
  );
  const enhancedJobsResult = testDb.query("SELECT job_id FROM enhanced_jobs");

  expect(cleanJobsResult).toHaveLength(3);
  expect(enhancedJobsResult).toHaveLength(0);

  const [job1, job2, job3] = cleanJobsResult;

  expect(job1.fail_count).toBe(1);
  expect(job2.fail_count).toBe(3);
  expect(job3.fail_count).toBe(1);
});

it("should handle no clean jobs to process", async () => {
  const restoreEnhanceJobWithAI = mockEnhanceJobWithAI(async () =>
    createSuccessfulEnhancementResponse(),
  );

  await main(testDb);

  restoreEnhanceJobWithAI();

  const cleanJobsResult = testDb.query("SELECT job_id FROM clean_jobs");
  const enhancedJobsResult = testDb.query("SELECT job_id FROM enhanced_jobs");

  expect(cleanJobsResult).toHaveLength(0);
  expect(enhancedJobsResult).toHaveLength(0);
});

it("should rollback transaction if insertNewEnhancedJobs fails", async () => {
  const cleanJobs = generateCleanJobs(3, "linkedin");
  const successfulResults = cleanJobs.map(createTransformResultSuccess);
  insertNewCleanJobs(testDb, successfulResults);

  const restoreEnhanceJobWithAI = mockEnhanceJobWithAI(async () =>
    createSuccessfulEnhancementResponse(),
  );

  const insertSpy = vi
    .spyOn(enhanceDb, "insertNewEnhancedJobs")
    .mockImplementation(() => {
      throw new Error("Database constraint violation");
    });

  await main(testDb);

  restoreEnhanceJobWithAI();
  insertSpy.mockRestore();

  expect(testDb.isConnected).toBe(false);

  const cleanJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM clean_jobs ORDER BY job_id",
  );
  const enhancedJobsResult = testDb.query("SELECT job_id FROM enhanced_jobs");

  expect(cleanJobsResult).toHaveLength(3);
  expect(enhancedJobsResult).toHaveLength(0);

  cleanJobsResult.forEach((job) => {
    expect(job.fail_count).toBe(0);
  });
});

it("should rollback transaction if deleteEnhancedCleanJobs fails", async () => {
  const cleanJobs = generateCleanJobs(3, "linkedin");
  const successfulResults = cleanJobs.map(createTransformResultSuccess);
  insertNewCleanJobs(testDb, successfulResults);

  const restoreEnhanceJobWithAI = mockEnhanceJobWithAI(async () =>
    createSuccessfulEnhancementResponse(),
  );

  const deleteSpy = vi
    .spyOn(enhanceDb, "deleteEnhancedCleanJobs")
    .mockImplementation(() => {
      throw new Error("Delete operation failed");
    });

  await main(testDb);

  restoreEnhanceJobWithAI();
  deleteSpy.mockRestore();

  expect(testDb.isConnected).toBe(false);

  const cleanJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM clean_jobs ORDER BY job_id",
  );
  const enhancedJobsResult = testDb.query("SELECT job_id FROM enhanced_jobs");

  expect(cleanJobsResult).toHaveLength(3);
  expect(enhancedJobsResult).toHaveLength(0);

  cleanJobsResult.forEach((job) => {
    expect(job.fail_count).toBe(0);
  });
});

it("should rollback transaction if updateFailedEnhancement fails", async () => {
  const cleanJobs = generateCleanJobs(3, "linkedin");
  const successfulResults = cleanJobs.map(createTransformResultSuccess);
  insertNewCleanJobs(testDb, successfulResults);

  const restoreEnhanceJobWithAI = mockEnhanceJobWithAI(async (job) => {
    if (job.jobId === "linkedin-1") {
      return createSuccessfulEnhancementResponse();
    }
    throw new Error("Failed to enhance job");
  });

  const updateSpy = vi
    .spyOn(enhanceDb, "updateFailedEnhancement")
    .mockImplementation(() => {
      throw new Error("Update operation failed");
    });

  await main(testDb);

  restoreEnhanceJobWithAI();
  updateSpy.mockRestore();

  expect(testDb.isConnected).toBe(false);

  const cleanJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM clean_jobs ORDER BY job_id",
  );
  const enhancedJobsResult = testDb.query("SELECT job_id FROM enhanced_jobs");

  expect(cleanJobsResult).toHaveLength(3);
  expect(enhancedJobsResult).toHaveLength(0);

  cleanJobsResult.forEach((job) => {
    expect(job.fail_count).toBe(0);
  });
});
