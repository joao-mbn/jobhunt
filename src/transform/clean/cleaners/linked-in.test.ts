import { HappyAIClient } from "../../../ai/mock.ts";
import { generateRawJobs } from "../../../utils/test-utils.ts";
import { LinkedInCleaner } from "./linked-in.ts";
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
  const cleaner = new LinkedInCleaner(mockAIClients);

  it("it processes a raw job successfully", async () => {
    await testProcessesRawJobSuccessfully(cleaner);
  });

  it("processes multiple raw jobs successfully", async () => {
    await testProcessesMultipleRawJobsSuccessfully(cleaner);
  });

  it("fails when the job description (content_text) is empty", async () => {
    await testFailsWhenJobDescriptionIsEmpty(cleaner);
  });

  it("fails when the job details are null", async () => {
    await testFailsWhenJobDetailsAreNull(cleaner);
  });

  it("fails when the job details are invalid", async () => {
    await testFailsWhenJobDetailsAreInvalid(cleaner);
  });

  it("fails when all AI extraction attempts fail", async () => {
    await testFailsWhenAllAIExtractionAttemptsFail(cleaner);
  });

  it("handles published date parsing from date_published field", async () => {
    const rawJobs = generateRawJobs(1, "linkedin");

    const restoreExtractInfoWithAI = mockExtractInfoWithAI(async () => ({
      hardSkillsRequired: "JavaScript, React",
      yearsOfExperienceRequired: "3+ years",
    }));

    const transformResults = await cleaner.clean(rawJobs);
    restoreExtractInfoWithAI();

    expect(transformResults).toHaveLength(1);
    expect(transformResults[0].success).toBe(true);
    expect(transformResults[0].job.publishedDate).toEqual(
      new Date(String(rawJobs[0].details.date_published)),
    );
  });
});
