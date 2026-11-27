/* eslint-disable @typescript-eslint/no-explicit-any */
import pg from 'pg';
import mongoose from 'mongoose';
import {
  getPostgresConfig,
  resolvePostgresDatabaseName,
  sanitizePostgresIdent,
  type PostgresCredentials,
} from '@/lib/db/config';
import { POSTGRES_CMS_TABLES } from './tables';
import {
  NAVIGABLE_COLUMNS,
  browseViewName,
  indexNameFor,
  type NavigableColumn,
} from '@/lib/db/mysql/navigableColumns';
import {
  mergeRowToDocument,
  navigableColumnNames,
  splitDocumentForStorage,
} from '@/lib/db/mysql/documentSplit';
import {
  applyProjection,
  applySchemaDefaults,
  applyUpdate,
  compareSort,
  createId,
  idString,
  matches,
  mergeEqualityFilter,
  runAggregate,
  schemaHasTimestamps,
} from '@/lib/db/mysql/queryEngine';

export type PostgresConnConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
};

function normalizeConfig(input?: PostgresCredentials | PostgresConnConfig): PostgresConnConfig {
  const fallback = getPostgresConfig();
  const database =
    input && 'database' in input && input.database ? String(input.database).trim() : undefined;
  return {
    host: String(input?.host || fallback.host),
    port: Number(input?.port || fallback.port || 5432),
    user: String(input?.user || fallback.user),
    password: String(input?.password ?? fallback.password ?? ''),
    ...(database ? { database } : {}),
  };
}

type PostgresRuntimeStore = {
  pool: pg.Pool | null;
  poolKey: string;
  poolCreating: Promise<pg.Pool> | null;
  connections: Map<string, PostgresConnection>;
  schemaReadyFor: string | null;
  schemaPromise: Promise<void> | null;
  ensuredTables: Set<string>;
};

const globalPostgres = globalThis as typeof globalThis & {
  __nextcmsPostgres?: PostgresRuntimeStore;
};

function getPostgresStore(): PostgresRuntimeStore {
  if (!globalPostgres.__nextcmsPostgres) {
    globalPostgres.__nextcmsPostgres = {
      pool: null,
      poolKey: '',
      poolCreating: null,
      connections: new Map(),
      schemaReadyFor: null,
      schemaPromise: null,
      ensuredTables: new Set(),
    };
  }
  return globalPostgres.__nextcmsPostgres;
}

function configKey(cfg: PostgresConnConfig): string {
  return `${cfg.host}:${cfg.port}:${cfg.user}:${cfg.password}:${cfg.database || ''}`;
}

function qIdent(name: string): string {
  return `"${sanitizePostgresIdent(name)}"`;
}

function cmsDatabaseName(input?: PostgresCredentials | PostgresConnConfig): string {
  return resolvePostgresDatabaseName(input);
}

function cmsTable(tableName: string): string {
  return `public.${qIdent(tableName)}`;
}

function tableCacheKey(tableName: string, input?: PostgresCredentials | PostgresConnConfig): string {
  return `${cmsDatabaseName(input)}::${tableName}`;
}

function storedColumnDdl(col: NavigableColumn): string {
  switch (col.type) {
    case 'int':
      return `${qIdent(col.name)} INTEGER NULL`;
    case 'bool':
      return `${qIdent(col.name)} BOOLEAN NULL`;
    case 'datetime':
      return `${qIdent(col.name)} TIMESTAMPTZ NULL`;
    default:
      return `${qIdent(col.name)} VARCHAR(${col.length || 255}) NULL`;
  }
}

function placeholders(count: number, start = 1): string {
  return Array.from({ length: count }, (_, i) => `$${start + i}`).join(', ');
}

async function withAdminClient<T>(
  cfg: PostgresConnConfig,
  fn: (client: pg.Client) => Promise<T>
): Promise<T> {
  const client = new pg.Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: 'postgres',
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function getPostgresPool(
  input?: PostgresCredentials | PostgresConnConfig
): Promise<pg.Pool> {
  const cfg = normalizeConfig(input);
  const dbName = cmsDatabaseName(cfg);
  const key = `${configKey(cfg)}::pool::${dbName}`;
  const store = getPostgresStore();
  if (store.pool && store.poolKey === key) return store.pool;
  if (store.poolCreating) return store.poolCreating;

  store.poolCreating = (async () => {
    if (store.pool) {
      await store.pool.end().catch(() => undefined);
      store.pool = null;
    }
    await ensurePostgresDatabase(dbName, cfg);
    const created = new pg.Pool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: dbName,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });
    store.pool = created;
    store.poolKey = key;
    return created;
  })();

  try {
    return await store.poolCreating;
  } finally {
    store.poolCreating = null;
  }
}

export async function closePostgresPool(): Promise<void> {
  const store = getPostgresStore();
  if (store.pool) {
    await store.pool.end().catch(() => undefined);
  }
  store.pool = null;
  store.poolKey = '';
  store.poolCreating = null;
  store.connections.clear();
  store.schemaReadyFor = null;
  store.schemaPromise = null;
  store.ensuredTables.clear();
}

