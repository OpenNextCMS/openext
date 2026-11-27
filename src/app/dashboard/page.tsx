'use client';
import { apiUrl } from '@/lib/apiClient';

import { useEffect, useState, useCallback } from 'react';
import { translations } from '../../../public/locales/translations';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { handleError } from '@/utils/errorHandler';
import {
  Activity,
  BarChart3,
  Clock,
  FileText,
  LayoutDashboard,
  Loader2,
  Settings,
  Users,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { DashboardAnalyticsTab } from '@/components/dashboard/DashboardAnalyticsTab';
import { DashboardReportsTab } from '@/components/dashboard/DashboardReportsTab';
import type { DashboardOverviewData } from '@/components/dashboard/dashboardOverviewTypes';

type Range = '7d' | '30d' | 'all';

function relativeTime(iso: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function DashboardPage() {
  const [t, setT] = useState(translations.en);
  const [error] = useState('');
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [range, setRange] = useState<Range>('7d');
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [dbStatus, setDbStatus] = useState({
    masterDbConnected: false,
    userDbConnected: false,
    pageDbConnected: false,
  });
  const router = useRouter();

  useEffect(() => {
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations] as typeof translations.en);

    const message = Cookies.get('message');
    if (message) {
      handleError(null, message);
      Cookies.remove('message');
    }
  }, []);

  const clearAllCookies = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/api/clear-cookies'), {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        console.error('Failed to clear cookies');
      }
    } catch (err) {
      console.error('Error clearing cookies:', err);
    }
  }, []);

  const loadOverview = useCallback(async (selectedRange: Range) => {
    setOverviewLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/dashboard/overview?range=${selectedRange}`), {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        throw new Error(json?.error?.message || 'Failed to load dashboard overview');
      }
      setOverview(json.data as DashboardOverviewData);
    } catch (err) {
      handleError(err, err instanceof Error ? err.message : 'Failed to load dashboard data');
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkDbAndRedirect = async () => {
      try {
        setLoading(true);
        const response = await fetch(apiUrl('/api/verify-connection'), {
          credentials: 'include',
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch database connection status: ${errorText}`);
        }

        const data = await response.json();
        setDbStatus(data);

        if (!data.masterDbConnected || !data.userDbConnected || !data.pageDbConnected) {
          handleError(null, 'Database Connection not Established');
          await clearAllCookies();
          router.push('/language');
          return;
        }

        await loadOverview('7d');
      } catch (err) {
        handleError(err, 'Error checking database connections');
        await clearAllCookies();
        router.push('/language');
      } finally {
        setLoading(false);
      }
    };

    void checkDbAndRedirect();
  }, [router, clearAllCookies, loadOverview]);

  const handleRangeChange = (next: Range) => {
    setRange(next);
    void loadOverview(next);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const stats = overview?.overview;
  const activityData =
    overview?.traffic.viewsByDay.map((d) => ({
      day: d.date.slice(5),
      visits: d.views,
      engagement: Math.round(d.views * 0.65),
    })) ?? [];

  const recentActivity = [
    ...(overview?.recent.pages ?? []).slice(0, 3).map((p) => ({
      title: `Page updated: ${p.name}`,
      when: relativeTime(p.updatedAt),
    })),
    ...(overview?.recent.users ?? []).slice(0, 2).map((u) => ({
      title: `User registered: ${u.username || u.email}`,
      when: relativeTime(u.createdAt),
    })),
  ].slice(0, 5);

  return (
    <div className="w-full min-h-0">
      <div className="flex justify-between items-center z-10 bg-background border-b border-border p-4 -mx-5 -mt-5 mb-0 px-5">
        <h1 className="text-2xl font-bold">{t.dashboard.welcome}</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="hidden md:flex gap-2">
            <Clock className="h-4 w-4" />
            {new Date().toLocaleDateString()}
          </Button>
          <Button variant="outline" size="icon" className="md:hidden">
            <LayoutDashboard className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="py-4 md:py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription dangerouslySetInnerHTML={{ __html: error }} />
          </Alert>
        )}

        <div className="mb-6">
          <p className="text-muted-foreground">{t.dashboard.selectOption}</p>
        </div>

        <Tabs defaultValue="overview" className="mb-8">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {overviewLoading && !overview ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(stats?.totalUsers ?? 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(stats?.activeUsers ?? 0).toLocaleString()} active
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(stats?.activeUsers ?? 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats?.totalUsers
                          ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
                          : 0}
                        % of total users
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(stats?.totalPages ?? 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(stats?.publishedPages ?? 0).toLocaleString()} published ·{' '}
                        {(stats?.totalBlogs ?? 0).toLocaleString()} blogs
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Publish Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.publishedRatio ?? 0}%</div>
                      <Progress value={stats?.publishedRatio ?? 0} className="h-2 mt-2" />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Traffic (selected range)</CardTitle>
                    <CardDescription>
                      Blog views over the last{' '}
                      {range === 'all' ? 'available period' : range.replace('d', ' days')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="h-[280px]">
                      {activityData.length ? (
                        <ChartContainer
                          config={{
                            visits: {
                              label: 'Visits',
                              color: 'hsl(var(--chart-1))',
                            },
                            engagement: {
                              label: 'Engagement',
                              color: 'hsl(var(--chart-2))',
                            },
                          }}
                          className="h-full w-full"
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={activityData}
                              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                            >
                              <XAxis
                                dataKey="day"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12 }}
                                width={30}
                                allowDecimals={false}
                              />
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Line
                                type="monotone"
                                dataKey="visits"
                                stroke="hsl(var(--chart-1))"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="engagement"
                                stroke="hsl(var(--chart-2))"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No traffic data yet for this range.
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
                    Last updated:{' '}
                    {overview?.generatedAt
                      ? new Date(overview.generatedAt).toLocaleString()
                      : '—'}
                  </CardFooter>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>Latest pages and users</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {recentActivity.length ? (
                        recentActivity.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                          >
                            <div className="bg-primary/10 p-2 rounded-full">
                              <Activity className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{item.when}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No recent activity yet.</p>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm" className="ml-auto" asChild>
                        <Link href="/dashboard/pages/allpages">View pages</Link>
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                      <CardDescription>Frequently used tools</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      {[
                        { icon: Users, label: 'Manage Users', href: '/dashboard/users' },
                        { icon: FileText, label: 'Create Page', href: '/dashboard/pages/allpages' },
                        { icon: BarChart3, label: 'Blog Analytics', href: '/dashboard/analytics' },
                        { icon: Settings, label: 'System Settings', href: '/dashboard/settings' },
                      ].map((action) => (
                        <Button
                          key={action.href}
                          variant="outline"
                          className="h-24 flex flex-col gap-2"
                          asChild
                        >
                          <Link href={action.href}>
                            <action.icon className="h-6 w-6" />
                            <span>{action.label}</span>
                          </Link>
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            {overviewLoading && !overview ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : overview ? (
              <DashboardAnalyticsTab
                data={overview}
                range={range}
                onRangeChange={handleRangeChange}
              />
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Could not load analytics data.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports">
            {overviewLoading && !overview ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : overview ? (
              <DashboardReportsTab data={overview} />
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Could not load reports data.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <footer className="border-t border-border py-4 text-xs text-muted-foreground flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex gap-2 flex-wrap">
          <div>
            <span>Master DB: </span>
            <span className={dbStatus.masterDbConnected ? 'text-green-500' : 'text-red-500'}>
              {dbStatus.masterDbConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div>
            <span>User DB: </span>
            <span className={dbStatus.userDbConnected ? 'text-green-500' : 'text-red-500'}>
              {dbStatus.userDbConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div>
            <span>Page DB: </span>
            <span className={dbStatus.pageDbConnected ? 'text-green-500' : 'text-red-500'}>
              {dbStatus.pageDbConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <div>
            <span>V 1.0.0</span>
          </div>
          <div>
            <span>Powered By: </span>
            <a href="https://aviraltrendzpvtltd.com" className="text-blue-600">
              https://aviraltrendzpvtltd.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="w-full min-h-0">
      <header className="border-b border-border p-4 -mx-5 -mt-5 mb-0 px-5">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
      </header>

      <div className="py-4 md:py-6">
        <Skeleton className="h-6 w-full max-w-md mb-6" />
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-4" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-4">
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
        </div>
        <div className="bg-card border rounded-lg p-4 mb-6">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-4" />
          <Skeleton className="h-[280px] w-full" />
        </div>
      </div>
    </div>
  );
}
