/**
 * Split a CMS document between SQL columns (indexed / browsable fields) and a
 * partial JSON `doc` blob (everything else). Keeps multi-DB parity: the app
 * still sees a full merged document on read.
 */
import { getPath, revive, setPath, toPlain, unsetPath } from './queryEngine';
import { NAVIGABLE_COLUMNS, type NavigableColumn } from './navigableColumns';

/** Top-level document key from a JSON path like `$.email` → `email`. */
export function docFieldKey(jsonPath: string): string | null {
  const m = jsonPath.match(/^\$\.([A-Za-z_][A-Za-z0-9_]*)$/);
  return m ? m[1] : null;
}

function nestedPath(jsonPath: string): string {
  return jsonPath.replace(/^\$\.?/, '');
}

export function serializeColumnValue(col: NavigableColumn, value: unknown): unknown {
  if (value == null) return null;
  switch (col.type) {
    case 'bool':
      return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
    case 'int':
      return Number(value);
    case 'datetime': {
      if (value instanceof Date) return value;
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    default:
      return String(value);
  }
}

export function deserializeColumnValue(col: NavigableColumn, value: unknown): unknown {
  if (value == null) return undefined;
  switch (col.type) {
    case 'bool':
      return value === 1 || value === true || value === '1';
    case 'int':
      return Number(value);
    case 'datetime':
      if (value instanceof Date) return value;
      {
        const d = new Date(String(value));
        return Number.isNaN(d.getTime()) ? undefined : d;
      }
    default:
      return String(value);
  }
}

/** Fields stored outside `doc` — never duplicated in the JSON blob on write. */
const ROW_META_KEYS = new Set(['_id', 'createdAt', 'updatedAt', '__v']);

export function splitDocumentForStorage(
  tableName: string,
  doc: Record<string, unknown>
): { overflow: Record<string, unknown>; columns: Record<string, unknown> } {
  const defs = NAVIGABLE_COLUMNS[tableName] || [];
  const plain = (toPlain(doc) || {}) as Record<string, unknown>;
  const overflow: Record<string, unknown> = { ...plain };
  const columns: Record<string, unknown> = {};

  for (const col of defs) {
    const topKey = docFieldKey(col.path);
    let value: unknown;
    if (topKey) {
      value = plain[topKey];
      delete overflow[topKey];
    } else {
      value = getPath(plain, nestedPath(col.path));
      unsetPath(overflow, nestedPath(col.path));
    }
    columns[col.name] = serializeColumnValue(col, value);
  }

  for (const key of ROW_META_KEYS) {
    delete overflow[key];
  }

  return { overflow, columns };
}

export function mergeRowToDocument(
  tableName: string,
  row: Record<string, unknown>
): Record<string, unknown> {
  let rawDoc = row.doc;
  if (typeof rawDoc === 'string') {
    try {
      rawDoc = JSON.parse(rawDoc);
    } catch {
      rawDoc = {};
    }
  }

  const merged = (revive(rawDoc) || {}) as Record<string, unknown>;
  const defs = NAVIGABLE_COLUMNS[tableName] || [];

  for (const col of defs) {
    const sqlVal = row[col.name];
    if (sqlVal === undefined || sqlVal === null) continue;
    const docVal = deserializeColumnValue(col, sqlVal);
    const topKey = docFieldKey(col.path);
    if (topKey) {
      merged[topKey] = docVal;
    } else {
      setPath(merged, nestedPath(col.path), docVal);
    }
  }

  merged._id = row._id ?? merged._id;
  if (row.createdAt != null) merged.createdAt = row.createdAt;
  if (row.updatedAt != null) merged.updatedAt = row.updatedAt;

  return merged;
}

export function navigableColumnNames(tableName: string): string[] {
  return (NAVIGABLE_COLUMNS[tableName] || []).map((c) => c.name);
}
