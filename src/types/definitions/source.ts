export interface LinkedInData {
  version: string;
  title: string;
  home_page_url: string;
  feed_url: string;
  favicon: string;
  language: string;
  description: string;
  items: {
    id: string;
    url: string;
    title: string;
    content_text: string;
    content_html: string;
    image?: string;
    date_published: string;
    authors: { name: string }[];
    attachments?: { url: string }[];
  }[];
}

export interface LevelsData {
  title: string;
  headerDetails: string;
  description: string;
  applyUrl: string;
  compensation: string;
}

export interface BuiltInData {
  title: string;
  company: string;
  location: string;
  workArrengement: string;
  seniorityLevel: string;
  datePublished: string;
  description: string;
  topSkills: string;
}

export interface IndeedData {
  title: string;
  company: string;
  insights: Record<string, string>;
  description: string;
  workArrangement: string;
  compensation: string;
  jobType: string;
  location: string;
}
