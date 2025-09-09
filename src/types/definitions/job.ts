export interface BaseRecord {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Job extends BaseRecord {
  name: string;
  jobId: string;
  url: string;
  failCount?: number;
  details: Record<string, unknown>;
  source: "linkedin" | "levels";
}

export interface RawJob extends Job {}

export interface CleanJob extends Job {
  workArrangement?: "Remote" | "Hybrid" | "On-Site" | "Not specified";
  compensation?: string;
  company?: string;
  location?: string;
  role?: string;
  publishedDate?: Date;
  yearsOfExperienceRequired?: string;
  hardSkillsRequired?: string;
  jobDescription?: string;
}

export interface EnhancedJob extends CleanJob {
  relevanceScore?: number;
  relevanceReason?: string;
  recommendation?: "Apply" | "Consider" | "Skip";
  uploadedToSheet: boolean;
}

export interface Prefills extends BaseRecord {
  enhancedJobId: string;
  coverLetter?: string;
}

export type EnhancedJobWithPrefills = Pick<Prefills, "coverLetter"> & EnhancedJob;