export async function testPostgresConnection(input: PostgresCredentials): Promise<void> {
  const cfg = normalizeConfig(input);
  await withAdminClient(cfg, async (client) => {
    await client.query('SELECT 1');
  });
}

const LEGACY_POSTGRES_DATABASES = ['master', 'users', 'pages'];

export async function ensurePostgresDatabase(
  _dbName: string | undefined,
  input?: PostgresCredentials | PostgresConnConfig
): Promise<void> {
  const cfg = normalizeConfig(input);
  const dbName = cmsDatabaseName(cfg);
  await withAdminClient(cfg, async (client) => {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (existing.rowCount) return;
    await client.query(`CREATE DATABASE ${qIdent(dbName)}`);
  });
}

export async function dropLegacyPostgresDatabases(
  input?: PostgresCredentials | PostgresConnConfig
): Promise<void> {
  const cfg = normalizeConfig(input);
  await withAdminClient(cfg, async (client) => {
    for (const name of LEGACY_POSTGRES_DATABASES) {
      await client.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [name]
      ).catch(() => undefined);
      await client.query(`DROP DATABASE IF EXISTS ${qIdent(name)}`).catch(() => undefined);
    }
  });
}

export async function dropPostgresDatabase(
  dbName: string,
  input?: PostgresCredentials
): Promise<void> {
  const cfg = normalizeConfig(input);
  const safe = sanitizePostgresIdent(dbName, 'database name');
  await closePostgresPool();
  await withAdminClient(cfg, async (client) => {
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [safe]
    ).catch(() => undefined);
    await client.query(`DROP DATABASE IF EXISTS ${qIdent(safe)}`);
  });
}

async function isCmsSchemaPresent(
  input?: PostgresCredentials | PostgresConnConfig
): Promise<boolean> {
  const poolRef = await getPostgresPool(input);
  const { rows } = await poolRef.query(
    `SELECT 1 AS ok
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'users'
     LIMIT 1`
  );
  return rows.length > 0;
}

async function listTableColumns(
  poolRef: pg.Pool,
  tableName: string
): Promise<Set<string>> {
  const { rows } = await poolRef.query(
    `SELECT column_name AS name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return new Set(rows.map((r: { name: string }) => r.name));
}

async function listTableIndexes(poolRef: pg.Pool, tableName: string): Promise<Set<string>> {
  const { rows } = await poolRef.query(
    `SELECT indexname AS name
     FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = $1`,
    [tableName]
  );
  return new Set(rows.map((r: { name: string }) => r.name));
}

async function backfillStoredColumnFromDoc(
  poolRef: pg.Pool,
  tableName: string,
  col: NavigableColumn
): Promise<void> {
  const table = cmsTable(tableName);
  const colIdent = qIdent(col.name);
  const path = col.path.replace(/^\$\./, '');

  if (col.type === 'bool') {
    await poolRef.query(
      `UPDATE ${table} SET ${colIdent} = CASE
        WHEN doc #>> '{${path}}' IN ('true', '1') THEN TRUE
        WHEN doc #>> '{${path}}' IN ('false', '0') THEN FALSE
        ELSE NULL END
       WHERE ${colIdent} IS NULL AND doc ? '${path.split('.')[0]}'`
    );
    return;
  }

  if (col.type === 'int') {
    await poolRef.query(
      `UPDATE ${table} SET ${colIdent} = NULLIF(doc #>> '{${path}}', '')::INTEGER
       WHERE ${colIdent} IS NULL AND doc #>> '{${path}}' IS NOT NULL`
    );
    return;
  }

  if (col.type === 'datetime') {
    await poolRef.query(
      `UPDATE ${table} SET ${colIdent} = NULLIF(doc #>> '{${path}}', '')::TIMESTAMPTZ
       WHERE ${colIdent} IS NULL AND doc #>> '{${path}}' IS NOT NULL`
    );
    return;
  }

  await poolRef.query(
    `UPDATE ${table} SET ${colIdent} = doc #>> '{${path}}'
     WHERE ${colIdent} IS NULL AND doc #>> '{${path}}' IS NOT NULL`
  );
}

export async function ensureNavigablePostgresShape(
  tableName: string,
  input?: PostgresCredentials | PostgresConnConfig
): Promise<void> {
  const poolRef = await getPostgresPool(input);
  const cols = NAVIGABLE_COLUMNS[tableName] || [];
  let existingCols = await listTableColumns(poolRef, tableName);
  const existingIndexes = await listTableIndexes(poolRef, tableName);

  for (const col of cols) {
    if (!existingCols.has(col.name)) {
      try {
        await poolRef.query(
          `ALTER TABLE ${cmsTable(tableName)} ADD COLUMN ${storedColumnDdl(col)}`
        );
        existingCols.add(col.name);
        await backfillStoredColumnFromDoc(poolRef, tableName, col);
      } catch (err) {
        console.warn(`[postgres] skip stored column ${tableName}.${col.name}:`, err);
      }
    }
  }

  existingCols = await listTableColumns(poolRef, tableName);

  for (const col of cols) {
    if (!col.indexed || !existingCols.has(col.name)) continue;
    const idx = indexNameFor(tableName, col.name);
    if (existingIndexes.has(idx)) continue;
    try {
      await poolRef.query(
        `CREATE INDEX IF NOT EXISTS ${qIdent(idx)} ON ${cmsTable(tableName)} (${qIdent(col.name)})`
      );
      existingIndexes.add(idx);
    } catch (err) {
      console.warn(`[postgres] skip index ${idx}:`, err);
    }
  }

  const finalCols = await listTableColumns(poolRef, tableName);
  const browseCols = [
    '_id',
    ...cols.map((c) => c.name).filter((n) => finalCols.has(n)),
    'createdAt',
    'updatedAt',
  ].filter((n) => finalCols.has(n));

  if (browseCols.length) {
    const view = qIdent(browseViewName(tableName));
    await poolRef.query(
      `CREATE OR REPLACE VIEW ${view} AS SELECT ${browseCols
        .map((c) => qIdent(c))
        .join(', ')} FROM ${cmsTable(tableName)}`
    );
  }
}

