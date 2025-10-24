import type { Job } from "../../../types/definitions/job.ts";
import { isCleanJob } from "../../../types/validators/job.ts";
import { omit } from "../../../utils/object.ts";
import {
  generateCleanJobs,
  generateRawJobs,
} from "../../../utils/test-utils.ts";
import * as ai from "../ai.ts";
import { BuiltInCleaner } from "./built-in.ts";
import { IndeedCleaner } from "./indeed.ts";
import { LevelsCleaner } from "./levels.ts";
import { LinkedInCleaner } from "./linked-in.ts";
import type { Cleaner } from "./types.ts";

export function mockExtractInfoWithAI(
  mockImplementation: typeof ai.extractInfoWithAI,
) {
  vi.spyOn(ai, "extractInfoWithAI").mockImplementation(mockImplementation);

  return () => vi.spyOn(ai, "extractInfoWithAI").mockRestore();
}

export async function testProcessesRawJobSuccessfully(cleaner: Cleaner) {
  const source = getSourceFromCleaner(cleaner);
  const rawJobs = generateRawJobs(1, source);

  const restoreExtractInfoWithAI = mockExtractInfoWithAI(
    async (_, jobId: string) => {
      const cleanJob = generateCleanJobs(1, source)[0];
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
}

export async function testProcessesMultipleRawJobsSuccessfully(
  cleaner: Cleaner,
) {
  const source = getSourceFromCleaner(cleaner);
  const rawJobs = generateRawJobs(2, source);

  const restoreExtractInfoWithAI = mockExtractInfoWithAI(
    async (_, jobId: string) => {
      const cleanJob = generateCleanJobs(1, source)[0];
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
}

export async function testFailsWhenJobDescriptionIsEmpty(cleaner: Cleaner) {
  const source = getSourceFromCleaner(cleaner);
  const rawJobs = generateRawJobs(1, source);

  rawJobs[0].details = {};

  const transformResults = await cleaner.clean(rawJobs);
  expect(transformResults).toHaveLength(1);
  expect(transformResults[0].success).toBe(false);
  expect(transformResults[0].jobId).toEqual(rawJobs[0].jobId);
}

export async function testFailsWhenJobDetailsAreNull(cleaner: Cleaner) {
  const source = getSourceFromCleaner(cleaner);
  const rawJobs = generateRawJobs(1, source);
  rawJobs[0].details = null;

  const transformResults = await cleaner.clean(rawJobs);
  expect(transformResults).toHaveLength(1);
  expect(transformResults[0].success).toBe(false);
  expect(transformResults[0].jobId).toEqual(rawJobs[0].jobId);
}

export async function testFailsWhenJobDetailsAreInvalid(cleaner: Cleaner) {
  const invalidSource = getInvalidSourceForCleaner(cleaner);
  const rawJobs = generateRawJobs(1, invalidSource);

  const transformResults = await cleaner.clean(rawJobs);
  expect(transformResults).toHaveLength(1);
  expect(transformResults[0].success).toBe(false);
  expect(transformResults[0].jobId).toEqual(rawJobs[0].jobId);
}

export async function testFailsWhenAllAIExtractionAttemptsFail(
  cleaner: Cleaner,
) {
  const source = getSourceFromCleaner(cleaner);
  const rawJobs = generateRawJobs(1, source);
  const restoreExtractInfoWithAI = mockExtractInfoWithAI(async () => {
    throw new Error("Failed to extract job info");
  });

  const transformResults = await cleaner.clean(rawJobs);
  restoreExtractInfoWithAI();

  expect(transformResults).toHaveLength(1);
  expect(transformResults[0].success).toBe(false);
  expect(transformResults[0].jobId).toEqual(rawJobs[0].jobId);
}

function getSourceFromCleaner(cleaner: Cleaner): Job["source"] {
  if (cleaner instanceof BuiltInCleaner) return "builtin";
  if (cleaner instanceof IndeedCleaner) return "indeed";
  if (cleaner instanceof LevelsCleaner) return "levels";
  if (cleaner instanceof LinkedInCleaner) return "linkedin";
  throw new Error(`Unknown cleaner type: ${cleaner.constructor.name}`);
}

function getInvalidSourceForCleaner(cleaner: Cleaner): Job["source"] {
  const source = getSourceFromCleaner(cleaner);

  const invalidSource = ["linkedin", "levels", "builtin", "indeed"].find(
    (s): s is Job["source"] => s !== source,
  );

  if (!invalidSource) {
    throw new Error("No invalid source found");
  }
  return invalidSource;
}
