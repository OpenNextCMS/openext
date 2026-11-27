/* eslint-disable @typescript-eslint/no-explicit-any */

export function createId(): string {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 12; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function idString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const v = value as { toHexString?: () => string; _id?: unknown };
    if (typeof v.toHexString === 'function') return v.toHexString();
    if (typeof (value as { toString?: () => string }).toString === 'function') {
      const s = String(value);
      if (s && s !== '[object Object]') return s;
    }
  }
  return String(value);
}

export function isObjectIdLike(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as { _bsontype?: string; toHexString?: () => string };
  return v._bsontype === 'ObjectId' || typeof v.toHexString === 'function';
}

export function toPlain(value: unknown): unknown {
  if (value == null) return value;
  if (isObjectIdLike(value)) return idString(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === 'object') {
    const ctor = (value as object).constructor;
    if (ctor === Object || ctor == null) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (k === '__parent' || k === '$__' || k === '$isNew') continue;
        out[k] = toPlain(v);
      }
      return out;
    }
  }
  return value;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/;

export function revive(value: unknown): unknown {
  if (typeof value === 'string' && ISO_RE.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = revive(v);
    }
    return out;
  }
  return value;
}

export function getPath(obj: unknown, path: string): unknown {
  if (obj == null || !path) return obj;
  const parts = path.split('.');
  let cur: any = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

export function unsetPath(obj: Record<string, unknown>, path: string): void {
  const parts = path.split('.');
  let cur: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur == null) return;
    cur = cur[parts[i]];
  }
  if (cur && typeof cur === 'object') delete cur[parts[parts.length - 1]];
}

function toTime(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (isObjectIdLike(a) || isObjectIdLike(b) || (typeof a === 'string' && typeof b === 'string')) {
    if (idString(a) && idString(a) === idString(b)) return true;
  }
  const ta = toTime(a);
  const tb = toTime(b);
  if (ta != null && tb != null && ta === tb) return true;
  return false;
}

function isOperatorObject(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      !isObjectIdLike(value) &&
      Object.keys(value as object).some((k) => k.startsWith('$'))
  );
}

function arrayContains(arr: unknown[], expected: unknown): boolean {
  return arr.some((item) => valuesEqual(item, expected) || matches(item, expected));
}

function regexFrom(value: unknown, options?: string): RegExp | null {
  if (value instanceof RegExp) return value;
  if (typeof value === 'string') return new RegExp(value, options);
  return null;
}

function matchOperators(docValue: unknown, ops: Record<string, unknown>, doc: unknown, fieldPath: string): boolean {
  for (const [op, expected] of Object.entries(ops)) {
    switch (op) {
      case '$eq':
        if (!valuesEqual(docValue, expected)) return false;
        break;
      case '$ne':
        if (valuesEqual(docValue, expected)) return false;
        break;
      case '$gt':
      case '$gte':
      case '$lt':
      case '$lte': {
        const left = toTime(docValue) ?? (typeof docValue === 'number' ? docValue : Number(docValue));
        const right = toTime(expected) ?? (typeof expected === 'number' ? expected : Number(expected));
        if (left == null || right == null || Number.isNaN(left) || Number.isNaN(right)) return false;
        if (op === '$gt' && !(left > right)) return false;
        if (op === '$gte' && !(left >= right)) return false;
        if (op === '$lt' && !(left < right)) return false;
        if (op === '$lte' && !(left <= right)) return false;
        break;
      }
      case '$in': {
        const list = Array.isArray(expected) ? expected : [];
        if (Array.isArray(docValue)) {
          if (!docValue.some((item) => list.some((e) => valuesEqual(item, e)))) return false;
        } else if (!list.some((e) => valuesEqual(docValue, e))) {
          return false;
        }
        break;
      }
      case '$nin': {
        const list = Array.isArray(expected) ? expected : [];
        if (Array.isArray(docValue)) {
          if (docValue.some((item) => list.some((e) => valuesEqual(item, e)))) return false;
        } else if (list.some((e) => valuesEqual(docValue, e))) {
          return false;
        }
        break;
      }
      case '$exists': {
        const exists = getPath(doc, fieldPath) !== undefined;
        if (Boolean(expected) !== exists) return false;
        break;
      }
      case '$regex': {
        const opts = typeof ops.$options === 'string' ? ops.$options : undefined;
        const re = regexFrom(expected, opts);
        if (!re || typeof docValue !== 'string' || !re.test(docValue)) return false;
        break;
      }
      case '$options':
        break;
      case '$elemMatch':
        if (!Array.isArray(docValue) || !docValue.some((item) => matches(item, expected))) return false;
        break;
      default:
        break;
    }
  }
  return true;
}

