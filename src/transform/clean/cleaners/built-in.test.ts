import { HappyAIClient } from "../../../ai/mock.ts";
import { isCleanJob } from "../../../types/validators/job.ts";
import { omit } from "../../../utils/object.ts";
import {
  generateCleanJobs,
  generateRawJobs,
} from "../../../utils/test-utils.ts";
import * as ai from "../ai.ts";
import { BuiltInCleaner } from "./built-in.ts";

describe("clean", () => {
  const mockAIClients = [new HappyAIClient()];

  function mockExtractInfoWithAI(
    mockImplementation: typeof ai.extractInfoWithAI,
  ) {
    vi.spyOn(ai, "extractInfoWithAI").mockImplementation(mockImplementation);

    return () => vi.spyOn(ai, "extractInfoWithAI").mockRestore();
  }

  it("it processes a raw job successfully", async () => {
    const cleaner = new BuiltInCleaner(mockAIClients);
    const rawJobs = generateRawJobs(1, "builtin");

    const restoreExtractInfoWithAI = mockExtractInfoWithAI(
      async (_, jobId: string) => {
        const cleanJob = generateCleanJobs(1, "builtin")[0];
        const rawJob = rawJobs.find((r) => r.jobId === jobId);

        return omit(cleanJob, rawJob);
      },
    );

    const transformResults = await cleaner.clean(rawJobs);
    restoreExtractInfoWithAI();

    expect(transformResults).toHaveLength(1);
    const transformResult = transformResults[0];
    expect(transformResult.success).toBe(true);
    expect(transformResult.jobId).toEqual(rawJobs[0].jobId);

    const rawJob = rawJobs[0];
    const cleanJob = transformResult.job;
    for (const key in rawJob) {
      expect(key in cleanJob).toBe(true);
      expect(cleanJob[key]).toEqual(rawJob[key]);
    }
    expect(isCleanJob(cleanJob)).toBe(true);
  });

  it("processes multiple raw jobs successfully", async () => {
    const cleaner = new BuiltInCleaner(mockAIClients);
    const rawJobs = generateRawJobs(2, "builtin");

    const restoreExtractInfoWithAI = mockExtractInfoWithAI(
      async (_, jobId: string) => {
        const cleanJob = generateCleanJobs(1, "builtin")[0];
        const rawJob = rawJobs.find((r) => r.jobId === jobId);
        return omit(cleanJob, rawJob);
      },
    );

    const transformResults = (await cleaner.clean(rawJobs)).toSorted((a, b) =>
      a.jobId.localeCompare(b.jobId),
    );
    restoreExtractInfoWithAI();

    expect(transformResults).toHaveLength(2);
    for (const [index, transformResult] of transformResults.entries()) {
      expect(transformResult.success).toBe(true);
      expect(transformResult.jobId).toEqual(rawJobs[index].jobId);
      const cleanJob = transformResult.job;
      const rawJob = rawJobs[index];
      for (const key in rawJob) {
        expect(key in cleanJob).toBe(true);
        expect(cleanJob[key]).toEqual(rawJob[key]);
      }
      expect(isCleanJob(cleanJob)).toBe(true);
    }
  });

  it("fails when the job description is empty", async () => {
    const cleaner = new BuiltInCleaner(mockAIClients);
    const rawJobs = generateRawJobs(1, "builtin");
    rawJobs[0].details = {};

    const transformResults = await cleaner.clean(rawJobs);
    expect(transformResults).toHaveLength(1);
    expect(transformResults[0].success).toBe(false);
    expect(transformResults[0].jobId).toEqual(rawJobs[0].jobId);
  });

  it("fails when the job description is null", async () => {
    const cleaner = new BuiltInCleaner(mockAIClients);
    const rawJobs = generateRawJobs(1, "builtin");
    rawJobs[0].details = null;

    const transformResults = await cleaner.clean(rawJobs);
    expect(transformResults).toHaveLength(1);
    expect(transformResults[0].success).toBe(false);
    expect(transformResults[0].jobId).toEqual(rawJobs[0].jobId);
  });

  it("fails when the job details are invalid", async () => {
    const cleaner = new BuiltInCleaner(mockAIClients);
    const rawJobs = generateRawJobs(1, "linkedin");

    const transformResults = await cleaner.clean(rawJobs);
    expect(transformResults).toHaveLength(1);
    expect(transformResults[0].success).toBe(false);
    expect(transformResults[0].jobId).toEqual(rawJobs[0].jobId);
  });

  it("fails when all AI extraction attempts fail", async () => {
    const cleaner = new BuiltInCleaner(mockAIClients);
    const rawJobs = generateRawJobs(1, "builtin");
    const restoreExtractInfoWithAI = mockExtractInfoWithAI(async () => {
      throw new Error("Failed to extract job info");
    });

    const transformResults = await cleaner.clean(rawJobs);
    restoreExtractInfoWithAI();

    expect(transformResults).toHaveLength(1);
    expect(transformResults[0].success).toBe(false);
    expect(transformResults[0].jobId).toEqual(rawJobs[0].jobId);
  });

  it("fills information with defaults when AI extraction does not return values", async () => {
    const cleaner = new BuiltInCleaner(mockAIClients);
    const rawJobs = generateRawJobs(2, "builtin");

    const restoreExtractInfoWithAI = mockExtractInfoWithAI(
      async (_, jobId: string) =>
        jobId === rawJobs[0].jobId
          ? {}
          : {
              hardSkillsRequired: "Not specified",
              yearsOfExperienceRequired: "Not specified",
            },
    );

    const transformResults = (await cleaner.clean(rawJobs)).toSorted((a, b) =>
      a.jobId.localeCompare(b.jobId),
    );
    restoreExtractInfoWithAI();

    expect(transformResults).toHaveLength(2);

    for (const [index, transformResult] of transformResults.entries()) {
      const rawJob = rawJobs[index];

      expect(transformResult.success).toBe(true);
      expect(transformResult.jobId).toEqual(rawJob.jobId);
      expect(transformResult.job.yearsOfExperienceRequired).toEqual(
        rawJob.details.seniorityLevel,
      );
      expect(transformResult.job.hardSkillsRequired).toEqual(
        rawJob.details.topSkills,
      );
    }
  });
});
