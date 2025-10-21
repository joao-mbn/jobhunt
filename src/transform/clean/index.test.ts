import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Database } from "../../db/database.ts";
import { setupDb, teardownDb } from "../../db/test-utils.ts";
import { insertRawJobs } from "../../extract/db.ts";
import { fromDBCleanJobToCleanJob } from "../../types/converters/schema-to-job.ts";
import type { DBCleanJob } from "../../types/definitions/schema.ts";
import { MAX_FAIL_COUNT } from "../../utils/constants.ts";
import { generateRawJobs } from "../../utils/test-utils.ts";
import {
  ErrorThrowingCleaner,
  FailureCleaner,
  MixedResultsCleaner,
  SuccessCleaner,
} from "./cleaners/mock.ts";
import * as cleanDb from "./db.ts";
import { main } from "./index.ts";

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

it("should successfully clean and store new jobs", async () => {
  const rawJobs = generateRawJobs(3, "linkedin");
  insertRawJobs(testDb, rawJobs);

  const cleaners = {
    linkedin: new SuccessCleaner(),
    levels: new ErrorThrowingCleaner(),
    builtin: new ErrorThrowingCleaner(),
    indeed: new ErrorThrowingCleaner(),
  };

  await main(testDb, cleaners);

  const rawJobsResult = testDb.query("SELECT job_id FROM raw_jobs");
  const cleanJobsResult = testDb.query("SELECT job_id FROM clean_jobs");

  expect(rawJobsResult).toHaveLength(0);
  expect(cleanJobsResult).toHaveLength(3);
  expect(cleanJobsResult[0].job_id).toBe("linkedin-1");
  expect(cleanJobsResult[1].job_id).toBe("linkedin-2");
  expect(cleanJobsResult[2].job_id).toBe("linkedin-3");
});

it("should add database properties to cleaned jobs", async () => {
  const rawJobs = generateRawJobs(1, "linkedin");
  insertRawJobs(testDb, rawJobs);

  const cleaners = {
    linkedin: new SuccessCleaner(),
    levels: new ErrorThrowingCleaner(),
    builtin: new ErrorThrowingCleaner(),
    indeed: new ErrorThrowingCleaner(),
  };

  const expectedCleanJob = (await cleaners.linkedin.clean(rawJobs))[0].job;

  await main(testDb, cleaners);

  const dbCleanJob = testDb.query(
    "SELECT * FROM clean_jobs WHERE job_id = ?",
    "linkedin-1",
  )[0] as unknown as DBCleanJob;
  const actualCleanJob = fromDBCleanJobToCleanJob(dbCleanJob);

  expect(actualCleanJob.id).toBeDefined();
  expect(actualCleanJob.createdAt).toBeDefined();
  expect(actualCleanJob.updatedAt).toBeDefined();

  for (const key of Object.keys(expectedCleanJob)) {
    expect(actualCleanJob[key]).toEqual(expectedCleanJob[key]);
  }
});

it("should process jobs from different sources correctly", async () => {
  const linkedinJobs = generateRawJobs(1, "linkedin");
  const builtinJobs = generateRawJobs(1, "builtin");
  const levelsJobs = generateRawJobs(1, "levels");
  const indeedJobs = generateRawJobs(1, "indeed");

  insertRawJobs(testDb, [
    ...linkedinJobs,
    ...builtinJobs,
    ...levelsJobs,
    ...indeedJobs,
  ]);

  const cleaners = {
    linkedin: new SuccessCleaner(),
    levels: new SuccessCleaner(),
    builtin: new SuccessCleaner(),
    indeed: new SuccessCleaner(),
  };

  await main(testDb, cleaners);

  const rawJobsResult = testDb.query("SELECT job_id FROM raw_jobs");
  const cleanJobsResult = testDb.query("SELECT job_id FROM clean_jobs");

  expect(rawJobsResult).toHaveLength(0);
  expect(cleanJobsResult).toHaveLength(4);

  const cleanJobIds = cleanJobsResult.map((job) => job.job_id);
  expect(cleanJobIds).toContain("linkedin-1");
  expect(cleanJobIds).toContain("builtin-1");
  expect(cleanJobIds).toContain("levels-1");
  expect(cleanJobIds).toContain("indeed-1");
});

