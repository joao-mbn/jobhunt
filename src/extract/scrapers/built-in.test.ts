import { describe, expect, it } from "vitest";
import type { RawJob } from "../../types/definitions/job.ts";
import { BuiltInScraper } from "./built-in.ts";

describe("BuiltInScraper Integration Tests", () => {
  function getOriginalEndpoint() {
    const originalEndpoint = process.env.BUILTIN_ENDPOINT;
    expect(originalEndpoint).not.toBeFalsy();
    expect(originalEndpoint).toContain("https://builtinvancouver.org/jobs/");
    return originalEndpoint;
  }

  it("should fetch jobs successfully", { timeout: 60000 }, async () => {
    const originalEndpoint = getOriginalEndpoint();
    const url = new URL(originalEndpoint);
    const testUrl = url.toString();

    const scraper = new BuiltInScraper(testUrl);
    const jobs = await scraper.fetchJobs();

    expect(Array.isArray(jobs)).toBe(true);

    jobs.forEach((job: RawJob) => {
      expect(job.name).toBeDefined();
      expect(job.name).toBeTypeOf("string");
      expect(job.name.length).toBeGreaterThan(0);

      expect(job.jobId).toBeDefined();
      expect(job.jobId).toBeTypeOf("string");
      expect(job.jobId).toMatch(/^builtin-.+/);

      expect(job.url).toBeDefined();
      expect(job.url).toBeTypeOf("string");
      expect(job.url).toMatch(/^https:\/\/builtinvancouver\.org\/job\/.+/);

      expect(job.source).toBe("builtin");

      expect(job.details).toBeDefined();
      expect(job.details).toBeTypeOf("object");

      const details = job.details;
      expect(details.title).toBeDefined();
      expect(details.title).toBeTypeOf("string");
      expect((details.title as string).length).toBeGreaterThan(0);

      expect(details.company).toBeDefined();
      expect(details.company).toBeTypeOf("string");
      expect((details.company as string).length).toBeGreaterThan(0);

      expect(details.location).toBeDefined();
      expect(details.location).toBeTypeOf("string");

      expect(details.workArrengement).toBeDefined();
      expect(details.workArrengement).toBeTypeOf("string");

      expect(details.seniorityLevel).toBeDefined();
      expect(details.seniorityLevel).toBeTypeOf("string");

      expect(details.datePublished).toBeDefined();
      expect(details.datePublished).toBeTypeOf("string");

      expect(details.description).toBeDefined();
      expect(details.description).toBeTypeOf("string");
      expect((details.description as string).length).toBeGreaterThan(0);

      expect(details.topSkills).toBeDefined();
      expect(details.topSkills).toBeTypeOf("string");
    });
  });

  it("should handle empty results gracefully", async () => {
    const originalEndpoint = getOriginalEndpoint();
    const url = new URL(originalEndpoint);
    url.searchParams.set("country", "ZZZ");
    const testUrl = url.toString();

    expect(testUrl).toContain("country=ZZZ");

    const scraper = new BuiltInScraper(testUrl);
    const jobs = await scraper.fetchJobs();

    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.length).toBe(0);
  });
});
