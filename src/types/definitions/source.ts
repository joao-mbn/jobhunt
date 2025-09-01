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
    location?: string;
    role?: string;
    company?: string;
  }[];
}

export interface LevelsData {
  jobId: string;
  title: string;
  description: string;
  applyUrl: string;
  compensation: string;
  company: string;
}