export async function ensurePostgresTable(
  _dbName: string,
  tableName: string,
  input?: PostgresCredentials | PostgresConnConfig
): Promise<void> {
  const store = getPostgresStore();
  const cacheKey = tableCacheKey(tableName, input);
  if (store.ensuredTables.has(cacheKey)) return;
  const poolRef = await getPostgresPool(input);
  await poolRef.query(
    `CREATE TABLE IF NOT EXISTS ${cmsTable(tableName)} (
      "_id" VARCHAR(64) NOT NULL,
      "doc" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMPTZ NULL,
      "updatedAt" TIMESTAMPTZ NULL,
      PRIMARY KEY ("_id")
    )`
  );
  await ensureNavigablePostgresShape(tableName, input);
  store.ensuredTables.add(cacheKey);
}

function tableNameFor(modelName: string, schema: any): string {
  if (schema?.options?.collection) return String(schema.options.collection);
  const pluralize = mongoose.pluralize();
  if (pluralize) return pluralize(modelName);
  return modelName.toLowerCase() + (modelName.endsWith('s') ? '' : 's');
}

function parseDoc(tableName: string, row: Record<string, unknown>): Record<string, unknown> {
  return mergeRowToDocument(tableName, row);
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

class PostgresQuery {
  private _filter: Record<string, unknown> = {};
  private _projection: unknown = null;
  private _sort: Record<string, number> | null = null;
  private _skip = 0;
  private _limit: number | null = null;
  private _populate: any[] = [];
  private _lean = false;
  private _one = false;

  constructor(
    private model: PostgresModel,
    filter: Record<string, unknown> = {},
    projection?: unknown,
    one = false
  ) {
    this._filter = filter || {};
    this._projection = projection ?? null;
    this._one = one;
  }

  sort(spec: Record<string, number> | string) {
    if (typeof spec === 'string') {
      const out: Record<string, number> = {};
      for (const part of spec.trim().split(/\s+/)) {
        if (part.startsWith('-')) out[part.slice(1)] = -1;
        else out[part] = 1;
      }
      this._sort = out;
    } else {
      this._sort = spec;
    }
    return this;
  }

  skip(n: number) {
    this._skip = n || 0;
    return this;
  }

  limit(n: number) {
    this._limit = n;
    return this;
  }

  select(projection: unknown) {
    this._projection = projection;
    return this;
  }

  /** MongoDB Collection cursor alias for select/projection. */
  project(projection: unknown) {
    return this.select(projection);
  }

  populate(pop: any) {
    this._populate = this._populate.concat(Array.isArray(pop) ? pop : [pop]);
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  async exec(): Promise<any> {
    let docs = await this.model._loadAll();
    docs = docs.filter((d) => matches(d, this._filter));
    if (this._sort) docs.sort((a, b) => compareSort(a, b, this._sort!));
    if (this._skip) docs = docs.slice(this._skip);
    if (this._limit != null) docs = docs.slice(0, this._limit);

    if (this._populate.length) {
      docs = await this.model._populateDocs(docs, this._populate);
    }
    if (this._projection) {
      docs = docs.map((d) => applyProjection(d, this._projection));
    }

    if (this._one) {
      const doc = docs[0];
      if (!doc) return null;
      return this._lean ? doc : this.model._wrap(doc);
    }
    return this._lean ? docs : docs.map((d) => this.model._wrap(d));
  }

  toArray() {
    return this.exec();
  }

  async *[Symbol.asyncIterator]() {
    const result = await this.exec();
    const list = Array.isArray(result) ? result : result ? [result] : [];
    for (const doc of list) yield doc;
  }

  then<TResult1 = any, TResult2 = never>(
    resolve?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.exec().then(resolve as any, reject as any);
  }
}

export class PostgresModel {
  schema: any;
  modelName: string;
  collection: { name: string };
  db: PostgresConnection;

  constructor(conn: PostgresConnection, name: string, schema: any) {
    this.db = conn;
    this.modelName = name;
    this.schema = schema;
    this.collection = { name: tableNameFor(name, schema) };
  }

  async _ensure(): Promise<void> {
    const cacheKey = tableCacheKey(this.collection.name, this.db.config);
    if (getPostgresStore().ensuredTables.has(cacheKey)) return;
    await ensurePostgresTable(cmsDatabaseName(this.db.config), this.collection.name, this.db.config);
  }

  async _loadAll(): Promise<Record<string, unknown>[]> {
    await this._ensure();
    const poolRef = await getPostgresPool(this.db.config);
    const table = this.collection.name;
    const extraCols = navigableColumnNames(table);
    const selectList = [
      '"_id"',
      '"doc"',
      '"createdAt"',
      '"updatedAt"',
      ...extraCols.map((c) => qIdent(c)),
    ].join(', ');
    const { rows } = await poolRef.query(`SELECT ${selectList} FROM ${cmsTable(table)}`);
    return rows.map((row) => parseDoc(table, row as Record<string, unknown>));
  }

  async _write(doc: Record<string, unknown>): Promise<void> {
    await this._ensure();
    const poolRef = await getPostgresPool(this.db.config);
    const table = this.collection.name;
    const id = idString(doc._id) || createId();
    doc._id = id;
    const createdAt = toDate(doc.createdAt);
    const updatedAt = toDate(doc.updatedAt) || new Date();

    const { overflow, columns } = splitDocumentForStorage(table, doc);
    const payload = JSON.stringify(overflow);

    const colNames = navigableColumnNames(table);
    const insertCols = [
      '"_id"',
      '"doc"',
      '"createdAt"',
      '"updatedAt"',
      ...colNames.map((c) => qIdent(c)),
    ];
    const values: unknown[] = [id, payload, createdAt, updatedAt];
    for (const name of colNames) {
      values.push(columns[name] ?? null);
    }

    const updates = [
      `"doc" = EXCLUDED."doc"`,
      `"updatedAt" = EXCLUDED."updatedAt"`,
      ...colNames.map((c) => `${qIdent(c)} = EXCLUDED.${qIdent(c)}`),
    ].join(', ');

    await poolRef.query(
      `INSERT INTO ${cmsTable(table)} (${insertCols.join(', ')})
       VALUES ($1, $2::jsonb, $3, $4${colNames.length ? ', ' + placeholders(colNames.length, 5) : ''})
       ON CONFLICT ("_id") DO UPDATE SET ${updates}`,
      values
    );
  }

  async _deleteIds(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    await this._ensure();
    const poolRef = await getPostgresPool(this.db.config);
    const { rowCount } = await poolRef.query(
      `DELETE FROM ${cmsTable(this.collection.name)} WHERE "_id" = ANY($1::text[])`,
      [ids]
    );
    return Number(rowCount || 0);
  }

  _wrap(doc: Record<string, unknown>) {
    const wrapped: any = { ...doc };
    wrapped._id = doc._id;
    wrapped.save = async () => {
      if (schemaHasTimestamps(this.schema)) {
        wrapped.updatedAt = new Date();
        if (!wrapped.createdAt) wrapped.createdAt = wrapped.updatedAt;
      }
      const plain = { ...wrapped };
      delete plain.save;
      delete plain.toObject;
      delete plain.toJSON;
      delete plain.markModified;
      delete plain.populate;
      delete plain.isNew;
      await this._write(plain);
      Object.assign(wrapped, plain);
      return wrapped;
    };
    wrapped.toObject = () => {
      const plain = { ...wrapped };
      delete plain.save;
      delete plain.toObject;
      delete plain.toJSON;
      delete plain.markModified;
      delete plain.populate;
      delete plain.isNew;
      return plain;
    };
    wrapped.toJSON = wrapped.toObject;
    wrapped.markModified = () => undefined;
    wrapped.isNew = false;
    wrapped.populate = async (pop: any) => {
      const [hydrated] = await this._populateDocs(
        [wrapped.toObject()],
        Array.isArray(pop) ? pop : [pop]
      );
      Object.assign(wrapped, hydrated);
      return wrapped;
    };
    return wrapped;
  }

  _prepareInsert(input: Record<string, unknown>): Record<string, unknown> {
    const doc = applySchemaDefaults(this.schema, { ...input });
    if (!doc._id) doc._id = createId();
    else doc._id = idString(doc._id);
    if (schemaHasTimestamps(this.schema)) {
      const now = new Date();
      if (!doc.createdAt) doc.createdAt = now;
      if (!doc.updatedAt) doc.updatedAt = now;
    }
    doc.__v = doc.__v ?? 0;
    return doc;
  }

  async _populateDocs(docs: Record<string, unknown>[], pops: any[]): Promise<Record<string, unknown>[]> {
    const result = docs.map((d) => ({ ...d }));
    for (const pop of pops) {
      const spec = typeof pop === 'string' ? { path: pop } : pop || {};
      const path = spec.path;
      if (!path) continue;
      const ref =
        this.schema?.path?.(path)?.caster?.options?.ref ||
        this.schema?.path?.(path)?.options?.ref;
      if (!ref) continue;
      const related = this.db.models[ref] as PostgresModel | undefined;
      if (!related) continue;
      const ids = new Set<string>();
      for (const doc of result) {
        const val = (doc as any)[path];
        if (Array.isArray(val)) val.forEach((v) => ids.add(idString(v)));
        else if (val != null) ids.add(idString(val));
      }
      ids.delete('');
      if (!ids.size) continue;
      let relatedDocs = await related._loadAll();
      relatedDocs = relatedDocs.filter((d) => ids.has(idString(d._id)));
      if (spec.select) relatedDocs = relatedDocs.map((d) => applyProjection(d, spec.select));
      const map = new Map(relatedDocs.map((d) => [idString(d._id), d]));
      for (const doc of result) {
        const val = (doc as any)[path];
        if (Array.isArray(val)) {
          (doc as any)[path] = val.map((v) => map.get(idString(v)) || v);
        } else if (val != null) {
          (doc as any)[path] = map.get(idString(val)) || val;
        }
      }
    }
    return result;
  }

  find(filter: Record<string, unknown> = {}, projection?: unknown) {
    return new PostgresQuery(this, filter, projection, false);
  }

  findOne(filter: Record<string, unknown> = {}, projection?: unknown) {
    return new PostgresQuery(this, filter || {}, projection, true);
  }

  findById(id: unknown, projection?: unknown) {
    return this.findOne({ _id: idString(id) }, projection);
  }

  async create(input: Record<string, unknown> | Record<string, unknown>[]): Promise<any> {
    if (Array.isArray(input)) {
      const docs = [];
      for (const item of input) docs.push(await this.create(item));
      return docs;
    }
    const doc = this._prepareInsert(input);
    await this._write(doc);
    return this._wrap(doc);
  }

  async insertMany(inputs: Record<string, unknown>[]) {
    const out = [];
    for (const item of inputs || []) out.push(await this.create(item));
    return out;
  }

  countDocuments(filter: Record<string, unknown> = {}) {
    return thenable(async () => {
      const docs = (await this._loadAll()).filter((d) => matches(d, filter));
      return docs.length;
    });
  }

  estimatedDocumentCount() {
    return this.countDocuments({});
  }

  exists(filter: Record<string, unknown>) {
    return thenable(async () => {
      const docs = (await this._loadAll()).filter((d) => matches(d, filter));
      return docs[0] ? { _id: docs[0]._id } : null;
    });
  }

  distinct(field: string, filter: Record<string, unknown> = {}) {
    return thenable(async () => {
      const docs = (await this._loadAll()).filter((d) => matches(d, filter));
      const values = new Set<string>();
      const out: unknown[] = [];
      for (const doc of docs) {
        const val = (doc as any)[field];
        const key = JSON.stringify(val);
        if (!values.has(key)) {
          values.add(key);
          out.push(val);
        }
      }
      return out;
    });
  }

  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options: any = {}) {
    return thenable(async () => {
      const docs = await this._loadAll();
      const idx = docs.findIndex((d) => matches(d, filter));
      if (idx < 0) {
        if (options?.upsert) {
          const inserted = applyUpdate(
            mergeEqualityFilter(this._prepareInsert({}), filter),
            update,
            filter,
            true
          );
          if (schemaHasTimestamps(this.schema)) {
            inserted.createdAt = inserted.createdAt || new Date();
            inserted.updatedAt = new Date();
          }
          await this._write(inserted);
          return {
            acknowledged: true,
            matchedCount: 0,
            modifiedCount: 0,
            upsertedCount: 1,
            upsertedId: inserted._id,
          };
        }
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      }
      const next = applyUpdate(docs[idx], update, filter, false);
      if (schemaHasTimestamps(this.schema)) next.updatedAt = new Date();
      await this._write(next);
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
    });
  }

  updateMany(filter: Record<string, unknown>, update: Record<string, unknown>) {
    return thenable(async () => {
      const docs = await this._loadAll();
      const matched = docs.filter((d) => matches(d, filter));
      for (const doc of matched) {
        const next = applyUpdate(doc, update, filter, false);
        if (schemaHasTimestamps(this.schema)) next.updatedAt = new Date();
        await this._write(next);
      }
      return { acknowledged: true, matchedCount: matched.length, modifiedCount: matched.length };
    });
  }

  findOneAndUpdate(filter: Record<string, unknown>, update: Record<string, unknown>, options: any = {}) {
    return thenable(async (lean) => {
      const docs = await this._loadAll();
      const current = docs.find((d) => matches(d, filter));
      if (!current) {
        if (options?.upsert) {
          const inserted = applyUpdate(
            mergeEqualityFilter(this._prepareInsert({}), filter),
            update,
            filter,
            true
          );
          if (schemaHasTimestamps(this.schema)) {
            inserted.createdAt = inserted.createdAt || new Date();
            inserted.updatedAt = new Date();
          }
          await this._write(inserted);
          return lean || options?.lean ? inserted : this._wrap(inserted);
        }
        return null;
      }
      const next = applyUpdate(current, update, filter, false);
      if (schemaHasTimestamps(this.schema)) next.updatedAt = new Date();
      await this._write(next);
      const result = options?.new === false ? current : next;
      return lean || options?.lean ? result : this._wrap(result);
    });
  }

  findByIdAndUpdate(id: unknown, update: Record<string, unknown>, options: any = {}) {
    return this.findOneAndUpdate({ _id: idString(id) }, update, options);
  }

  deleteOne(filter: Record<string, unknown> = {}) {
    return thenable(async () => {
      const docs = await this._loadAll();
      const current = docs.find((d) => matches(d, filter));
      if (!current) return { acknowledged: true, deletedCount: 0 };
      await this._deleteIds([idString(current._id)]);
      return { acknowledged: true, deletedCount: 1 };
    });
  }

  deleteMany(filter: Record<string, unknown> = {}) {
    return thenable(async () => {
      const docs = (await this._loadAll()).filter((d) => matches(d, filter));
      const count = await this._deleteIds(docs.map((d) => idString(d._id)));
      return { acknowledged: true, deletedCount: count };
    });
  }

  findOneAndDelete(filter: Record<string, unknown>) {
    return thenable(async (lean) => {
      const docs = await this._loadAll();
      const current = docs.find((d) => matches(d, filter));
      if (!current) return null;
      await this._deleteIds([idString(current._id)]);
      return lean ? current : this._wrap(current);
    });
  }

  findByIdAndDelete(id: unknown) {
    return this.findOneAndDelete({ _id: idString(id) });
  }

  aggregate(pipeline: unknown[]) {
    return thenable(async () => {
      const docs = await this._loadAll();
      return runAggregate(docs, pipeline || []);
    });
  }
}

function thenable(run: (lean: boolean) => Promise<any>) {
  let lean = false;
  const exec = () => run(lean);
  const q: any = {
    lean() {
      lean = true;
      return q;
    },
    exec,
    then(resolve: any, reject: any) {
      return exec().then(resolve, reject);
    },
    catch(onRejected: any) {
      return exec().catch(onRejected);
    },
    finally(onFinally: any) {
      return exec().finally(onFinally);
    },
  };
  return q;
}

type PostgresModelCtor = PostgresModel & ((doc: Record<string, unknown>) => any);

function makeModel(conn: PostgresConnection, name: string, schema: any): PostgresModelCtor {
  const instance = new PostgresModel(conn, name, schema);
  const ctor = function PostgresDocument(this: any, doc: Record<string, unknown>) {
    const wrapped = instance._wrap(instance._prepareInsert(doc || {}));
    wrapped.isNew = true;
    return wrapped;
  } as unknown as PostgresModelCtor;
  Object.assign(ctor, instance);
  Object.setPrototypeOf(ctor, Object.getPrototypeOf(instance));
  const proto = PostgresModel.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === 'constructor') continue;
    const val = (instance as any)[key];
    if (typeof val === 'function') (ctor as any)[key] = val.bind(instance);
  }
  (ctor as any).db = conn;
  (ctor as any).schema = schema;
  (ctor as any).modelName = name;
  (ctor as any).collection = instance.collection;
  return ctor;
}

