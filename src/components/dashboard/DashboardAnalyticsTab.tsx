'use client';

import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Eye,
  Users,
  Clock,
  FileText,
  Plug,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DashboardOverviewData } from '@/components/dashboard/dashboardOverviewTypes';

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export function DashboardAnalyticsTab({
  data,
  range,
  onRangeChange,
}: {
  data: DashboardOverviewData;
  range: '7d' | '30d' | 'all';
  onRangeChange: (r: '7d' | '30d' | 'all') => void;
}) {
  const { overview, traffic, contentBreakdown } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Traffic, content, and engagement across your CMS
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1 w-fit">
          {(['7d', '30d', 'all'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                range === r ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {r === 'all' ? 'All time' : `Last ${r.replace('d', ' days')}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Eye className="h-4 w-4" />}
          label="Blog views"
          value={traffic.views.toLocaleString()}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Unique visitors"
          value={traffic.uniqueVisitors.toLocaleString()}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Avg read time"
          value={formatDuration(traffic.avgReadTime)}
        />
        <StatCard
          icon={<Search className="h-4 w-4" />}
          label="Searches"
          value={traffic.searches.toLocaleString()}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Users"
          value={`${overview.activeUsers}/${overview.totalUsers}`}
          hint="Active / total"
        />
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Pages"
          value={`${overview.publishedPages}/${overview.totalPages}`}
          hint="Published / total"
        />
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Blog posts"
          value={`${overview.publishedBlogs}/${overview.totalBlogs}`}
          hint="Published / total"
        />
        <StatCard
          icon={<Plug className="h-4 w-4" />}
          label="Plugins"
          value={`${overview.activePlugins}/${overview.totalPlugins}`}
          hint="Active / installed"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Views over time</CardTitle>
          <CardDescription>Blog page views for the selected range</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {traffic.viewsByDay.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={traffic.viewsByDay}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" fontSize={12} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} fontSize={12} width={36} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No view events in this range yet." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Content inventory</CardTitle>
            <CardDescription>Counts across CMS content types</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contentBreakdown}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={12} width={36} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="published" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Popular posts</CardTitle>
              <CardDescription>Top viewed blog content</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/analytics">
                Full blog analytics
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {traffic.popularPosts.length ? (
              <ul className="space-y-3">
                {traffic.popularPosts.map((post, i) => (
                  <li
                    key={post.id}
                    className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {i + 1}. {post.title}
                      </p>
                      {post.slug ? (
                        <p className="truncate text-xs text-muted-foreground">/{post.slug}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {post.views.toLocaleString()} views
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyChart message="No popular posts yet. Views appear after visitors read blogs." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forms & engagement</CardTitle>
          <CardDescription>Form builder and comment activity</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <MiniMetric label="Forms" value={overview.totalForms} />
          <MiniMetric label="Submissions" value={overview.totalSubmissions} />
          <MiniMetric label="Comments" value={overview.totalComments} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-muted-foreground text-center px-4">
      {message}
    </div>
  );
}
