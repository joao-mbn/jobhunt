import { describe, expect, it } from "vitest";
import type { RawJob } from "../../types/definitions/job.ts";
import type { IndeedData } from "../../types/definitions/source.ts";
import { isRawJob } from "../../types/validators/job.ts";
import { isIndeedData } from "../../types/validators/source.ts";
import { IndeedScraper } from "./indeed.ts";

describe("IndeedScraper Integration Tests", () => {
  function getOriginalEndpoint() {
    const originalEndpoint = process.env.INDEED_ENDPOINT;
    expect(originalEndpoint).not.toBeFalsy();
    expect(originalEndpoint).toContain("https://ca.indeed.com/jobs");
    return originalEndpoint;
  }

  it("should fetch jobs successfully", { timeout: 60000 }, async () => {
    const originalEndpoint = getOriginalEndpoint();
    const url = new URL(originalEndpoint);
    const testUrl = url.toString();

    const scraper = new IndeedScraper(testUrl);
    const jobs = await scraper.fetchJobs();

    expect(Array.isArray(jobs)).toBe(true);

    jobs.forEach((job: RawJob) => {
      expect(isRawJob(job)).toBe(true);

      expect(job.name.length).toBeGreaterThan(0);
      expect(job.jobId).toMatch(/^indeed-.+/);
      expect(job.url).toMatch(/^https:\/\/ca\.indeed\.com\/jobs\?.+&vjk=.+/);
      expect(job.source).toBe("indeed");
      expect(job.details).toBeDefined();

      const details = job.details as unknown as IndeedData;
      expect(isIndeedData(details)).toBe(true);
      expect(details.title.length).toBeGreaterThan(0);
      expect(details.company.length).toBeGreaterThan(0);
      expect(details.description.length).toBeGreaterThan(0);
    });
  });

  it("should handle empty results gracefully", { timeout: 60000 }, async () => {
    const originalEndpoint = getOriginalEndpoint();
    const url = new URL(originalEndpoint);
    url.searchParams.set("q", "ZZZ_NONEXISTENT_JOB_SEARCH");
    const testUrl = url.toString();

    expect(testUrl).toContain("q=ZZZ_NONEXISTENT_JOB_SEARCH");

    const scraper = new IndeedScraper(testUrl);
    const jobs = await scraper.fetchJobs();

    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.length).toBe(0);
  });
});
