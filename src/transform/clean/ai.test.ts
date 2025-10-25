import {
  ErrorThrowingAIClient,
  FixedJsonContentAIClient,
  RateLimitExceededAIClient,
} from "../../ai/mock.ts";
import { generateRawJobs } from "../../utils/test-utils.ts";
import { extractInfoWithAI, isAIExtractedInfo } from "./ai.ts";
import type { AIGeneratedCleanJobInfo } from "./types.ts";

describe("extractInfoWithAI", () => {
  it("it returns extracted info when a good job description is provided", async () => {
    const rawJob = generateRawJobs(1)[0];
    rawJob.details = {
      ...rawJob.details,
      compensation: "$100k - $150k per year",
      yearsOfExperienceRequired: "10+",
    };
    const jobDescription = JSON.stringify(rawJob);

    const extractedInfo = await extractInfoWithAI(
      jobDescription,
      rawJob.jobId,
      [new FixedJsonContentAIClient(rawJob.details)],
    );

    expect(isAIExtractedInfo(extractedInfo)).toBe(true);
    expect(extractedInfo.yearsOfExperienceRequired).toEqual(
      rawJob.details.yearsOfExperienceRequired,
    );
    expect(extractedInfo.compensation).toEqual(rawJob.details.compensation);
  });

  it("it returns an empty object if validation of AI output fails", async () => {
    const extractedInfo = extractInfoWithAI(
      "invalid job description",
      "test-job-id",
      [new FixedJsonContentAIClient({ compensation: 100000 })],
    );
    await expect(extractedInfo).rejects.toThrow();
  });

  it("it returns an empty object if all prompt attempts result in errors", async () => {
    const extractedInfo = extractInfoWithAI(
      "invalid job description",
      "test-job-id",
      [new ErrorThrowingAIClient(), new RateLimitExceededAIClient()],
    );
    await expect(extractedInfo).rejects.toThrow();
  });
});

describe("isAIExtractedInfo", () => {
  it("returns false if the response is not an object", () => {
    const response = "not an object";
    expect(isAIExtractedInfo(response)).toBe(false);
  });

  it("returns false if response is null", () => {
    const response = null;
    expect(isAIExtractedInfo(response)).toBe(false);
  });

  it("returns true if the response is an empty object", () => {
    const response = {};
    expect(isAIExtractedInfo(response)).toBe(true);
  });

  it("returns true if the response is an object with some of the optional fields", () => {
    const response = { workArrangement: "Remote" };
    expect(isAIExtractedInfo(response)).toBe(true);
  });

  it("returns true if the response is an object with all of the optional fields", () => {
    const response: Record<keyof AIGeneratedCleanJobInfo, string> = {
      workArrangement: "Remote",
      compensation: "100k-120k CAD/year",
      company: "Google",
      location: "San Francisco, CA",
      role: "Software Engineer",
      publishedDate: "2021-01-01",
      yearsOfExperienceRequired: "3",
      hardSkillsRequired: "JavaScript, React, Node.js",
    };
    expect(isAIExtractedInfo(response)).toBe(true);
  });

  it("returns false if the response is an object with optional fields, but at least one of them is of the wrong type", () => {
    const response = {
      workArrangement: "Remote",
      compensation: 100000,
      company: "Google",
      location: "San Francisco, CA",
    };
    expect(isAIExtractedInfo(response)).toBe(false);
  });
});
