export interface DBBaseRecord {
  id?: string;
  fail_count?: number;
  created_at: string;
  updated_at: string;
}

export interface DBJob extends DBBaseRecord {
  name: string;
  job_id: string;
  details: Record<string, unknown>;
}

export interface DBRawJob extends DBJob {}

export interface DBCleanJob extends DBJob {
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

export interface DBEnhancedJob extends DBCleanJob {
  relevance_score?: number;
  relevance_reason?: string;
  recommendation?: string;
}

export interface DBPrefills extends DBBaseRecord {
  clean_job_id: string;
  cover_letter?: string;
}
