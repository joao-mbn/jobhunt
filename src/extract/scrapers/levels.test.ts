import { describe, expect, it } from "vitest";
import type { RawJob } from "../../types/definitions/job.ts";
import type { LevelsData } from "../../types/definitions/source.ts";
import { isRawJob } from "../../types/validators/job.ts";
import { isLevelsData } from "../../types/validators/source.ts";
import { LevelsScraper } from "./levels.ts";

describe("LevelsScraper Integration Tests", () => {
  function getOriginalEndpoint() {
    const originalEndpoint = process.env.LEVELS_ENDPOINT;
    expect(originalEndpoint).not.toBeFalsy();
    expect(originalEndpoint).toContain("https://www.levels.fyi/jobs");
    return originalEndpoint;
  }

  it("should fetch jobs successfully", async () => {
    const originalEndpoint = getOriginalEndpoint();
    const url = new URL(originalEndpoint);
    url.searchParams.set("postedAfterValue", "3");
    url.searchParams.set("postedAfterTimeType", "days");
    const testUrl = url.toString();

    const scraper = new LevelsScraper(testUrl);
    const jobs = await scraper.fetchJobs();

    expect(Array.isArray(jobs)).toBe(true);

    jobs.forEach((job: RawJob) => {
      expect(isRawJob(job)).toBe(true);

      expect(job.name.length).toBeGreaterThan(0);
      expect(job.jobId).toMatch(/^levels-.+/);
      expect(job.url).toMatch(/^https:\/\/www\.levels\.fyi\/jobs\?jobId=.+/);
      expect(job.source).toBe("levels");
      expect(job.details).toBeDefined();

      const details = job.details as unknown as LevelsData;
      expect(isLevelsData(details)).toBe(true);
      expect(details.title.length).toBeGreaterThan(0);
      expect(details.description.length).toBeGreaterThan(0);
    });
  });

  it("should handle empty results gracefully", async () => {
    const originalEndpoint = getOriginalEndpoint();
    const url = new URL(originalEndpoint);

    if (url.pathname.includes("/title/")) {
      url.pathname = url.pathname.replace(/\/title\/[^/]+/, "/title/zzz");
    } else {
      url.pathname = url.pathname.replace(/\/jobs/, "/jobs/title/zzz");
    }

    const testUrl = url.toString();

    expect(testUrl).toContain("jobs/title/zzz");

    const scraper = new LevelsScraper(testUrl);
    const jobs = await scraper.fetchJobs();

    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.length).toBe(0);
  });
});
