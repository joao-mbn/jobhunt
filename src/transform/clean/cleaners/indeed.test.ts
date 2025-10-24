import { HappyAIClient } from "../../../ai/mock.ts";
import { generateRawJobs } from "../../../utils/test-utils.ts";
import { IndeedCleaner } from "./indeed.ts";
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
  const cleaner = new IndeedCleaner(mockAIClients);

  it("it processes a raw job successfully", async () => {
    await testProcessesRawJobSuccessfully(cleaner);
  });

  it("processes multiple raw jobs successfully", async () => {
    await testProcessesMultipleRawJobsSuccessfully(cleaner);
  });

  it("fails when the job description is empty", async () => {
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

  it("fills information with defaults when AI extraction does not return values", async () => {
    const rawJobs = generateRawJobs(1, "indeed");

    const restoreExtractInfoWithAI = mockExtractInfoWithAI(async () => ({}));

    const transformResults = (await cleaner.clean(rawJobs)).toSorted((a, b) =>
      a.jobId.localeCompare(b.jobId),
    );
    restoreExtractInfoWithAI();

    expect(transformResults).toHaveLength(1);
    const transformResult = transformResults[0];
    const details = rawJobs[0].details;
    expect(transformResult.job.workArrangement).toEqual(
      details.workArrangement,
    );
    expect(transformResult.job.compensation).toEqual(details.compensation);
    expect(transformResult.job.company).toEqual(details.company);
    expect(transformResult.job.location).toEqual(details.location);
    expect(transformResult.job.role).toEqual(details.title);
  });

  it("fills information with defaults when neither AI extraction nor job details return values", async () => {
    const rawJobs = generateRawJobs(1, "indeed");
    rawJobs[0].details = {
      ...rawJobs[0].details,
      workArrangement: "",
      compensation: "",
      company: "",
      location: "",
      title: "",
    };
    const restoreExtractInfoWithAI = mockExtractInfoWithAI(async () => ({}));

    const transformResults = (await cleaner.clean(rawJobs)).toSorted((a, b) =>
      a.jobId.localeCompare(b.jobId),
    );
    restoreExtractInfoWithAI();

    expect(transformResults).toHaveLength(1);
    const transformResult = transformResults[0];
    expect(transformResult.job.workArrangement).toEqual("Not specified");
    expect(transformResult.job.compensation).toEqual("Not specified");
    expect(transformResult.job.company).toEqual("Not specified");
    expect(transformResult.job.location).toEqual("Not specified");
    expect(transformResult.job.role).toEqual("Not specified");
  });
});
