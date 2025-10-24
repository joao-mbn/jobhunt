import { describe, expect, it } from "vitest";
import type { RawJob } from "../../types/definitions/job.ts";
import type { BuiltInData } from "../../types/definitions/source.ts";
import { isRawJob } from "../../types/validators/job.ts";
import { isBuiltInData } from "../../types/validators/source.ts";
import { BuiltInScraper } from "./built-in.ts";

describe("BuiltInScraper Integration Tests", () => {
  function getOriginalEndpoint() {
    const originalEndpoint = process.env.BUILTIN_ENDPOINT;
    expect(originalEndpoint).not.toBeFalsy();
    expect(originalEndpoint).toContain("https://builtinvancouver.org/jobs/");
    return originalEndpoint;
  }

  it("should fetch jobs successfully", { timeout: 120000 }, async () => {
    const originalEndpoint = getOriginalEndpoint();
    const url = new URL(originalEndpoint);
    url.searchParams.set("daysSinceUpdated", "1");
    const testUrl = url.toString();

    const scraper = new BuiltInScraper(testUrl);
    const jobs = await scraper.fetchJobs();

    expect(Array.isArray(jobs)).toBe(true);

    jobs.forEach((job: RawJob) => {
      expect(isRawJob(job)).toBe(true);

      expect(job.name.length).toBeGreaterThan(0);
      expect(job.jobId).toMatch(/^builtin-.+/);
      expect(job.url).toMatch(/^https:\/\/builtinvancouver\.org\/job\/.+/);
      expect(job.source).toBe("builtin");
      expect(job.details).toBeDefined();

      const details = job.details as unknown as BuiltInData;
      expect(isBuiltInData(details)).toBe(true);
      expect(details.title.length).toBeGreaterThan(0);
      expect(details.company.length).toBeGreaterThan(0);
      expect(details.description.length).toBeGreaterThan(0);
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
