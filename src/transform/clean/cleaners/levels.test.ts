import { HappyAIClient } from "../../../ai/mock.ts";
import { LevelsCleaner } from "./levels.ts";
import {
  testFailsWhenAllAIExtractionAttemptsFail,
  testFailsWhenJobDescriptionIsEmpty,
  testFailsWhenJobDetailsAreInvalid,
  testFailsWhenJobDetailsAreNull,
  testProcessesMultipleRawJobsSuccessfully,
  testProcessesRawJobSuccessfully,
} from "./test-utils.ts";

describe("clean", () => {
  const mockAIClients = [new HappyAIClient()];
  const cleaner = new LevelsCleaner(mockAIClients);

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
});