it("should only process oldest 5 jobs respecting fail_count threshold", async () => {
  const rawJobs = generateRawJobs(7, "linkedin");
  insertRawJobs(testDb, rawJobs);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  testDb.query(
    `
    UPDATE raw_jobs
    SET created_at = ?
    WHERE job_id IN ('linkedin-1', 'linkedin-2', 'linkedin-3', 'linkedin-4', 'linkedin-5')
  `,
    yesterday.toISOString(),
  );

  testDb.query(
    `
    UPDATE raw_jobs
    SET created_at = ?, fail_count = ${MAX_FAIL_COUNT + 1}
    WHERE job_id = 'linkedin-6'
  `,
    twoDaysAgo.toISOString(),
  );

  const cleaners = {
    linkedin: new SuccessCleaner(),
    levels: new ErrorThrowingCleaner(),
    builtin: new ErrorThrowingCleaner(),
    indeed: new ErrorThrowingCleaner(),
  };

  await main(testDb, cleaners);

  const rawJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM raw_jobs ORDER BY job_id",
  );
  const cleanJobsResult = testDb.query(
    "SELECT job_id FROM clean_jobs ORDER BY job_id",
  );

  expect(rawJobsResult).toHaveLength(2);
  expect(cleanJobsResult).toHaveLength(5);

  const rawJobIds = rawJobsResult.map((job) => job.job_id);
  const cleanJobIds = cleanJobsResult.map((job) => job.job_id);

  expect(rawJobIds).toEqual(["linkedin-6", "linkedin-7"]);
  expect(cleanJobIds).toEqual([
    "linkedin-1",
    "linkedin-2",
    "linkedin-3",
    "linkedin-4",
    "linkedin-5",
  ]);
});

it("should handle mix of successful and failed cleaning results", async () => {
  const rawJobs = generateRawJobs(4, "linkedin");
  insertRawJobs(testDb, rawJobs);

  testDb.query(
    `UPDATE raw_jobs SET fail_count = 1 WHERE job_id = 'linkedin-3'`,
  );

  const cleaners = {
    linkedin: new MixedResultsCleaner(),
    levels: new ErrorThrowingCleaner(),
    builtin: new ErrorThrowingCleaner(),
    indeed: new ErrorThrowingCleaner(),
  };

  await main(testDb, cleaners);

  const rawJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM raw_jobs ORDER BY job_id",
  );
  const cleanJobsResult = testDb.query("SELECT job_id FROM clean_jobs");

  expect(rawJobsResult).toHaveLength(2);
  expect(cleanJobsResult).toHaveLength(2);

  const rawJobIds = rawJobsResult.map((job) => job.job_id);
  expect(rawJobIds).toEqual(["linkedin-3", "linkedin-4"]);

  const [job3, job4] = rawJobsResult;
  expect(job3.fail_count).toBe(2);
  expect(job4.fail_count).toBe(1);

  const cleanJobIds = cleanJobsResult.map((job) => job.job_id);
  expect(cleanJobIds).toContain("linkedin-1");
  expect(cleanJobIds).toContain("linkedin-2");
});

it("should increment fail_count when all jobs fail", async () => {
  const rawJobs = generateRawJobs(3, "linkedin");
  insertRawJobs(testDb, rawJobs);

  testDb.query(
    `UPDATE raw_jobs SET fail_count = 2 WHERE job_id = 'linkedin-2'`,
  );

  const cleaners = {
    linkedin: new FailureCleaner(),
    levels: new ErrorThrowingCleaner(),
    builtin: new ErrorThrowingCleaner(),
    indeed: new ErrorThrowingCleaner(),
  };

  await main(testDb, cleaners);

  const rawJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM raw_jobs ORDER BY job_id",
  );
  const cleanJobsResult = testDb.query("SELECT job_id FROM clean_jobs");

  expect(rawJobsResult).toHaveLength(3);
  expect(cleanJobsResult).toHaveLength(0);

  const [job1, job2, job3] = rawJobsResult;

  expect(job1.fail_count).toBe(1);
  expect(job2.fail_count).toBe(3);
  expect(job3.fail_count).toBe(1);
});

it("should handle no raw jobs to process", async () => {
  const cleaners = {
    linkedin: new SuccessCleaner(),
    levels: new SuccessCleaner(),
    builtin: new SuccessCleaner(),
    indeed: new SuccessCleaner(),
  };

  await main(testDb, cleaners);

  const rawJobsResult = testDb.query("SELECT job_id FROM raw_jobs");
  const cleanJobsResult = testDb.query("SELECT job_id FROM clean_jobs");

  expect(rawJobsResult).toHaveLength(0);
  expect(cleanJobsResult).toHaveLength(0);
});

it("should disconnect database when cleaner throws error", async () => {
  const rawJobs = generateRawJobs(2, "linkedin");
  insertRawJobs(testDb, rawJobs);

  const cleaners = {
    linkedin: new ErrorThrowingCleaner(),
    levels: new ErrorThrowingCleaner(),
    builtin: new ErrorThrowingCleaner(),
    indeed: new ErrorThrowingCleaner(),
  };

  await main(testDb, cleaners);
  expect(testDb.isConnected).toBe(false);

  const rawJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM raw_jobs ORDER BY job_id",
  );
  const cleanJobsResult = testDb.query("SELECT job_id FROM clean_jobs");

  expect(rawJobsResult).toHaveLength(2);
  expect(cleanJobsResult).toHaveLength(0);

  rawJobsResult.forEach((job) => {
    expect(job.fail_count).toBe(0);
  });
});