export function matches(doc: unknown, filter: unknown): boolean {
  if (filter == null || (typeof filter === 'object' && !Array.isArray(filter) && Object.keys(filter as object).length === 0)) {
    return true;
  }
  if (filter instanceof RegExp) {
    return typeof doc === 'string' && filter.test(doc);
  }
  if (!filter || typeof filter !== 'object') {
    if (Array.isArray(doc)) return arrayContains(doc, filter);
    return valuesEqual(doc, filter);
  }

  const f = filter as Record<string, unknown>;

  if ('$or' in f) {
    const clauses = Array.isArray(f.$or) ? f.$or : [];
    if (!clauses.some((c) => matches(doc, c))) return false;
  }
  if ('$and' in f) {
    const clauses = Array.isArray(f.$and) ? f.$and : [];
    if (!clauses.every((c) => matches(doc, c))) return false;
  }
  if ('$nor' in f) {
    const clauses = Array.isArray(f.$nor) ? f.$nor : [];
    if (clauses.some((c) => matches(doc, c))) return false;
  }
  if ('$not' in f) {
    if (matches(doc, f.$not)) return false;
  }

  for (const [key, expected] of Object.entries(f)) {
    if (key.startsWith('$')) continue;
    const docValue = getPath(doc, key);

    if (expected instanceof RegExp) {
      if (typeof docValue !== 'string' || !expected.test(docValue)) return false;
      continue;
    }

    if (isOperatorObject(expected)) {
      if (!matchOperators(docValue, expected as Record<string, unknown>, doc, key)) return false;
      continue;
    }

    if (Array.isArray(docValue)) {
      if (!arrayContains(docValue, expected)) return false;
      continue;
    }

    if (!valuesEqual(docValue, expected)) return false;
  }

  return true;
}

function clone<T>(value: T): T {
  return structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function findPositionalIndex(doc: Record<string, unknown>, arrayPath: string, query: Record<string, unknown>): number {
  const arr = getPath(doc, arrayPath);
  if (!Array.isArray(arr)) return -1;
  const prefix = `${arrayPath}.`;
  const cond: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(query)) {
    if (k.startsWith(prefix) && !k.slice(prefix.length).includes('.')) {
      cond[k.slice(prefix.length)] = v;
    }
  }
  if (Object.keys(cond).length === 0) return arr.length ? 0 : -1;
  return arr.findIndex((item) => matches(item, cond));
}

/**
 * Mongo-compatible upsert: equality filter fields (e.g. `{ slug: 'dark' }`)
 * are copied onto the inserted document when they are not operators.
 */
export function mergeEqualityFilter(
  doc: Record<string, unknown>,
  filter: Record<string, unknown> = {}
): Record<string, unknown> {
  const next = { ...doc };
  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith('$')) continue;
    if (value !== null && typeof value === 'object' && !(value instanceof Date) && !isObjectIdLike(value)) {
      continue;
    }
    if (next[key] === undefined) next[key] = toPlain(value);
  }
  return next;
}

