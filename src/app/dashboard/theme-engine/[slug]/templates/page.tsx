'use client';
import { apiUrl } from '@/lib/apiClient';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Layers, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TemplateRow {
  key: string;
  name: string;
  file: string;
  type: string;
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json?.error?.message || `Request failed (${res.status})`);
  return json.data as T;
}

export default function ThemeTemplatesPage() {
  const params = useParams();
  const slug = String(params.slug ?? '');
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await unwrap<{ templates: TemplateRow[]; slug: string }>(
        await fetch(apiUrl(`/api/theme-engine/themes/${encodeURIComponent(slug)}/templates`))
      );
      setTemplates(data.templates);
      const preferred =
        data.templates.find((t) => t.key === 'home')?.key ??
        data.templates.find((t) => t.key === 'index')?.key ??
        data.templates[0]?.key ??
        '';
      setPreviewKey(preferred);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/theme-engine/${encodeURIComponent(slug)}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Layers className="h-6 w-6" /> Theme Templates
          </h1>
          <p className="text-sm text-muted-foreground">{slug}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <p className="text-muted-foreground">No templates registered for this theme.</p>
      ) : (
        <>
          {previewKey && (
            <div className="overflow-hidden rounded-xl border bg-neutral-900">
              <iframe
                key={previewKey}
                src={`/theme-engine-card-preview/${encodeURIComponent(slug)}?compose=1&template=${encodeURIComponent(previewKey)}`}
                title={`Preview ${previewKey}`}
                className="h-72 w-full border-0 md:h-96"
              />
            </div>
          )}

          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="w-[100px]">Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.key} className={previewKey === t.key ? 'bg-muted/40' : undefined}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.key}</TableCell>
                    <TableCell>{t.type}</TableCell>
                    <TableCell className="text-muted-foreground">{t.file}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={previewKey === t.key ? 'default' : 'outline'}
                        onClick={() => setPreviewKey(t.key)}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
