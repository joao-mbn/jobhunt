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
  location?: string;
  role?: string;
  company?: string;
  contentPreview?: string;
  publishedDate?: string;
  relevanceScore?: JobAnalysisResult["score"];
  relevanceReason?: JobAnalysisResult["reason"];
  recommendation?: JobAnalysisResult["recommendation"];
  estimatedCompensation?: JobAnalysisResult["estimatedCompensation"];
  yearsOfExperienceRequired?: JobAnalysisResult["yearsOfExperienceRequired"];
  hardSkillsRequired?: string;
  tailoredResume?: string;
  coverLetter?: string;
}

export interface LinkedinData {
  version: string;
  title: string;
  home_page_url: string;
  feed_url: string;
  favicon: string;
  language: string;
  description: string;
  items: JobItem[];
}

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

export interface GoogleSheetConfig {
  spreadsheetId: string;
  sheetName: string;
  credentials: {
    client_email: string;
    private_key: string;
  };
}

export interface JobAnalysisResult {
  score: number;
  reason: string;
  keyMatches: string[];
  gaps: string[];
  recommendation: "Apply" | "Consider" | "Skip";
  estimatedCompensation: string;
  yearsOfExperienceRequired: string;
  hardSkillsRequired: string[];
}

export interface TailoredResume {
  tailoredExperience: Array<{
    company: string;
    position: string;
    duration: string;
    tailoredAchievements: string[];
    relevantTechnologies: string[];
  }>;
  tailoredProjects: Array<{
    title: string;
    description: string;
    duration: string;
    tailoredAchievements: string[];
    relevantTechnologies: string[];
  }>;
}
