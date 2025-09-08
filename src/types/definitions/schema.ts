export interface DBBaseRecord {
  id?: number;
  created_at: string;
  updated_at: string;
}

export interface DBJob extends DBBaseRecord {
  name: string;
  job_id: string;
  fail_count?: number;
  details: string;
  source: string;
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
  job_description?: string;
}

export interface DBEnhancedJob extends DBCleanJob {
  relevance_score?: number;
  relevance_reason?: string;
  recommendation?: string;
  uploaded_to_sheet: number;
}

export interface DBPrefills extends DBBaseRecord {
  enhanced_job_id: string;
  cover_letter?: string;
}
