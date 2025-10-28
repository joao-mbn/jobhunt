import {
  ErrorThrowingAIClient,
  FixedJsonContentAIClient,
  RateLimitExceededAIClient,
} from "../../ai/mock.ts";
import { generateEnhancedJobs } from "../../utils/test-utils.ts";
import {
  DEFAULT_PREFILLS_INFO,
  generatePrefillsWithAI,
  isAIPrefillsInfo,
} from "./ai.ts";
import type { AIGeneratedPrefillsInfo } from "./types.ts";

describe("generatePrefillsWithAI", () => {
  it("it returns prefills info when a good enhanced job is provided", async () => {
    const enhancedJob = generateEnhancedJobs(1)[0];
    const expectedPrefillsInfo: AIGeneratedPrefillsInfo = {
      coverLetter:
        "Dear Hiring Manager,\n\nI am excited to apply for the Software Engineer position at Test Company 1...",
    };

    const prefillsInfo = await generatePrefillsWithAI(enhancedJob, [
      new FixedJsonContentAIClient(expectedPrefillsInfo),
    ]);

    expect(isAIPrefillsInfo(prefillsInfo)).toBe(true);
    expect(prefillsInfo.coverLetter).toBe(expectedPrefillsInfo.coverLetter);
  });

  it("it returns default values if validation of AI output fails", async () => {
    const enhancedJob = generateEnhancedJobs(1)[0];

    const prefillsInfo = await generatePrefillsWithAI(enhancedJob, [
      new FixedJsonContentAIClient({ coverLetter: 123 }),
    ]);

    expect(prefillsInfo).toBe(DEFAULT_PREFILLS_INFO);
  });

  it("it returns default values if all prompt attempts result in errors", async () => {
    const enhancedJob = generateEnhancedJobs(1)[0];

    const prefillsInfo = await generatePrefillsWithAI(enhancedJob, [
      new ErrorThrowingAIClient(),
      new RateLimitExceededAIClient(),
    ]);

    expect(prefillsInfo.coverLetter).toBe(DEFAULT_PREFILLS_INFO.coverLetter);
  });
});

describe("isAIPrefillsInfo", () => {
  it("returns false if the response is not an object", () => {
    const response = "not an object";
    expect(isAIPrefillsInfo(response)).toBe(false);
  });

  it("returns false if response is null", () => {
    const response = null;
    expect(isAIPrefillsInfo(response)).toBe(false);
  });

  it("returns true if the response is an empty object", () => {
    const response = {};
    expect(isAIPrefillsInfo(response)).toBe(true);
  });

  it("returns true if the response is an object with all of the optional fields", () => {
    const response: Record<keyof AIGeneratedPrefillsInfo, string> = {
      coverLetter: "Test cover letter",
    };
    expect(isAIPrefillsInfo(response)).toBe(true);
  });

  it("returns false if the response is an object with optional fields, but at least one of them is of the wrong type", () => {
    const response = {
      coverLetter: 123,
    };
    expect(isAIPrefillsInfo(response)).toBe(false);
  });
});
