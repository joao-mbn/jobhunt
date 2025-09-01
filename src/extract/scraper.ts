export interface RawSource {
  name: string;
  id: string;
  details: Record<string, unknown>;
}

export interface Scraper {
  fetchJobs: () => Promise<RawSource[]>;
}
