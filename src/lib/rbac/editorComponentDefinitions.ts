import { ROLE, type RoleValue } from '@/lib/rbac/roles';

/** Blog editor block types admins can allow per custom role. */
export const EDITOR_COMPONENT_OPTIONS: Array<{ id: string; label: string; group: string }> = [
  { id: 'heading', label: 'Heading', group: 'Text' },
  { id: 'paragraph', label: 'Paragraph', group: 'Text' },
  { id: 'quote', label: 'Quote', group: 'Text' },
  { id: 'code', label: 'Code', group: 'Text' },
  { id: 'image', label: 'Image', group: 'Media' },
  { id: 'gallery', label: 'Gallery', group: 'Media' },
  { id: 'video', label: 'Video', group: 'Media' },
  { id: 'table', label: 'Table', group: 'Layout' },
  { id: 'divider', label: 'Divider', group: 'Layout' },
  { id: 'button', label: 'Button', group: 'Layout' },
  { id: 'faq', label: 'FAQ', group: 'Dynamic' },
  { id: 'newsletter', label: 'Newsletter', group: 'Dynamic' },
  { id: 'author-box', label: 'Author Box', group: 'Dynamic' },
  { id: 'related-posts', label: 'Related Posts', group: 'Dynamic' },
  { id: 'custom-html', label: 'Custom HTML', group: 'Advanced' },
];

const ALL_EDITOR_COMPONENT_IDS = EDITOR_COMPONENT_OPTIONS.map((item) => item.id);

const AUTHOR_EDITOR_COMPONENTS = [
  'heading',
  'paragraph',
  'image',
  'quote',
  'button',
  'divider',
];

export function getDefaultEditorComponentsForBaseRole(baseRole: RoleValue): string[] {
  if (baseRole === ROLE.AUTHOR) return [...AUTHOR_EDITOR_COMPONENTS];
  return [...ALL_EDITOR_COMPONENT_IDS];
}

export function getMaxEditorComponentsForBaseRole(baseRole: RoleValue): string[] {
  return getDefaultEditorComponentsForBaseRole(baseRole);
}

export function validateEditorComponentsSubset(components: string[], baseRole: RoleValue): void {
  const allowed = new Set(getMaxEditorComponentsForBaseRole(baseRole));
  const invalid = components.filter((id) => !allowed.has(id));
  if (invalid.length > 0) {
    throw new Error(`These editor components exceed the selected tier: ${invalid.join(', ')}`);
  }
}

export function normalizeEditorComponents(raw: unknown, baseRole: RoleValue): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return getDefaultEditorComponentsForBaseRole(baseRole);
  }
  const components = [...new Set(raw.map(String))].filter((id) =>
    ALL_EDITOR_COMPONENT_IDS.includes(id)
  );
  if (components.length === 0) {
    throw new Error('Select at least one editor component');
  }
  validateEditorComponentsSubset(components, baseRole);
  return components;
}

export function getEditorComponentGroups(): Array<{
  group: string;
  items: typeof EDITOR_COMPONENT_OPTIONS;
}> {
  const map = new Map<string, typeof EDITOR_COMPONENT_OPTIONS>();
  for (const item of EDITOR_COMPONENT_OPTIONS) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return [...map.entries()].map(([group, items]) => ({ group, items }));
}
