import { LevelsScraper } from "./levels.ts";

export interface RawSource {
  name: string;
  id: string;
  details: Record<string, unknown>;
}

export interface Scraper {
  fetchJobs: () => Promise<RawSource[]>;
}

export const scrapers: Scraper[] = [
  new LevelsScraper(),
];