'use client';

import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DashboardOverviewData } from '@/components/dashboard/dashboardOverviewTypes';

type ReportKind = 'summary' | 'users' | 'pages' | 'blogs' | 'plugins';

function csvEscape(value: unknown): string {
  const raw = value == null ? '' : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ];
  return lines.join('\n');
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function DashboardReportsTab({ data }: { data: DashboardOverviewData }) {
  const [kind, setKind] = useState<ReportKind>('summary');
  const { overview, reports, traffic, generatedAt } = data;

  const preview = useMemo(() => {
    switch (kind) {
      case 'users':
        return {
          columns: ['Username', 'Email', 'Role', 'Active', 'Created'],
          rows: reports.users.map((u) => [
            u.username,
            u.email,
            String(u.role ?? ''),
            u.active ? 'Yes' : 'No',
            formatDate(u.createdAt),
          ]),
        };
      case 'pages':
        return {
          columns: ['Name', 'Slug', 'Published', 'Home', 'Updated'],
          rows: reports.pages.map((p) => [
            p.name,
            p.slug,
            p.isPublished ? 'Yes' : 'No',
            p.isHome ? 'Yes' : 'No',
            formatDate(p.updatedAt),
          ]),
        };
      case 'blogs':
        return {
          columns: ['Title', 'Slug', 'Published', 'Updated'],
          rows: reports.blogs.map((p) => [
            p.name,
            p.slug,
            p.isPublished ? 'Yes' : 'No',
            formatDate(p.updatedAt),
          ]),
        };
      case 'plugins':
        return {
          columns: ['Plugin ID', 'Name', 'Version', 'Active', 'Source', 'Kind'],
          rows: reports.plugins.map((p) => [
            p.pluginId,
            p.name,
            p.version,
            p.isActive ? 'Yes' : 'No',
            p.source,
            p.kind,
          ]),
        };
      default:
        return {
          columns: ['Metric', 'Value'],
          rows: [
            ['Generated at', formatDate(generatedAt)],
            ['Total users', overview.totalUsers],
            ['Active users', overview.activeUsers],
            ['Total pages', overview.totalPages],
            ['Published pages', overview.publishedPages],
            ['Total blog posts', overview.totalBlogs],
            ['Published blog posts', overview.publishedBlogs],
            ['Installed plugins', overview.totalPlugins],
            ['Active plugins', overview.activePlugins],
            ['Forms', overview.totalForms],
            ['Form submissions', overview.totalSubmissions],
            ['Comments', overview.totalComments],
            ['Publish ratio %', overview.publishedRatio],
            ['Blog views (range)', traffic.views],
            ['Unique visitors (range)', traffic.uniqueVisitors],
            ['Searches (range)', traffic.searches],
          ],
        };
    }
  }, [kind, reports, overview, traffic, generatedAt]);

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const csv = toCsv(preview.columns, preview.rows);
    downloadCsv(`cms-${kind}-report-${stamp}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground">
            Preview CMS data and export CSV snapshots for offline use
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={kind} onValueChange={(v) => setKind(v as ReportKind)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">System summary</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="pages">Pages</SelectItem>
              <SelectItem value="blogs">Blog posts</SelectItem>
              <SelectItem value="plugins">Plugins</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStat label="Users in report" value={reports.users.length} />
        <ReportStat label="Pages in report" value={reports.pages.length} />
        <ReportStat label="Blogs in report" value={reports.blogs.length} />
        <ReportStat label="Plugins in report" value={reports.plugins.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {kind === 'summary'
              ? 'System summary'
              : kind === 'users'
                ? 'Users report'
                : kind === 'pages'
                  ? 'Pages report'
                  : kind === 'blogs'
                    ? 'Blog posts report'
                    : 'Plugins report'}
          </CardTitle>
          <CardDescription>
            Showing up to {preview.rows.length} row(s). Generated{' '}
            {formatDate(generatedAt)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {preview.columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={preview.columns.length}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No rows available for this report.
                    </td>
                  </tr>
                ) : (
                  preview.rows.slice(0, 100).map((row, i) => (
                    <tr key={i} className="border-t">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 whitespace-nowrap max-w-[240px] truncate">
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {preview.rows.length > 100 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Preview limited to 100 rows. Full export includes all {preview.rows.length} rows.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}
