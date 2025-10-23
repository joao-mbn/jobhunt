import { isAIExtractedInfo } from "./ai.ts";
import type { AIGeneratedCleanJobInfo } from "./types.ts";

describe("isAIExtractedInfo", () => {
  it("returns false if the response is not an object", () => {
    const response = "not an object";
    expect(isAIExtractedInfo(response)).toBe(false);
  });

  it("returns false if response is null", () => {
    const response = null;
    expect(isAIExtractedInfo(response)).toBe(false);
  });

  it("returns true if the response is an object", () => {
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

  it("returns false if the response is an object with optional fields, but they're of the wrong type", () => {
    const response = {
      workArrangement: "Remote",
      compensation: 100000,
      company: "Google",
      location: "San Francisco, CA",
    };
    expect(isAIExtractedInfo(response)).toBe(false);
  });
});
