'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setBlocks, updateBlockContent } from '@/redux/canvasSlice';
import type { BlockData } from '@/redux/canvasSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  parseThemeSectionContent,
  serializeThemeSectionContent,
} from '@/modules/themeEngine/sectionSchema';
import type { ThemeSectionFieldSchema } from '@/modules/themeEngine/types';

type SectionMeta = {
  id: string;
  label: string;
  blockType: string;
  fields: ThemeSectionFieldSchema[];
};

interface Props {
  themeSlug: string;
  pageSlug: string;
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onDraftPreview: (blocks: BlockData[]) => void;
}

export default function ThemeSectionInspector({
  themeSlug,
  pageSlug,
  selectedSectionId,
  onSelectSection,
  onDraftPreview,
}: Props) {
  const dispatch = useAppDispatch();
  const blocks = useAppSelector((s) => s.canvas.blocks);
  const [loading, setLoading] = useState(true);
  const [hasEditable, setHasEditable] = useState(false);
  const [sectionsMeta, setSectionsMeta] = useState<SectionMeta[]>([]);
  const [themeSettings, setThemeSettings] = useState<
    Array<{ key: string; label: string; type: string; default: unknown }>
  >([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/theme-engine/themes/${encodeURIComponent(themeSlug)}/sections`, {
      credentials: 'include',
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json?.error?.message || 'Failed to load sections');
        return json.data as {
          hasEditableSections: boolean;
          sections: SectionMeta[];
          themeSettings: Array<{ key: string; label: string; type: string; default: unknown }>;
        };
      })
      .then((data) => {
        if (!alive) return;
        setHasEditable(data.hasEditableSections);
        setSectionsMeta(data.sections || []);
        setThemeSettings(data.themeSettings || []);
      })
      .catch((err) => {
        if (alive) toast.error((err as Error).message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [themeSlug]);

  const sectionBlocks = useMemo(() => {
    return blocks.filter((b) => {
      if (b.type === 'theme-engine-frame') return false;
      return Boolean(parseThemeSectionContent(b.content));
    });
  }, [blocks]);

  const selectedBlock = useMemo(() => {
    if (!selectedSectionId) return null;
    return (
      sectionBlocks.find((b) => parseThemeSectionContent(b.content)?.sectionId === selectedSectionId) ||
      null
    );
  }, [sectionBlocks, selectedSectionId]);

  const selectedMeta = sectionsMeta.find((s) => s.id === selectedSectionId);
  const selectedParsed = selectedBlock ? parseThemeSectionContent(selectedBlock.content) : null;

  const pushDraft = useCallback(
    (nextBlocks: BlockData[]) => {
      onDraftPreview(nextBlocks);
    },
    [onDraftPreview]
  );

  const updateSelectedData = (key: string, value: unknown) => {
    if (!selectedBlock || !selectedParsed) return;
    const next = serializeThemeSectionContent({
      ...selectedParsed,
      data: { ...selectedParsed.data, [key]: value },
    });
    dispatch(updateBlockContent({ id: selectedBlock.uniqueId || '', content: next }));
    const nextBlocks = blocks.map((b) =>
      b.uniqueId === selectedBlock.uniqueId ? { ...b, content: next } : b
    );
    pushDraft(nextBlocks);
  };

  const toggleHidden = (sectionId: string) => {
    const block = sectionBlocks.find((b) => parseThemeSectionContent(b.content)?.sectionId === sectionId);
    const parsed = block ? parseThemeSectionContent(block.content) : null;
    if (!block || !parsed) return;
    const next = serializeThemeSectionContent({ ...parsed, hidden: !parsed.hidden });
    dispatch(updateBlockContent({ id: block.uniqueId || '', content: next }));
    const nextBlocks = blocks.map((b) => (b.uniqueId === block.uniqueId ? { ...b, content: next } : b));
    pushDraft(nextBlocks);
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    const frame = blocks.find((b) => b.type === 'theme-engine-frame');
    const others = blocks.filter((b) => b.type !== 'theme-engine-frame');
    const idx = others.findIndex((b) => parseThemeSectionContent(b.content)?.sectionId === sectionId);
    if (idx < 0) return;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= others.length) return;
    const copy = [...others];
    const [item] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, item);
    const nextBlocks = frame ? [frame, ...copy] : copy;
    dispatch(setBlocks(nextBlocks));
    pushDraft(nextBlocks);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 border-t border-white/10 bg-neutral-900 px-3 py-3 text-xs text-neutral-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading section schema…
      </div>
    );
  }

  if (!hasEditable) {
    return (
      <div className="border-t border-white/10 bg-neutral-900 px-3 py-3 text-[11px] text-neutral-500">
        Exact theme render is active. This package does not declare{' '}
        <code className="text-neutral-300">editableSections</code>, so structural section editing is
        unavailable. You can still change theme settings / menu from the dashboard.
        {themeSettings.length > 0 ? (
          <span className="mt-1 block text-neutral-400">
            Declared settings: {themeSettings.map((s) => s.label).join(', ')}.
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="border-t border-white/10 bg-neutral-900 text-neutral-200">
      <div className="flex flex-wrap gap-1.5 border-b border-white/10 px-3 py-2">
        {sectionsMeta.map((section) => {
          const parsed = sectionBlocks
            .map((b) => parseThemeSectionContent(b.content))
            .find((p) => p?.sectionId === section.id);
          const active = selectedSectionId === section.id;
          return (
            <button
              key={section.id}
              type="button"
              className={`rounded px-2 py-1 text-[11px] ${
                active ? 'bg-sky-500 text-white' : 'bg-white/5 text-neutral-300 hover:bg-white/10'
              } ${parsed?.hidden ? 'opacity-50 line-through' : ''}`}
              onClick={() => onSelectSection(section.id)}
            >
              {section.label}
            </button>
          );
        })}
      </div>

      {selectedMeta && selectedParsed && selectedBlock ? (
        <div className="space-y-3 px-3 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{selectedMeta.label}</h3>
            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-neutral-300"
                onClick={() => moveSection(selectedMeta.id, -1)}
                title="Move up"
              >
                <GripVertical className="h-3 w-3 rotate-90" />
                Up
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-neutral-300"
                onClick={() => moveSection(selectedMeta.id, 1)}
                title="Move down"
              >
                Down
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-neutral-300"
                onClick={() => toggleHidden(selectedMeta.id)}
              >
                {selectedParsed.hidden ? (
                  <>
                    <Eye className="mr-1 h-3 w-3" /> Show
                  </>
                ) : (
                  <>
                    <EyeOff className="mr-1 h-3 w-3" /> Hide
                  </>
                )}
              </Button>
            </div>
          </div>

          {(selectedMeta.fields.length ? selectedMeta.fields : [{ key: '_empty', label: 'No fields', type: 'text' as const }]).map(
            (field) => {
              if (field.key === '_empty') {
                return (
                  <p key="empty" className="text-[11px] text-neutral-500">
                    No schema fields for this section.
                  </p>
                );
              }
              const value = selectedParsed.data[field.key];
              return (
                <label key={field.key} className="block space-y-1 text-[11px]">
                  <span className="text-neutral-400">{field.label}</span>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="min-h-[72px] w-full rounded border border-white/10 bg-neutral-950 px-2 py-1.5 text-xs text-white"
                      value={String(value ?? '')}
                      onChange={(e) => updateSelectedData(field.key, e.target.value)}
                    />
                  ) : field.type === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => updateSelectedData(field.key, e.target.checked)}
                      className="h-4 w-4"
                    />
                  ) : field.type === 'select' ? (
                    <select
                      className="w-full rounded border border-white/10 bg-neutral-950 px-2 py-1.5 text-xs text-white"
                      value={String(value ?? '')}
                      onChange={(e) => updateSelectedData(field.key, e.target.value)}
                    >
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'list' ? (
                    <ListFieldEditor
                      fields={field.itemFields || []}
                      value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
                      onChange={(next) => updateSelectedData(field.key, next)}
                    />
                  ) : (
                    <Input
                      type={field.type === 'number' ? 'number' : field.type === 'color' ? 'color' : 'text'}
                      className="h-8 border-white/10 bg-neutral-950 text-xs text-white"
                      value={String(value ?? '')}
                      onChange={(e) =>
                        updateSelectedData(
                          field.key,
                          field.type === 'number' ? Number(e.target.value) : e.target.value
                        )
                      }
                    />
                  )}
                </label>
              );
            }
          )}
          <p className="text-[10px] text-neutral-500">
            Changes update the live preview. Save the page from the editor toolbar to persist.
            Page: <code>{pageSlug}</code>
          </p>
        </div>
      ) : (
        <p className="px-3 py-3 text-[11px] text-neutral-500">
          Click a section in the preview (or a chip above) to edit its content.
        </p>
      )}
    </div>
  );
}

function ListFieldEditor({
  fields,
  value,
  onChange,
}: {
  fields: ThemeSectionFieldSchema[];
  value: Record<string, unknown>[];
  onChange: (next: Record<string, unknown>[]) => void;
}) {
  return (
    <div className="space-y-2 rounded border border-white/10 p-2">
      {value.map((item, index) => (
        <div key={index} className="space-y-1 rounded bg-black/30 p-2">
          <div className="flex items-center justify-between text-[10px] text-neutral-500">
            <span>Item {index + 1}</span>
            <button
              type="button"
              className="text-red-300 hover:text-red-200"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
          {fields.map((field) => (
            <Input
              key={field.key}
              className="h-7 border-white/10 bg-neutral-950 text-xs text-white"
              placeholder={field.label}
              value={String(item[field.key] ?? '')}
              onChange={(e) => {
                const next = value.map((row, i) =>
                  i === index ? { ...row, [field.key]: e.target.value } : row
                );
                onChange(next);
              }}
            />
          ))}
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-7 text-xs"
        onClick={() => {
          const blank: Record<string, unknown> = {};
          for (const f of fields) blank[f.key] = '';
          onChange([...value, blank]);
        }}
      >
        Add item
      </Button>
    </div>
  );
}
