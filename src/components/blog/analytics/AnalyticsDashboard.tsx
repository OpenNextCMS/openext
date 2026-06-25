'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Loader2, Eye, Users, Clock, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Summary {
  range: string;
  views: number;
  uniqueVisitors: number;
  avgReadTime: number;
  viewsByDay: { date: string; views: number }[];
  popularPosts: { id: string; title: string; slug?: string; views: number }[];
  topCategories: { name: string; count: number }[];
  searchQueries: { query: string; count: number }[];
}

type Range = '7d' | '30d' | 'all';

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState<Range>('7d');
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/summary?range=${range}`)
      .then((r) => r.json())
      .then((res) => setData(res?.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blog analytics</h1>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {(['7d', '30d', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                range === r ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {r === 'all' ? 'All time' : `Last ${r.replace('d', ' days')}`}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <div className="flex h-72 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={<Eye className="h-5 w-5" />} label="Views" value={data.views.toLocaleString()} />
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="Unique visitors"
              value={data.uniqueVisitors.toLocaleString()}
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="Avg read time"
              value={formatDuration(data.avgReadTime)}
            />
          </div>

          {/* Views over time */}
          <Card>
            <CardHeader>
              <CardTitle>Views over time</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.viewsByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="views" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Popular posts */}
            <Card>
              <CardHeader>
                <CardTitle>Popular posts</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {data.popularPosts.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.popularPosts} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" allowDecimals={false} fontSize={12} />
                      <YAxis type="category" dataKey="title" width={120} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="views" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty />
                )}
              </CardContent>
            </Card>

            {/* Top categories */}
            <Card>
              <CardHeader>
                <CardTitle>Top categories</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {data.topCategories.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topCategories}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Search queries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-4 w-4" /> Search queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.searchQueries.length ? (
                <ul className="divide-y">
                  {data.searchQueries.map((s) => (
                    <li key={s.query} className="flex items-center justify-between py-2 text-sm">
                      <span>{s.query}</span>
                      <span className="font-semibold text-muted-foreground">{s.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No searches yet.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Empty() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      No data for this range yet.
    </div>
  );
}
