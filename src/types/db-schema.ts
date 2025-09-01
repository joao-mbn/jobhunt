export interface BaseRecord {
  id?: string;
  fail_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Job extends BaseRecord {
  name: string;
  job_id: string;
  details: Record<string, unknown>;
}

export interface RawJob extends Job {}

export interface CleanJob extends Job {
  work_arrangement?: string;
  compensation?: string;
  company?: string;
  location?: string;
  role?: string;
  published_date?: string;
  years_of_experience_required?: string;
  hard_skills_required?: string;
  uploaded_to_sheet: boolean;
}

export interface EnhancedJob extends CleanJob {
  relevance_score?: number;
  relevance_reason?: string;
  recommendation?: string;
}

export interface Prefills extends BaseRecord {
  clean_job_id: string;
  cover_letter?: string;
}