export function applyUpdate(
  doc: Record<string, unknown>,
  update: Record<string, unknown>,
  query: Record<string, unknown> = {},
  isInsert = false
): Record<string, unknown> {
  const next = clone(doc);
  const keys = Object.keys(update);
  const hasOps = keys.some((k) => k.startsWith('$'));

  const applySet = (patch: Record<string, unknown>) => {
    for (const [path, value] of Object.entries(patch)) {
      if (path.includes('.$')) {
        const [arrayPath, rest] = path.split('.$.');
        const idx = findPositionalIndex(next, arrayPath, query);
        if (idx < 0) continue;
        const arr = getPath(next, arrayPath) as unknown[];
        if (rest) setPath(arr[idx] as Record<string, unknown>, rest, toPlain(value));
        else arr[idx] = toPlain(value);
      } else {
        setPath(next, path, toPlain(value));
      }
    }
  };

  if (!hasOps) {
    applySet(update);
    return next;
  }

  if (update.$set && typeof update.$set === 'object') {
    applySet(update.$set as Record<string, unknown>);
  }
  if (update.$unset && typeof update.$unset === 'object') {
    for (const path of Object.keys(update.$unset as object)) unsetPath(next, path);
  }
  if (update.$inc && typeof update.$inc === 'object') {
    for (const [path, amount] of Object.entries(update.$inc as Record<string, number>)) {
      const n = Number(amount) || 0;
      if (path.includes('.$')) {
        const [arrayPath, rest] = path.split('.$.');
        const idx = findPositionalIndex(next, arrayPath, query);
        if (idx < 0) continue;
        const arr = getPath(next, arrayPath) as any[];
        const current = rest ? Number(getPath(arr[idx], rest) || 0) : Number(arr[idx] || 0);
        if (rest) setPath(arr[idx], rest, current + n);
        else arr[idx] = current + n;
      } else {
        const current = Number(getPath(next, path) || 0);
        setPath(next, path, current + n);
      }
    }
  }
  if (update.$push && typeof update.$push === 'object') {
    for (const [path, value] of Object.entries(update.$push as Record<string, unknown>)) {
      const current = getPath(next, path);
      const arr = Array.isArray(current) ? current : [];
      if (value && typeof value === 'object' && '$each' in (value as object)) {
        arr.push(...((value as { $each: unknown[] }).$each || []).map(toPlain));
      } else {
        arr.push(toPlain(value));
      }
      setPath(next, path, arr);
    }
  }
  if (update.$addToSet && typeof update.$addToSet === 'object') {
    for (const [path, value] of Object.entries(update.$addToSet as Record<string, unknown>)) {
      const current = getPath(next, path);
      const arr = Array.isArray(current) ? current : [];
      if (!arr.some((item) => valuesEqual(item, value))) arr.push(toPlain(value));
      setPath(next, path, arr);
    }
  }
  if (update.$pull && typeof update.$pull === 'object') {
    for (const [path, cond] of Object.entries(update.$pull as Record<string, unknown>)) {
      const current = getPath(next, path);
      if (!Array.isArray(current)) continue;
      const nextArr = current.filter((item) => {
        if (cond && typeof cond === 'object' && !isObjectIdLike(cond) && !(cond instanceof Date)) {
          return !matches(item, cond);
        }
        return !valuesEqual(item, cond);
      });
      setPath(next, path, nextArr);
    }
  }
  if (isInsert && update.$setOnInsert && typeof update.$setOnInsert === 'object') {
    applySet(update.$setOnInsert as Record<string, unknown>);
  }
  if (update.$max && typeof update.$max === 'object') {
    for (const [path, value] of Object.entries(update.$max as Record<string, unknown>)) {
      const current = getPath(next, path);
      if (current == null) {
        setPath(next, path, toPlain(value));
        continue;
      }
      const curN = Number(current);
      const valN = Number(value);
      if (!Number.isNaN(curN) && !Number.isNaN(valN)) {
        if (valN > curN) setPath(next, path, toPlain(value));
        continue;
      }
      const curT = current instanceof Date ? current.getTime() : Date.parse(String(current));
      const valT = value instanceof Date ? value.getTime() : Date.parse(String(value));
      if (!Number.isNaN(curT) && !Number.isNaN(valT)) {
        if (valT > curT) setPath(next, path, toPlain(value));
        continue;
      }
      if (String(value) > String(current)) setPath(next, path, toPlain(value));
    }
  }

  return next;
}

function resolveGroupId(doc: Record<string, unknown>, idExpr: unknown): unknown {
  if (idExpr == null) return null;
  if (typeof idExpr === 'string' && idExpr.startsWith('$')) return getPath(doc, idExpr.slice(1));
  if (idExpr && typeof idExpr === 'object' && '$dateToString' in (idExpr as object)) {
    const spec = (idExpr as { $dateToString: { date: string; format?: string } }).$dateToString;
    const dateVal = typeof spec.date === 'string' && spec.date.startsWith('$')
      ? getPath(doc, spec.date.slice(1))
      : spec.date;
    const d = dateVal instanceof Date ? dateVal : new Date(String(dateVal));
    if (Number.isNaN(d.getTime())) return null;
    const iso = d.toISOString();
    if (!spec.format || spec.format === '%Y-%m-%d') return iso.slice(0, 10);
    if (spec.format === '%Y-%m') return iso.slice(0, 7);
    if (spec.format === '%Y') return iso.slice(0, 4);
    return iso;
  }
  return idExpr;
}