function resolveFindProjection(options?: unknown): unknown {
  if (!options || typeof options !== 'object' || Array.isArray(options)) return null;
  const o = options as Record<string, unknown>;
  if ('projection' in o) return o.projection;
  const vals = Object.values(o);
  if (vals.length && vals.every((v) => v === 0 || v === 1 || v === true || v === false)) return o;
  return null;
}

function pgIndexExpr(field: string, existingCols: Set<string>): string {
  if (field === '_id' || field === 'createdAt' || field === 'updatedAt') return qIdent(field);
  if (existingCols.has(field) && field !== 'doc') return qIdent(field);
  if (field.includes('.')) {
    const parts = field.split('.').map((p) => p.replace(/'/g, "''"));
    return `(doc #>> '{${parts.join(',')}}')`;
  }
  return `(doc->>'${field.replace(/'/g, "''")}')`;
}

function pgSparseWhere(fields: string[], existingCols: Set<string>): string {
  const parts = fields.map((field) => {
    const expr = pgIndexExpr(field, existingCols);
    return `(${expr} IS NOT NULL AND ${expr}::text <> '')`;
  });
  return parts.join(' AND ');
}

async function createPostgresCollectionIndex(
  tableName: string,
  keys: Record<string, number | string>,
  options: { name?: string; unique?: boolean; sparse?: boolean } = {},
  input?: PostgresCredentials | PostgresConnConfig
): Promise<string> {
  await ensurePostgresTable(cmsDatabaseName(input), tableName, input);
  const poolRef = await getPostgresPool(input);
  const fields = Object.keys(keys || {});
  const indexName = String(options.name || `idx_${tableName}_${fields.join('_')}`).slice(0, 63);
  if (!fields.length) return indexName;

  const existingIndexes = await listTableIndexes(poolRef, tableName);
  if (existingIndexes.has(indexName)) return indexName;

  const existingCols = await listTableColumns(poolRef, tableName);
  const exprs = fields.map((field) => pgIndexExpr(field, existingCols));
  const unique = options.unique ? 'UNIQUE' : '';
  const where =
    options.sparse && fields.length
      ? ` WHERE ${pgSparseWhere(fields, existingCols)}`
      : '';
  try {
    await poolRef.query(
      `CREATE ${unique} INDEX ${qIdent(indexName)} ON ${cmsTable(tableName)} (${exprs.join(', ')})${where}`
    );
  } catch (err) {
    console.warn(`[postgres] createIndex ${tableName}.${indexName}:`, err);
  }
  return indexName;
}

async function dropPostgresCollectionIndex(tableName: string, indexName: string): Promise<void> {
  const poolRef = await getPostgresPool();
  const existingIndexes = await listTableIndexes(poolRef, tableName);
  if (!existingIndexes.has(indexName)) return;
  try {
    await poolRef.query(`DROP INDEX IF EXISTS ${qIdent(indexName)}`);
  } catch (err) {
    console.warn(`[postgres] dropIndex ${tableName}.${indexName}:`, err);
  }
}

function getPostgresCollectionModel(conn: PostgresConnection, tableName: string): PostgresModelCtor {
  const modelKey = `__native_coll__${tableName}`;
  if (conn.models[modelKey]) return conn.models[modelKey];
  const schema = new mongoose.Schema(
    {},
    { strict: false, timestamps: true, collection: tableName }
  );
  return conn.model(modelKey, schema);
}

function makePostgresNativeCollection(conn: PostgresConnection, tableName: string) {
  const getModel = () => getPostgresCollectionModel(conn, tableName);

  return {
    collectionName: tableName,
    namespace: `public.${tableName}`,

    async createIndex(
      keys: Record<string, number | string>,
      options: { name?: string; unique?: boolean; sparse?: boolean } = {}
    ) {
      return createPostgresCollectionIndex(tableName, keys, options, conn.config);
    },

    async dropIndex(indexName: string) {
      await dropPostgresCollectionIndex(tableName, indexName);
    },

    async indexExists(indexName: string) {
      const poolRef = await getPostgresPool(conn.config);
      const existing = await listTableIndexes(poolRef, tableName);
      return existing.has(indexName);
    },

    find(filter: Record<string, unknown> = {}, options?: unknown) {
      const projection = resolveFindProjection(options);
      const q = getModel().find(filter, projection ?? undefined);
      q.lean();
      return q;
    },

    findOne(filter: Record<string, unknown> = {}, options?: unknown) {
      const projection = resolveFindProjection(options);
      const q = getModel().findOne(filter, projection ?? undefined);
      q.lean();
      return q;
    },

    updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options?: unknown) {
      return getModel().updateOne(filter, update, options);
    },

    updateMany(filter: Record<string, unknown>, update: Record<string, unknown>, _options?: unknown) {
      return getModel().updateMany(filter, update);
    },

    findOneAndUpdate(
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
      options?: unknown
    ) {
      return getModel().findOneAndUpdate(filter, update, options);
    },

    deleteOne(filter: Record<string, unknown> = {}) {
      return getModel().deleteOne(filter);
    },

    deleteMany(filter: Record<string, unknown> = {}) {
      return getModel().deleteMany(filter);
    },

    countDocuments(filter: Record<string, unknown> = {}) {
      return getModel().countDocuments(filter);
    },

    distinct(field: string, filter: Record<string, unknown> = {}) {
      return getModel().distinct(field, filter);
    },

    aggregate(pipeline: unknown[]) {
      return getModel().aggregate(pipeline);
    },

    async insertOne(doc: Record<string, unknown>) {
      const created = await getModel().create(doc || {});
      return { acknowledged: true, insertedId: created?._id };
    },

    async insertMany(docs: Record<string, unknown>[]) {
      const created = await getModel().insertMany(docs || []);
      return {
        acknowledged: true,
        insertedCount: created.length,
        insertedIds: created.map((d: any) => d._id),
      };
    },

    async bulkWrite(operations: any[] = [], _options: any = {}) {
      const model = getModel();
      let insertedCount = 0;
      let matchedCount = 0;
      let modifiedCount = 0;
      let deletedCount = 0;
      let upsertedCount = 0;
      const upsertedIds: Record<number, unknown> = {};

      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        try {
          if (op.updateOne) {
            const r = await model.updateOne(op.updateOne.filter || {}, op.updateOne.update || {}, {
              upsert: Boolean(op.updateOne.upsert),
            });
            matchedCount += Number(r.matchedCount || 0);
            modifiedCount += Number(r.modifiedCount || 0);
            upsertedCount += Number(r.upsertedCount || 0);
            if (r.upsertedId != null) upsertedIds[i] = r.upsertedId;
          } else if (op.updateMany) {
            const r = await model.updateMany(op.updateMany.filter || {}, op.updateMany.update || {});
            matchedCount += Number(r.matchedCount || 0);
            modifiedCount += Number(r.modifiedCount || 0);
          } else if (op.insertOne) {
            await model.create(op.insertOne.document || op.insertOne);
            insertedCount += 1;
          } else if (op.deleteOne) {
            const r = await model.deleteOne(op.deleteOne.filter || {});
            deletedCount += Number(r.deletedCount || 0);
          } else if (op.deleteMany) {
            const r = await model.deleteMany(op.deleteMany.filter || {});
            deletedCount += Number(r.deletedCount || 0);
          }
        } catch (err) {
          if (_options?.ordered !== false) throw err;
          console.warn(`[postgres] bulkWrite op ${i} on ${tableName}:`, err);
        }
      }

      return {
        ok: 1,
        insertedCount,
        matchedCount,
        modifiedCount,
        deletedCount,
        upsertedCount,
        upsertedIds,
      };
    },
  };
}