it("should not process any jobs when one cleaner throws error", async () => {
  const linkedinJobs = generateRawJobs(2, "linkedin");
  const builtinJobs = generateRawJobs(2, "builtin");
  insertRawJobs(testDb, [...linkedinJobs, ...builtinJobs]);

  const cleaners = {
    linkedin: new SuccessCleaner(),
    levels: new ErrorThrowingCleaner(),
    builtin: new ErrorThrowingCleaner(),
    indeed: new ErrorThrowingCleaner(),
  };

  await main(testDb, cleaners);
  expect(testDb.isConnected).toBe(false);

  const rawJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM raw_jobs ORDER BY job_id",
  );
  const cleanJobsResult = testDb.query("SELECT job_id FROM clean_jobs");

  expect(rawJobsResult).toHaveLength(4);
  expect(cleanJobsResult).toHaveLength(0);

  rawJobsResult.forEach((job) => {
    expect(job.fail_count).toBe(0);
  });
});

it("should rollback transaction if insertNewCleanJobs fails", async () => {
  const rawJobs = generateRawJobs(3, "linkedin");
  insertRawJobs(testDb, rawJobs);

  const cleaners = {
    linkedin: new SuccessCleaner(),
    levels: new ErrorThrowingCleaner(),
    builtin: new ErrorThrowingCleaner(),
    indeed: new ErrorThrowingCleaner(),
  };

  const insertSpy = vi
    .spyOn(cleanDb, "insertNewCleanJobs")
    .mockImplementation(() => {
      throw new Error("Database constraint violation");
    });

  await main(testDb, cleaners);

  insertSpy.mockRestore();

  expect(testDb.isConnected).toBe(false);

  const rawJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM raw_jobs ORDER BY job_id",
  );
  const cleanJobsResult = testDb.query("SELECT job_id FROM clean_jobs");

  expect(rawJobsResult).toHaveLength(3);
  expect(cleanJobsResult).toHaveLength(0);

  rawJobsResult.forEach((job) => {
    expect(job.fail_count).toBe(0);
  });
});

it("should rollback transaction if deleteCleanedRawJobs fails", async () => {
  const rawJobs = generateRawJobs(3, "linkedin");
  insertRawJobs(testDb, rawJobs);

  const cleaners = {
    linkedin: new SuccessCleaner(),
    levels: new ErrorThrowingCleaner(),
    builtin: new ErrorThrowingCleaner(),
    indeed: new ErrorThrowingCleaner(),
  };

  const deleteSpy = vi
    .spyOn(cleanDb, "deleteCleanedRawJobs")
    .mockImplementation(() => {
      throw new Error("Delete operation failed");
    });

  await main(testDb, cleaners);

  deleteSpy.mockRestore();

  expect(testDb.isConnected).toBe(false);

  const rawJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM raw_jobs ORDER BY job_id",
  );
  const cleanJobsResult = testDb.query("SELECT job_id FROM clean_jobs");

  expect(rawJobsResult).toHaveLength(3);
  expect(cleanJobsResult).toHaveLength(0);

  rawJobsResult.forEach((job) => {
    expect(job.fail_count).toBe(0);
  });
});

it("should rollback transaction if updateFailedCleaning fails", async () => {
  const rawJobs = generateRawJobs(3, "linkedin");
  insertRawJobs(testDb, rawJobs);

  const cleaners = {
    linkedin: new MixedResultsCleaner(),
    levels: new ErrorThrowingCleaner(),
    builtin: new ErrorThrowingCleaner(),
    indeed: new ErrorThrowingCleaner(),
  };

  const updateSpy = vi
    .spyOn(cleanDb, "updateFailedCleaning")
    .mockImplementation(() => {
      throw new Error("Update operation failed");
    });

  await main(testDb, cleaners);

  updateSpy.mockRestore();

  expect(testDb.isConnected).toBe(false);

  const rawJobsResult = testDb.query(
    "SELECT job_id, fail_count FROM raw_jobs ORDER BY job_id",
  );
  const cleanJobsResult = testDb.query("SELECT job_id FROM clean_jobs");

  expect(rawJobsResult).toHaveLength(3);
  expect(cleanJobsResult).toHaveLength(0);

  rawJobsResult.forEach((job) => {
    expect(job.fail_count).toBe(0);
  });
});