function resolveAggValue(doc: Record<string, unknown>, value: unknown): unknown {
  if (value === 1 || value === 0 || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string' && value.startsWith('$')) {
    return getPath(doc, value.slice(1));
  }
  if (value && typeof value === 'object' && '$cond' in (value as object)) {
    return evalCond(doc, (value as { $cond: unknown }).$cond);
  }
  return value;
}

function evalCond(doc: Record<string, unknown>, condExpr: unknown): unknown {
  let condition: unknown;
  let trueVal: unknown;
  let falseVal: unknown;

  if (Array.isArray(condExpr) && condExpr.length >= 3) {
    [condition, trueVal, falseVal] = condExpr;
  } else if (condExpr && typeof condExpr === 'object' && 'if' in (condExpr as object)) {
    const c = condExpr as { if: unknown; then: unknown; else?: unknown };
    condition = c.if;
    trueVal = c.then;
    falseVal = c.else;
  } else {
    return null;
  }

  const ok = evalCondPredicate(doc, condition);
  return resolveAggValue(doc, ok ? trueVal : falseVal);
}

function evalCondPredicate(doc: Record<string, unknown>, condition: unknown): boolean {
  if (condition === true || condition === false) return condition;
  if (condition == null) return false;
  if (typeof condition === 'string' && condition.startsWith('$')) {
    return Boolean(getPath(doc, condition.slice(1)));
  }
  if (condition && typeof condition === 'object') {
    const c = condition as Record<string, unknown>;
    if ('$eq' in c && Array.isArray(c.$eq) && c.$eq.length >= 2) {
      return valuesEqual(resolveAggValue(doc, c.$eq[0]), resolveAggValue(doc, c.$eq[1]));
    }
    if ('$ne' in c && Array.isArray(c.$ne) && c.$ne.length >= 2) {
      return !valuesEqual(resolveAggValue(doc, c.$ne[0]), resolveAggValue(doc, c.$ne[1]));
    }
    if ('$gt' in c && Array.isArray(c.$gt) && c.$gt.length >= 2) {
      return Number(resolveAggValue(doc, c.$gt[0])) > Number(resolveAggValue(doc, c.$gt[1]));
    }
    if ('$gte' in c && Array.isArray(c.$gte) && c.$gte.length >= 2) {
      return Number(resolveAggValue(doc, c.$gte[0])) >= Number(resolveAggValue(doc, c.$gte[1]));
    }
    if ('$lt' in c && Array.isArray(c.$lt) && c.$lt.length >= 2) {
      return Number(resolveAggValue(doc, c.$lt[0])) < Number(resolveAggValue(doc, c.$lt[1]));
    }
    if ('$lte' in c && Array.isArray(c.$lte) && c.$lte.length >= 2) {
      return Number(resolveAggValue(doc, c.$lte[0])) <= Number(resolveAggValue(doc, c.$lte[1]));
    }
    // Query-style predicate: { status: 'done' }
    if (!Object.keys(c).some((k) => k.startsWith('$'))) {
      return matches(doc, c);
    }
  }
  return Boolean(condition);
}

function accumulate(acc: Record<string, unknown>, spec: Record<string, unknown>, doc: Record<string, unknown>) {
  for (const [field, expr] of Object.entries(spec)) {
    if (field === '_id') continue;
    if (!expr || typeof expr !== 'object') continue;
    const e = expr as Record<string, unknown>;
    if ('$sum' in e) {
      const sumExpr = e.$sum;
      let add = 0;
      if (sumExpr === 1) {
        add = 1;
      } else if (sumExpr && typeof sumExpr === 'object' && '$cond' in (sumExpr as object)) {
        add = Number(evalCond(doc, (sumExpr as { $cond: unknown }).$cond) || 0);
      } else if (typeof sumExpr === 'string') {
        add = Number(getPath(doc, String(sumExpr).replace(/^\$/, '')) || 0);
      } else {
        add = Number(sumExpr || 0);
      }
      acc[field] = Number(acc[field] || 0) + add;
    } else if ('$avg' in e) {
      const path = String(e.$avg).replace(/^\$/, '');
      const n = Number(getPath(doc, path) || 0);
      const bucket = (acc[field] as { sum: number; count: number }) || { sum: 0, count: 0 };
      bucket.sum += n;
      bucket.count += 1;
      acc[field] = bucket;
    }
  }
}