export class PostgresConnection {
  models: Record<string, PostgresModelCtor> = {};
  readyState = 1;
  dbName: string;
  config?: PostgresConnConfig;
  name: string;

  constructor(dbName: string, config?: PostgresConnConfig) {
    this.dbName = dbName;
    this.name = dbName;
    this.config = config;
  }

  model(name: string, schema?: any) {
    if (this.models[name]) return this.models[name];
    if (!schema) {
      throw new Error(`Schema hasn't been registered for model "${name}"`);
    }
    const created = makeModel(this, name, schema);
    this.models[name] = created;
    return created;
  }

  /** MongoDB/Mongoose Connection.deleteModel — used by plugins to re-register schemas on reload. */
  deleteModel(name: string) {
    if (name in this.models) {
      delete this.models[name];
    }
    return this;
  }

  async createCollection(name: string) {
    await ensurePostgresTable(this.dbName, name, this.config);
  }

  /** MongoDB Connection.collection alias used by some plugins. */
  collection(name: string) {
    return makePostgresNativeCollection(this, name);
  }

  async close() {
    this.readyState = 0;
  }

  on() {
    return this;
  }

  async startSession() {
    return {
      async withTransaction<T>(fn: () => Promise<T>) {
        return fn();
      },
      async endSession() {
        return undefined;
      },
      async startTransaction() {
        return undefined;
      },
      async commitTransaction() {
        return undefined;
      },
      async abortTransaction() {
        return undefined;
      },
    };
  }

