import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../db/database.ts";
import { setupDb, teardownDb } from "../db/test-utils.ts";
import type { RawJob } from "../types/definitions/job.ts";
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
    testDb.exec(`
      INSERT INTO raw_jobs (name, job_id, url, details, source)
      VALUES
        ('Software Engineer', 'job-1', 'https://example.com/job1', '{}', 'linkedin'),
        ('Data Scientist', 'job-2', 'https://example.com/job2', '{}', 'levels');
    `);

    const result = queryJobIds(testDb);
    expect(result).toHaveLength(2);
    expect(result.map((row) => row.job_id)).toContain("job-1");
    expect(result.map((row) => row.job_id)).toContain("job-2");
  });

  it("should return job IDs from clean_jobs table only", () => {
    testDb.exec(`
      INSERT INTO clean_jobs (name, job_id, url, details, source)
      VALUES
        ('Product Manager', 'job-3', 'https://example.com/job3', '{}', 'builtin'),
        ('UX Designer', 'job-4', 'https://example.com/job4', '{}', 'indeed');
    `);

    const result = queryJobIds(testDb);
    expect(result).toHaveLength(2);
    expect(result.map((row) => row.job_id)).toContain("job-3");
    expect(result.map((row) => row.job_id)).toContain("job-4");
  });

  it("should return job IDs from enhanced_jobs table only", () => {
    testDb.exec(`
      INSERT INTO enhanced_jobs (name, job_id, url, details, source)
      VALUES
        ('DevOps Engineer', 'job-5', 'https://example.com/job5', '{}', 'linkedin'),
        ('ML Engineer', 'job-6', 'https://example.com/job6', '{}', 'levels');
    `);

    const result = queryJobIds(testDb);
    expect(result).toHaveLength(2);
    expect(result.map((row) => row.job_id)).toContain("job-5");
    expect(result.map((row) => row.job_id)).toContain("job-6");
  });

  it("should return unique job IDs from multiple tables", () => {
    testDb.exec(`
      INSERT INTO raw_jobs (name, job_id, url, details, source)
      VALUES
        ('Job 1', 'job-1', 'https://example.com/job1', '{}', 'linkedin')
    `);

    testDb.exec(`
      INSERT INTO clean_jobs (name, job_id, url, details, source)
      VALUES
        ('Job 2', 'job-2', 'https://example.com/job2', '{}', 'levels')
    `);

    testDb.exec(`
      INSERT INTO enhanced_jobs (name, job_id, url, details, source)
      VALUES
        ('Job 3', 'job-3', 'https://example.com/job3', '{}', 'builtin')
    `);

    const result = queryJobIds(testDb);
    expect(result).toHaveLength(3);
    expect(result.map((row) => row.job_id)).toEqual(
      expect.arrayContaining(["job-1", "job-2", "job-3"]),
    );
  });

  it("should handle duplicate job IDs across tables (UNION removes duplicates)", () => {
    testDb.exec(`
      INSERT INTO raw_jobs (name, job_id, url, details, source)
      VALUES ('Job 1', 'duplicate-job', 'https://example.com/job1', '{}', 'linkedin');
    `);

    testDb.exec(`
      INSERT INTO clean_jobs (name, job_id, url, details, source)
      VALUES ('Job 1', 'duplicate-job', 'https://example.com/job1', '{}', 'linkedin');
    `);

    testDb.exec(`
      INSERT INTO enhanced_jobs (name, job_id, url, details, source)
      VALUES ('Job 1', 'duplicate-job', 'https://example.com/job1', '{}', 'linkedin');
    `);

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
    const testJob: RawJob = {
      name: "Software Engineer",
      jobId: "test-job-1",
      url: "https://example.com/job1",
      details: { company: "Test Corp", location: "Remote" },
      source: "linkedin",
      failCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    insertRawJobs(testDb, [testJob]);

    const result = testDb.query(
      "SELECT * FROM raw_jobs WHERE job_id = ?",
      "test-job-1",
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Software Engineer");
    expect(result[0].job_id).toBe("test-job-1");
    expect(result[0].url).toBe("https://example.com/job1");
    expect(result[0].source).toBe("linkedin");
    expect(Number(result[0].fail_count)).toBe(0);
    expect(JSON.parse(String(result[0].details))).toEqual({
      company: "Test Corp",
      location: "Remote",
    });
  });

  it("should insert multiple jobs successfully", () => {
    const testJobs: RawJob[] = [
      {
        name: "Software Engineer",
        jobId: "test-job-1",
        url: "https://example.com/job1",
        details: { company: "Test Corp", location: "Remote" },
        source: "linkedin",
        failCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Data Scientist",
        jobId: "test-job-2",
        url: "https://example.com/job2",
        details: { company: "Data Corp", location: "Hybrid" },
        source: "levels",
        failCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Product Manager",
        jobId: "test-job-3",
        url: "https://example.com/job3",
        details: { company: "Product Corp", location: "On-Site" },
        source: "builtin",
        failCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    insertRawJobs(testDb, testJobs);

    const result = testDb.query("SELECT * FROM raw_jobs ORDER BY job_id");
    expect(result).toHaveLength(3);

    expect(result[0].name).toBe("Software Engineer");
    expect(result[0].job_id).toBe("test-job-1");
    expect(result[0].source).toBe("linkedin");
    expect(Number(result[0].fail_count)).toBe(0);

    expect(result[1].name).toBe("Data Scientist");
    expect(result[1].job_id).toBe("test-job-2");
    expect(result[1].source).toBe("levels");
    expect(Number(result[1].fail_count)).toBe(0);

    expect(result[2].name).toBe("Product Manager");
    expect(result[2].job_id).toBe("test-job-3");
    expect(result[2].source).toBe("builtin");
    expect(Number(result[2].fail_count)).toBe(0);
  });

  it("should throw error when trying to insert duplicate job_id", () => {
    const testJob: RawJob = {
      name: "Duplicate Job",
      jobId: "duplicate-job",
      url: "https://example.com/duplicate",
      details: {},
      source: "linkedin",
    };

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

    const testJob: RawJob = {
      name: "Complex Job",
      jobId: "complex-job",
      url: "https://example.com/complex",
      details: complexDetails,
      source: "builtin",
    };

    insertRawJobs(testDb, [testJob]);

    const result = testDb.query(
      "SELECT * FROM raw_jobs WHERE job_id = ?",
      "complex-job",
    );
    expect(result).toHaveLength(1);
    expect(JSON.parse(String(result[0].details))).toEqual(complexDetails);
  });
});