export function runAggregate(docs: Record<string, unknown>[], pipeline: unknown[]): unknown[] {
  let current: any[] = docs;
  for (const stage of pipeline) {
    if (!stage || typeof stage !== 'object') continue;
    const s = stage as Record<string, unknown>;
    if (s.$match) {
      current = current.filter((d) => matches(d, s.$match));
    } else if (s.$sort && typeof s.$sort === 'object') {
      const sort = s.$sort as Record<string, number>;
      current = [...current].sort((a, b) => compareSort(a, b, sort));
    } else if (s.$limit != null) {
      current = current.slice(0, Number(s.$limit));
    } else if (s.$skip != null) {
      current = current.slice(Number(s.$skip));
    } else if (s.$group && typeof s.$group === 'object') {
      const group = s.$group as Record<string, unknown>;
      const buckets = new Map<string, { id: unknown; acc: Record<string, unknown> }>();
      for (const doc of current) {
        const id = resolveGroupId(doc, group._id);
        const key = JSON.stringify(id);
        if (!buckets.has(key)) buckets.set(key, { id, acc: {} });
        accumulate(buckets.get(key)!.acc, group, doc);
      }
      current = [...buckets.values()].map(({ id, acc }) => {
        const out: Record<string, unknown> = { _id: id };
        for (const [k, v] of Object.entries(acc)) {
          if (v && typeof v === 'object' && 'sum' in (v as object) && 'count' in (v as object)) {
            const b = v as { sum: number; count: number };
            out[k] = b.count ? b.sum / b.count : 0;
          } else {
            out[k] = v;
          }
        }
        return out;
      });
    } else if (s.$project && typeof s.$project === 'object') {
      const proj = s.$project as Record<string, unknown>;
      current = current.map((doc) => applyProjection(doc, proj));
    }
  }
  return current;
}

export function compareSort(a: Record<string, unknown>, b: Record<string, unknown>, sort: Record<string, number>): number {
  for (const [field, dir] of Object.entries(sort)) {
    const av = getPath(a, field);
    const bv = getPath(b, field);
    const at = toTime(av);
    const bt = toTime(bv);
    let cmp = 0;
    if (at != null && bt != null) cmp = at - bt;
    else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
    if (cmp !== 0) return dir < 0 ? -cmp : cmp;
  }
  return 0;
}

export function applyProjection(doc: Record<string, unknown>, projection: unknown): Record<string, unknown> {
  if (!projection) return doc;
  if (typeof projection === 'string') {
    const parts = projection.trim().split(/\s+/).filter(Boolean);
    if (parts.some((p) => p.startsWith('-') && p !== '-_id')) {
      const out = { ...doc };
      for (const p of parts) {
        if (p.startsWith('-')) unsetPath(out, p.slice(1));
      }
      return out;
    }
    const out: Record<string, unknown> = { _id: doc._id };
    for (const p of parts) {
      if (p.startsWith('+') || p.startsWith('-')) continue;
      const val = getPath(doc, p);
      if (val !== undefined) setPath(out, p, val);
    }
    return out;
  }
  if (typeof projection === 'object') {
    const proj = projection as Record<string, unknown>;
    const entries = Object.entries(proj);
    const excluding = entries.some(([, v]) => v === 0 || v === false);
    if (excluding) {
      const out = { ...doc };
      for (const [k, v] of entries) {
        if (v === 0 || v === false) unsetPath(out, k);
      }
      return out;
    }
    const out: Record<string, unknown> = {};
    if (proj._id !== 0 && proj._id !== false) out._id = doc._id;
    for (const [k, v] of entries) {
      if (k === '_id') continue;
      if (v) {
        const val = getPath(doc, k);
        if (val !== undefined) setPath(out, k, val);
      }
    }
    return out;
  }
  return doc;
}

export function applySchemaDefaults(schema: any, doc: Record<string, unknown>): Record<string, unknown> {
  if (!schema?.paths) return doc;
  const out = { ...doc };
  for (const [key, path] of Object.entries(schema.paths as Record<string, any>)) {
    if (key === '_id' || key === '__v') continue;
    if (out[key] !== undefined) continue;
    const def = path.defaultValue;
    if (def === undefined) continue;
    out[key] = typeof def === 'function' ? def() : clone(def);
  }
  return out;
}

export function schemaHasTimestamps(schema: any): boolean {
  const t = schema?.options?.timestamps;
  return t === true || (t && typeof t === 'object');
}
