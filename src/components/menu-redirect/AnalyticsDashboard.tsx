'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Loader2, MousePointerClick } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Item {
  mappingId: string;
  menuItemId: string;
  targetUrl: string;
  clicks: number;
  share: number;
}
interface Summary {
  range: string;
  totalClicks: number;
  mostClicked: Item[];
  leastClicked: Item[];
}
type Range = '7d' | '30d' | 'all';

export default function AnalyticsDashboard() {
  const [range, setRange] = useState<Range>('7d');
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/menu-redirect/analytics?range=${range}`)
      .then((r) => r.json())
      .then((res) => setData(res?.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Menu Redirect — Analytics</h1>
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
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MousePointerClick className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total clicks</p>
                <p className="text-2xl font-bold">{data.totalClicks.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Most clicked menu items</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {data.mostClicked.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.mostClicked} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis type="category" dataKey="menuItemId" width={120} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="clicks" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No clicks recorded for this range.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Least clicked</CardTitle>
            </CardHeader>
            <CardContent>
              {data.leastClicked.length ? (
                <ul className="divide-y">
                  {data.leastClicked.map((i) => (
                    <li key={i.mappingId} className="flex items-center justify-between py-2 text-sm">
                      <div className="min-w-0">
                        <span className="font-medium">{i.menuItemId}</span>
                        <span className="ml-2 truncate text-xs text-muted-foreground">{i.targetUrl}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {i.clicks} ({i.share}%)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No data.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
