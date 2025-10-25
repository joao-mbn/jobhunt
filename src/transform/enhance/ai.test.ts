import {
  ErrorThrowingAIClient,
  FixedJsonContentAIClient,
  RateLimitExceededAIClient,
} from "../../ai/mock.ts";
import { generateCleanJobs } from "../../utils/test-utils.ts";
import {
  DEFAULT_ENHANCED_INFO,
  enhanceJobWithAI,
  isAIEnhancedJobInfo,
} from "./ai.ts";
import type { AIGeneratedEnhancedJobInfo } from "./types.ts";

describe("enhanceJobWithAI", () => {
  it("it returns enhanced info when a good job is provided", async () => {
    const cleanJob = generateCleanJobs(1)[0];
    const expectedEnhancedInfo: AIGeneratedEnhancedJobInfo = {
      relevanceScore: 85,
      relevanceReason: "Great match for your skills and experience",
      recommendation: "Apply",
    };

    const enhancedInfo = await enhanceJobWithAI(cleanJob, [
      new FixedJsonContentAIClient(expectedEnhancedInfo),
    ]);

    expect(isAIEnhancedJobInfo(enhancedInfo)).toBe(true);
    expect(enhancedInfo.relevanceScore).toBe(
      expectedEnhancedInfo.relevanceScore,
    );
    expect(enhancedInfo.relevanceReason).toBe(
      expectedEnhancedInfo.relevanceReason,
    );
    expect(enhancedInfo.recommendation).toBe(
      expectedEnhancedInfo.recommendation,
    );
  });

  it("it returns default values if validation of AI output fails", async () => {
    const cleanJob = generateCleanJobs(1)[0];

    const enhancedInfo = await enhanceJobWithAI(cleanJob, [
      new FixedJsonContentAIClient({ relevanceScore: "invalid" }),
    ]);

    expect(enhancedInfo.relevanceScore).toBe(
      DEFAULT_ENHANCED_INFO.relevanceScore,
    );
    expect(enhancedInfo.relevanceReason).toBe(
      DEFAULT_ENHANCED_INFO.relevanceReason,
    );
    expect(enhancedInfo.recommendation).toBe(
      DEFAULT_ENHANCED_INFO.recommendation,
    );
  });

  it("it returns default values if all prompt attempts result in errors", async () => {
    const cleanJob = generateCleanJobs(1)[0];

    const enhancedInfo = await enhanceJobWithAI(cleanJob, [
      new ErrorThrowingAIClient(),
      new RateLimitExceededAIClient(),
    ]);

    expect(enhancedInfo.relevanceScore).toBe(
      DEFAULT_ENHANCED_INFO.relevanceScore,
    );
    expect(enhancedInfo.relevanceReason).toBe(
      DEFAULT_ENHANCED_INFO.relevanceReason,
    );
    expect(enhancedInfo.recommendation).toBe(
      DEFAULT_ENHANCED_INFO.recommendation,
    );
  });
});

describe("isAIEnhancedJobInfo", () => {
  it("returns false if the response is not an object", () => {
    const response = "not an object";
    expect(isAIEnhancedJobInfo(response)).toBe(false);
  });

  it("returns false if response is null", () => {
    const response = null;
    expect(isAIEnhancedJobInfo(response)).toBe(false);
  });

  it("returns true if the response is an empty object", () => {
    const response = {};
    expect(isAIEnhancedJobInfo(response)).toBe(true);
  });

  it("returns true if the response is an object with some of the optional fields", () => {
    const response = { relevanceScore: 85 };
    expect(isAIEnhancedJobInfo(response)).toBe(true);
  });

  it("returns true if the response is an object with all of the optional fields", () => {
    const response: Record<keyof AIGeneratedEnhancedJobInfo, string | number> =
      {
        relevanceScore: 85,
        relevanceReason: "Great match for your skills and experience",
        recommendation: "Apply",
      };
    expect(isAIEnhancedJobInfo(response)).toBe(true);
  });

  it("returns false if the response is an object with optional fields, but at least one of them is of the wrong type", () => {
    const response = {
      relevanceScore: "85",
      relevanceReason: "Great match for your skills and experience",
      recommendation: "Apply",
    };
    expect(isAIEnhancedJobInfo(response)).toBe(false);
  });
});
