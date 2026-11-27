export type DashboardOverviewData = {
  range: '7d' | '30d' | 'all';
  generatedAt: string;
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalPages: number;
    publishedPages: number;
    totalBlogs: number;
    publishedBlogs: number;
    totalPlugins: number;
    activePlugins: number;
    totalForms: number;
    totalSubmissions: number;
    totalComments: number;
    publishedRatio: number;
  };
  contentBreakdown: { name: string; count: number; published: number }[];
  traffic: {
    views: number;
    uniqueVisitors: number;
    avgReadTime: number;
    viewsByDay: { date: string; views: number }[];
    popularPosts: { id: string; title: string; slug?: string; views: number }[];
    searches: number;
  };
  recent: {
    users: ReportUser[];
    pages: ReportPage[];
    blogs: ReportPage[];
  };
  reports: {
    users: ReportUser[];
    pages: ReportPage[];
    blogs: ReportPage[];
    plugins: ReportPlugin[];
  };
};

export type ReportUser = {
  id: string;
  username: string;
  email: string;
  role: unknown;
  active: boolean;
  createdAt: string | null;
};

export type ReportPage = {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
  isHome?: boolean;
  updatedAt: string | null;
  createdAt: string | null;
};

export type ReportPlugin = {
  pluginId: string;
  name: string;
  version: string;
  isActive: boolean;
  source: string;
  kind: string;
  createdAt: string | null;
};
