'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from 'recharts';
import { Eye, MousePointerClick, CheckCircle2, Percent, Loader2 } from 'lucide-react';
import { FormBuilderGate } from '@/components/form-builder/FormBuilderGate';
import { formApi } from '@/components/form-builder/api';
import type { AnalyticsSummary } from '@/types/form-builder';

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Analytics() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    formApi
      .analytics(id)
      .then(setData)
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading analytics…
      </div>
    );
  }
  if (!data) return <div className="p-6 text-muted-foreground">No analytics available.</div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={<Eye className="h-4 w-4" />} label="Views" value={data.views} />
        <StatCard icon={<MousePointerClick className="h-4 w-4" />} label="Starts" value={data.starts} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Completions" value={data.completions} />
        <StatCard icon={<Percent className="h-4 w-4" />} label="Conversion" value={`${data.conversionRate.toFixed(1)}%`} />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">Submissions over time</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.timeline}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <RTooltip />
              <Area type="monotone" dataKey="views" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} />
              <Area type="monotone" dataKey="completions" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">Field drop-off</h2>
        {data.dropOffByField.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drop-off recorded yet.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dropOffByField} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="label" width={140} fontSize={12} />
                <RTooltip />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <FormBuilderGate>
      <Analytics />
    </FormBuilderGate>
  );
}