  get db() {
    const conn = this;
    return {
      databaseName: this.dbName,
      /**
       * MongoDB-compatible listCollections cursor.
       * Plugins (e.g. CRM) commonly call: `await conn.db.listCollections({ name }).toArray()`
       */
      listCollections(filter: Record<string, unknown> = {}) {
        const run = async () => {
          const poolRef = await getPostgresPool(conn.config);
          const result = await poolRef.query(
            `SELECT table_name AS name
             FROM information_schema.tables
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
             ORDER BY table_name`
          );
          let infos = (result.rows as Array<{ name: string }>).map((row) => ({
            name: String(row.name),
            type: 'collection' as const,
            options: {},
            info: { readOnly: false },
          }));
          if (filter && Object.keys(filter).length > 0) {
            infos = infos.filter((info) => matches(info, filter));
          }
          return infos;
        };

        return {
          toArray: () => run(),
          next: async () => {
            const infos = await run();
            return infos[0] ?? null;
          },
          [Symbol.asyncIterator]: async function* () {
            const infos = await run();
            for (const info of infos) yield info;
          },
        };
      },
      async createCollection(name: string) {
        await ensurePostgresTable(conn.dbName, name, conn.config);
      },
      async dropCollection(name: string) {
        const poolRef = await getPostgresPool(conn.config);
        await poolRef.query(`DROP TABLE IF EXISTS ${cmsTable(name)}`);
        getPostgresStore().ensuredTables.delete(tableCacheKey(name, conn.config));
      },
      collection(name: string) {
        return makePostgresNativeCollection(conn, name);
      },
    };
  }
}

