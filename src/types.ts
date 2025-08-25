// Core job and RSS data types
export interface JobItem {
  id: string;
  url: string;
  title: string;
  content_text: string;
  content_html: string;
  image?: string;
  date_published: string;
  authors: Array<{ name: string }>;
  attachments?: Array<{ url: string }>;
  relevanceScore?: number;
  relevanceReason?: string;
}

export interface RSSData {
  version: string;
  title: string;
  home_page_url: string;
  feed_url: string;
  favicon: string;
  language: string;
  description: string;
  items: JobItem[];
}

// Resume data types
export interface ResumeData {
  personalInfo: {
    name: string;
    title: string;
    summary: string;
    email: string;
    links: {
      github: string;
      linkedin: string;
      website: string;
    };
  };
  workExperience: Array<{
    company: string;
    location: string;
    website: string;
    position: string;
    duration: string;
    achievements: string[];
    technologies: string[];
  }>;
  skills: {
    programmingLanguages: string[];
    frontend: string[];
    backend: string[];
    databases: string[];
    cloud: string[];
    devOps: string[];
    testing: string[];
    dataScience: string[];
  };
}

// Google Sheets configuration types
export interface GoogleSheetConfig {
  spreadsheetId: string;
  sheetName: string;
  credentials: {
    client_email: string;
    private_key: string;
  };
}

// Gemini analysis result types
export interface JobAnalysisResult {
  score: number;
  reason: string;
  keyMatches: string[];
  gaps: string[];
  recommendation: string;
}
