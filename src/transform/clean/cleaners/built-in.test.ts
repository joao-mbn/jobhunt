import { HappyAIClient } from "../../../ai/mock.ts";
import { generateRawJobs } from "../../../utils/test-utils.ts";
import { BuiltInCleaner } from "./built-in.ts";
import {
  mockExtractInfoWithAI,
  testFailsWhenAllAIExtractionAttemptsFail,
  testFailsWhenJobDescriptionIsEmpty,
  testFailsWhenJobDetailsAreInvalid,
  testFailsWhenJobDetailsAreNull,
  testProcessesMultipleRawJobsSuccessfully,
  testProcessesRawJobSuccessfully,
} from "./test-utils.ts";

describe("clean", () => {
  const mockAIClients = [new HappyAIClient()];
  const cleaner = new BuiltInCleaner(mockAIClients);

  it("it processes a raw job successfully", async () => {
    await testProcessesRawJobSuccessfully(cleaner);
  });

  it("processes multiple raw jobs successfully", async () => {
    await testProcessesMultipleRawJobsSuccessfully(cleaner);
  });

  it("fails when the job description is empty", async () => {
    await testFailsWhenJobDescriptionIsEmpty(cleaner);
  });

  it("fails when the job description is null", async () => {
    await testFailsWhenJobDetailsAreNull(cleaner);
  });

  it("fails when the job details are invalid", async () => {
    await testFailsWhenJobDetailsAreInvalid(cleaner);
  });

  it("fails when all AI extraction attempts fail", async () => {
    await testFailsWhenAllAIExtractionAttemptsFail(cleaner);
  });

  it("fills information with defaults when AI extraction does not return values", async () => {
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
