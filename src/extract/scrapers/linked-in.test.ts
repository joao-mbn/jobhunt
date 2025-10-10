import { describe, expect, it } from "vitest";
import type { RawJob } from "../../types/definitions/job.ts";
import type { LinkedInData } from "../../types/definitions/source.ts";
import { isRawJob } from "../../types/validators/job.ts";
import { isLinkedInDataItem } from "../../types/validators/source.ts";
import { LinkedInScraper } from "./linked-in.ts";

describe("LinkedInScraper Integration Tests", () => {
  function getOriginalEndpoint() {
    const originalEndpoint = process.env.LINKEDIN_ENDPOINT;
    expect(originalEndpoint).not.toBeFalsy();
    expect(originalEndpoint).toContain("https://");
    return originalEndpoint;
  }

  it("should fetch jobs successfully", async () => {
    const originalEndpoint = getOriginalEndpoint();
    const testUrl = originalEndpoint;

    const scraper = new LinkedInScraper(testUrl);
    const jobs = await scraper.fetchJobs();

    expect(Array.isArray(jobs)).toBe(true);

    jobs.forEach((job: RawJob) => {
      expect(isRawJob(job)).toBe(true);

      expect(job.name.length).toBeGreaterThan(0);
      expect(job.jobId).toMatch(/^linkedin-.+/);
      expect(job.url).toMatch(/^https:\/\/.+linkedin\.com\/jobs\/view\/.+/);
      expect(job.source).toBe("linkedin");
      expect(job.details).toBeDefined();

      const details = job.details as unknown as LinkedInData["items"][number];
      expect(isLinkedInDataItem(details)).toBe(true);
      expect(details.title.length).toBeGreaterThan(0);
    });
  });

  it("should handle empty results gracefully", async () => {
    const scraper = new LinkedInScraper("https://example.com");
    const jobs = await scraper.fetchJobs();

    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.length).toBe(0);
  });
});