export async function ensureCmsPostgresSchema(
  input?: PostgresCredentials | PostgresConnConfig
): Promise<void> {
  const store = getPostgresStore();
  const dbName = cmsDatabaseName(input);

  if (store.schemaReadyFor && store.schemaReadyFor !== dbName) {
    store.schemaReadyFor = null;
    store.ensuredTables.clear();
  }

  if (store.schemaReadyFor === dbName) {
    if (await isCmsSchemaPresent(input)) return;
    store.schemaReadyFor = null;
    store.ensuredTables.clear();
  }

  if (store.schemaPromise) {
    await store.schemaPromise;
    return;
  }

  store.schemaPromise = (async () => {
    await ensurePostgresDatabase(dbName, input);
    for (const table of POSTGRES_CMS_TABLES) {
      await ensurePostgresTable(dbName, table, input);
    }
    store.schemaReadyFor = dbName;
  })();

  try {
    await store.schemaPromise;
  } finally {
    store.schemaPromise = null;
  }
}

export async function getPostgresConnection(
  logicalName: string,
  input?: PostgresCredentials | PostgresConnConfig
): Promise<PostgresConnection> {
  const cfg = normalizeConfig(input);
  const dbName = cmsDatabaseName(cfg);
  const key = `${configKey(cfg)}::${dbName}::${logicalName}`;
  const store = getPostgresStore();
  const existing = store.connections.get(key);
  if (existing && existing.readyState === 1) return existing;
  await ensureCmsPostgresSchema(cfg);
  const conn = new PostgresConnection(dbName, cfg);
  store.connections.set(key, conn);
  return conn;
}

export { POSTGRES_CMS_TABLES, DEFAULT_POSTGRES_DATABASE_NAME } from './tables';
export { getPostgresDatabaseName, resolvePostgresDatabaseName } from '@/lib/db/config';
export {
  NAVIGABLE_COLUMNS,
  MYSQL_TABLE_SOURCE as POSTGRES_TABLE_SOURCE,
  browseViewName,
} from '@/lib/db/mysql/navigableColumns';
