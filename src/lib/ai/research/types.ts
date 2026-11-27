export type ResearchPageHint = {
  slug: string;
  title: string;
  reason: string;
};

export type ResearchReference = {
  url: string;
  hostname: string;
  title?: string;
  pagesSeen: string[];
  sectionsSeen: string[];
};

export type ResearchPalette = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily?: string;
  mood?: string;
  confidence: 'high' | 'medium' | 'low';
};

export type ResearchBrief = {
  niche: string;
  playbookId: string;
  references: ResearchReference[];
  recommendedPages: ResearchPageHint[];
  homeSectionOrder: string[];
  palette: ResearchPalette;
  insights: string[];
  source: 'hybrid' | 'playbook_only';
};

export type IndustryPlaybook = {
  id: string;
  label: string;
  match: RegExp;
  pages: ResearchPageHint[];
  homeSectionOrder: string[];
  pageSectionHints: Record<string, string[]>;
  palette: Omit<ResearchPalette, 'confidence'>;
  tone: string;
  searchQueries: string[];
};
