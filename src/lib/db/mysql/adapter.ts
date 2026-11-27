/* eslint-disable @typescript-eslint/no-explicit-any */
import mysql from 'mysql2/promise';
import mongoose from 'mongoose';
import { getMysqlConfig, resolveMysqlDatabaseName, sanitizeMysqlIdent, type MysqlCredentials } from '@/lib/db/config';
import { MYSQL_CMS_TABLES } from './tables';
import {
  NAVIGABLE_COLUMNS,
  browseViewName,
  indexNameFor,
  storedColumnDdl,
} from './navigableColumns';
import {
  mergeRowToDocument,
  navigableColumnNames,
  splitDocumentForStorage,
} from './documentSplit';
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
} from './queryEngine';

export type MysqlConnConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
};

function normalizeConfig(input?: MysqlCredentials | MysqlConnConfig): MysqlConnConfig {
  const fallback = getMysqlConfig();
  const database =
    input && 'database' in input && input.database
      ? String(input.database).trim()
      : undefined;
  return {
    host: String(input?.host || fallback.host),
    port: Number(input?.port || fallback.port || 3306),
    user: String(input?.user || fallback.user),
    password: String(input?.password ?? fallback.password ?? ''),
    ...(database ? { database } : {}),
  };
}

type MysqlRuntimeStore = {
  pool: mysql.Pool | null;
  poolKey: string;
  poolCreating: Promise<mysql.Pool> | null;
  connections: Map<string, MysqlConnection>;
  /** Physical database name whose CMS tables were ensured in this process. */
  schemaReadyFor: string | null;
  schemaPromise: Promise<void> | null;
  /** Keys: `${databaseName}::${tableName}` */
  ensuredTables: Set<string>;
};

const globalMysql = globalThis as typeof globalThis & { __nextcmsMysql?: MysqlRuntimeStore };

function getMysqlStore(): MysqlRuntimeStore {
  if (!globalMysql.__nextcmsMysql) {
    globalMysql.__nextcmsMysql = {
      pool: null,
      poolKey: '',
      poolCreating: null,
      connections: new Map(),
      schemaReadyFor: null,
      schemaPromise: null,
      ensuredTables: new Set(),
    };
  }
  return globalMysql.__nextcmsMysql;
}

function configKey(cfg: MysqlConnConfig): string {
  return `${cfg.host}:${cfg.port}:${cfg.user}:${cfg.password}`;
}

export async function getMysqlPool(input?: MysqlCredentials | MysqlConnConfig): Promise<mysql.Pool> {
  const cfg = normalizeConfig(input);
  const key = configKey(cfg);
  const store = getMysqlStore();
  if (store.pool && store.poolKey === key) return store.pool;
  if (store.poolCreating) return store.poolCreating;

  store.poolCreating = (async () => {
    if (store.pool) {
      await store.pool.end().catch(() => undefined);
      store.pool = null;
    }
    const created = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_POOL_SIZE) || 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10_000,
      charset: 'utf8mb4',
      namedPlaceholders: false,
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

export async function closeMysqlPool(): Promise<void> {
  const store = getMysqlStore();
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

export async function testMysqlConnection(input: MysqlCredentials): Promise<void> {
  const cfg = normalizeConfig(input);
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    connectTimeout: 15000,
  });
  try {
    await conn.ping();
  } finally {
    await conn.end();
  }
}

const LEGACY_MYSQL_DATABASES = ['master', 'users', 'pages'];

function qIdent(name: string): string {
  return `\`${sanitizeMysqlIdent(name)}\``;
}

function cmsTable(tableName: string, input?: MysqlCredentials | MysqlConnConfig): string {
  return `${qIdent(resolveMysqlDatabaseName(input))}.${qIdent(tableName)}`;
}

function cmsDatabaseName(input?: MysqlCredentials | MysqlConnConfig): string {
  return resolveMysqlDatabaseName(input);
}

function tableCacheKey(tableName: string, input?: MysqlCredentials | MysqlConnConfig): string {
  return `${cmsDatabaseName(input)}::${tableName}`;
}

async function isCmsSchemaPresent(
  dbName: string,
  input?: MysqlCredentials | MysqlConnConfig
): Promise<boolean> {
  const poolRef = await getMysqlPool(input);
  const [rows] = await poolRef.query(
    `SELECT 1 AS ok
     FROM information_schema.tables
     WHERE table_schema = ? AND table_name = 'users'
     LIMIT 1`,
    [dbName]
  );
  return (rows as unknown[]).length > 0;
}

export async function ensureMysqlDatabase(
  _dbName: string | undefined,
  input?: MysqlCredentials | MysqlConnConfig
): Promise<void> {
  const poolRef = await getMysqlPool(input);
  const dbName = cmsDatabaseName(input);
  await poolRef.query(
    `CREATE DATABASE IF NOT EXISTS ${qIdent(dbName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
}

export async function dropLegacyMysqlDatabases(input?: MysqlCredentials | MysqlConnConfig): Promise<void> {
  const poolRef = await getMysqlPool(input);
  for (const name of LEGACY_MYSQL_DATABASES) {
    await poolRef.query(`DROP DATABASE IF EXISTS ${qIdent(name)}`);
  }
}

async function listTableColumns(
  poolRef: mysql.Pool,
  tableName: string,
  input?: MysqlCredentials | MysqlConnConfig
): Promise<Set<string>> {
  const [rows] = await poolRef.query(
    `SELECT COLUMN_NAME AS name
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [cmsDatabaseName(input), tableName]
  );
  return new Set((rows as Array<{ name: string }>).map((r) => r.name));
}

async function listTableIndexes(
  poolRef: mysql.Pool,
  tableName: string,
  input?: MysqlCredentials | MysqlConnConfig
): Promise<Set<string>> {
  const [rows] = await poolRef.query(
    `SELECT INDEX_NAME AS name
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [cmsDatabaseName(input), tableName]
  );
  return new Set((rows as Array<{ name: string }>).map((r) => r.name));
}

async function listColumnMeta(
  poolRef: mysql.Pool,
  tableName: string,
  input?: MysqlCredentials | MysqlConnConfig
): Promise<Map<string, { generated: boolean }>> {
  const [rows] = await poolRef.query(
    `SELECT COLUMN_NAME AS name, EXTRA AS extra
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [cmsDatabaseName(input), tableName]
  );
  const out = new Map<string, { generated: boolean }>();
  for (const row of rows as Array<{ name: string; extra: string }>) {
    out.set(row.name, { generated: String(row.extra || '').includes('GENERATED') });
  }
  return out;
}

async function backfillStoredColumnFromDoc(
  poolRef: mysql.Pool,
  tableName: string,
  col: (typeof NAVIGABLE_COLUMNS)[string][number],
  input?: MysqlCredentials | MysqlConnConfig
): Promise<void> {
  const safePath = col.path.replace(/'/g, "''");
  const table = cmsTable(tableName, input);
  const colIdent = qIdent(col.name);

  if (col.type === 'bool') {
    await poolRef.query(
      `UPDATE ${table} SET ${colIdent} = CASE
        WHEN JSON_EXTRACT(\`doc\`, '${safePath}') IN (true, 1, 'true', '1') THEN 1
        WHEN JSON_EXTRACT(\`doc\`, '${safePath}') IN (false, 0, 'false', '0') THEN 0
        ELSE NULL END
       WHERE ${colIdent} IS NULL AND JSON_EXTRACT(\`doc\`, '${safePath}') IS NOT NULL`
    );
    return;
  }

  if (col.type === 'int') {
    await poolRef.query(
      `UPDATE ${table} SET ${colIdent} = CAST(JSON_UNQUOTE(JSON_EXTRACT(\`doc\`, '${safePath}')) AS SIGNED)
       WHERE ${colIdent} IS NULL AND JSON_EXTRACT(\`doc\`, '${safePath}') IS NOT NULL`
    );
    return;
  }

  if (col.type === 'datetime') {
    await poolRef.query(
      `UPDATE ${table} SET ${colIdent} = CAST(JSON_UNQUOTE(JSON_EXTRACT(\`doc\`, '${safePath}')) AS DATETIME(3))
       WHERE ${colIdent} IS NULL AND JSON_EXTRACT(\`doc\`, '${safePath}') IS NOT NULL`
    );
    return;
  }

  await poolRef.query(
    `UPDATE ${table} SET ${colIdent} = JSON_UNQUOTE(JSON_EXTRACT(\`doc\`, '${safePath}'))
     WHERE ${colIdent} IS NULL AND JSON_EXTRACT(\`doc\`, '${safePath}') IS NOT NULL`
  );
}

/**
 * Real SQL columns for browsable fields + browse_* views.
 * Mapped fields are stored in columns; `doc` holds only the remainder.
 */
export async function ensureNavigableMysqlShape(
  tableName: string,
  input?: MysqlCredentials | MysqlConnConfig
): Promise<void> {
  const poolRef = await getMysqlPool(input);
  const cols = NAVIGABLE_COLUMNS[tableName] || [];
  let columnMeta = await listColumnMeta(poolRef, tableName, input);
  const existingIndexes = await listTableIndexes(poolRef, tableName, input);

  for (const col of cols) {
    const meta = columnMeta.get(col.name);
    if (meta?.generated) {
      try {
        await poolRef.query(`ALTER TABLE ${cmsTable(tableName, input)} DROP COLUMN ${qIdent(col.name)}`);
        columnMeta.delete(col.name);
      } catch (err) {
        console.warn(`[mysql] skip drop generated column ${tableName}.${col.name}:`, err);
        continue;
      }
    }

    if (!columnMeta.has(col.name)) {
      try {
        await poolRef.query(
          `ALTER TABLE ${cmsTable(tableName, input)} ADD COLUMN ${storedColumnDdl(col)}`
        );
        columnMeta.set(col.name, { generated: false });
        await backfillStoredColumnFromDoc(poolRef, tableName, col, input);
      } catch (err) {
        console.warn(`[mysql] skip stored column ${tableName}.${col.name}:`, err);
      }
    }
  }

  columnMeta = await listColumnMeta(poolRef, tableName, input);

  for (const col of cols) {
    if (!col.indexed || !columnMeta.has(col.name)) continue;
    const idx = indexNameFor(tableName, col.name);
    if (existingIndexes.has(idx)) continue;
    try {
      await poolRef.query(
        `CREATE INDEX ${qIdent(idx)} ON ${cmsTable(tableName, input)} (${qIdent(col.name)})`
      );
      existingIndexes.add(idx);
    } catch (err) {
      console.warn(`[mysql] skip index ${idx}:`, err);
    }
  }

  const finalCols = await listTableColumns(poolRef, tableName, input);
  const browseCols = [
    '_id',
    ...cols.map((c) => c.name).filter((n) => finalCols.has(n)),
    'createdAt',
    'updatedAt',
  ].filter((n) => finalCols.has(n));

  if (browseCols.length) {
    const dbName = cmsDatabaseName(input);
    const view = `${qIdent(dbName)}.${qIdent(browseViewName(tableName))}`;
    await poolRef.query(
      `CREATE OR REPLACE VIEW ${view} AS SELECT ${browseCols.map((c) => qIdent(c)).join(', ')} FROM ${cmsTable(tableName, input)}`
    );
  }
}

export async function ensureMysqlTable(
  _dbName: string,
  tableName: string,
  input?: MysqlCredentials | MysqlConnConfig
): Promise<void> {
  const store = getMysqlStore();
  const cacheKey = tableCacheKey(tableName, input);
  if (store.ensuredTables.has(cacheKey)) return;
  const poolRef = await getMysqlPool(input);
  await poolRef.query(
    `CREATE TABLE IF NOT EXISTS ${cmsTable(tableName, input)} (
      \`_id\` VARCHAR(64) NOT NULL,
      \`doc\` LONGTEXT NOT NULL,
      \`createdAt\` DATETIME(3) NULL,
      \`updatedAt\` DATETIME(3) NULL,
      PRIMARY KEY (\`_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  await ensureNavigableMysqlShape(tableName, input);
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

class MysqlQuery {
  private _filter: Record<string, unknown> = {};
  private _projection: unknown = null;
  private _sort: Record<string, number> | null = null;
  private _skip = 0;
  private _limit: number | null = null;
  private _populate: any[] = [];
  private _lean = false;
  private _one = false;

  constructor(
    private model: MysqlModel,
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

export class MysqlModel {
  schema: any;
  modelName: string;
  collection: { name: string };
  db: MysqlConnection;

  constructor(conn: MysqlConnection, name: string, schema: any) {
    this.db = conn;
    this.modelName = name;
    this.schema = schema;
    this.collection = { name: tableNameFor(name, schema) };
  }

  async _ensure(): Promise<void> {
    const cacheKey = tableCacheKey(this.collection.name, this.db.config);
    if (getMysqlStore().ensuredTables.has(cacheKey)) return;
    await ensureMysqlTable(cmsDatabaseName(this.db.config), this.collection.name, this.db.config);
  }

  async _loadAll(): Promise<Record<string, unknown>[]> {
    await this._ensure();
    const poolRef = await getMysqlPool(this.db.config);
    const table = this.collection.name;
    const extraCols = navigableColumnNames(table);
    const selectList = ['`_id`', '`doc`', '`createdAt`', '`updatedAt`', ...extraCols.map((c) => `\`${c}\``)].join(
      ', '
    );
    const [rows] = await poolRef.query(`SELECT ${selectList} FROM ${cmsTable(table, this.db.config)}`);
    return (rows as Record<string, unknown>[]).map((row) => parseDoc(table, row));
  }

  async _write(doc: Record<string, unknown>): Promise<void> {
    await this._ensure();
    const poolRef = await getMysqlPool(this.db.config);
    const table = this.collection.name;
    const id = idString(doc._id) || createId();
    doc._id = id;
    const createdAt = toDate(doc.createdAt);
    const updatedAt = toDate(doc.updatedAt) || new Date();

    const { overflow, columns } = splitDocumentForStorage(table, doc);
    const payload = JSON.stringify(overflow);

    const colNames = navigableColumnNames(table);
    const insertCols = ['`_id`', '`doc`', '`createdAt`', '`updatedAt`', ...colNames.map((c) => `\`${c}\``)];
    const placeholders = insertCols.map(() => '?').join(', ');
    const values: unknown[] = [id, payload, createdAt, updatedAt];
    for (const name of colNames) {
      values.push(columns[name] ?? null);
    }

    const updates = [
      '`doc` = ?',
      '`updatedAt` = ?',
      ...colNames.map((c) => `\`${c}\` = ?`),
    ].join(', ');
    const updateValues = [payload, updatedAt, ...colNames.map((c) => columns[c] ?? null)];

    await poolRef.query(
      `INSERT INTO ${cmsTable(table, this.db.config)} (${insertCols.join(', ')})
       VALUES (${placeholders})
       ON DUPLICATE KEY UPDATE ${updates}`,
      [...values, ...updateValues]
    );
  }

  async _deleteIds(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    await this._ensure();
    const poolRef = await getMysqlPool(this.db.config);
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await poolRef.query(
      `DELETE FROM ${cmsTable(this.collection.name, this.db.config)} WHERE \`_id\` IN (${placeholders})`,
      ids
    );
    return Number((result as mysql.ResultSetHeader).affectedRows || 0);
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
      const related = this.db.models[ref] as MysqlModel | undefined;
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
    return new MysqlQuery(this, filter, projection, false);
  }

  findOne(filter: Record<string, unknown> = {}, projection?: unknown) {
    return new MysqlQuery(this, filter || {}, projection, true);
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
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: inserted._id };
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

type MysqlModelCtor = MysqlModel & ((doc: Record<string, unknown>) => any);

function makeModel(conn: MysqlConnection, name: string, schema: any): MysqlModelCtor {
  const instance = new MysqlModel(conn, name, schema);
  const ctor = function MysqlDocument(this: any, doc: Record<string, unknown>) {
    const wrapped = instance._wrap(instance._prepareInsert(doc || {}));
    wrapped.isNew = true;
    return wrapped;
  } as unknown as MysqlModelCtor;
  Object.assign(ctor, instance);
  Object.setPrototypeOf(ctor, Object.getPrototypeOf(instance));
  // Bind methods that use `this`
  const proto = MysqlModel.prototype;
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

const BASE_SQL_COLUMNS = new Set(['_id', 'createdAt', 'updatedAt', 'doc']);

function indexHelperColumnName(field: string): string {
  const safe = field.replace(/[^a-zA-Z0-9_]/g, '_');
  return `_midx_${safe}`.slice(0, 64);
}

function jsonExtractPath(field: string): string {
  return `$.${field.split('.').join('.')}`;
}

function resolveFindProjection(options?: unknown): unknown {
  if (!options || typeof options !== 'object' || Array.isArray(options)) return null;
  const o = options as Record<string, unknown>;
  if ('projection' in o) return o.projection;
  const vals = Object.values(o);
  if (vals.length && vals.every((v) => v === 0 || v === 1 || v === true || v === false)) return o;
  return null;
}

async function ensureMysqlIndexColumn(
  poolRef: mysql.Pool,
  tableName: string,
  field: string,
  existingCols: Set<string>,
  input?: MysqlCredentials | MysqlConnConfig,
  sparse = false
): Promise<string> {
  if (field === '_id' || field === 'createdAt' || field === 'updatedAt') return field;
  if (existingCols.has(field) && !BASE_SQL_COLUMNS.has(field) && !field.startsWith('_midx_')) {
    return field;
  }

  const col = indexHelperColumnName(field);
  if (existingCols.has(col)) return col;

  const jsonPath = jsonExtractPath(field).replace(/'/g, "''");
  // Sparse indexes: treat missing/null/empty as SQL NULL so UNIQUE allows many "absent" values.
  const extracted = `JSON_UNQUOTE(JSON_EXTRACT(\`doc\`, '${jsonPath}'))`;
  const expr = sparse
    ? `NULLIF(NULLIF(NULLIF(${extracted}, ''), 'null'), 'undefined')`
    : extracted;
  try {
    await poolRef.query(
      `ALTER TABLE ${cmsTable(tableName, input)}
       ADD COLUMN ${qIdent(col)} VARCHAR(512)
       GENERATED ALWAYS AS (${expr}) STORED`
    );
    existingCols.add(col);
  } catch (err) {
    const code = (err as { code?: string; errno?: number })?.errno;
    // Duplicate column name
    if (code !== 1060) {
      console.warn(`[mysql] ensure index column ${tableName}.${col}:`, err);
    } else {
      existingCols.add(col);
    }
  }
  return col;
}

async function createMysqlCollectionIndex(
  tableName: string,
  keys: Record<string, number | string>,
  options: { name?: string; unique?: boolean; sparse?: boolean } = {},
  input?: MysqlCredentials | MysqlConnConfig
): Promise<string> {
  await ensureMysqlTable(cmsDatabaseName(input), tableName, input);
  const poolRef = await getMysqlPool(input);
  const fields = Object.keys(keys || {});
  const indexName = String(options.name || `idx_${tableName}_${fields.join('_')}`).slice(0, 64);
  if (!fields.length) return indexName;

  const existingIndexes = await listTableIndexes(poolRef, tableName, input);
  if (existingIndexes.has(indexName)) return indexName;

  const existingCols = await listTableColumns(poolRef, tableName, input);
  const colNames: string[] = [];
  const sparse = Boolean(options.sparse);
  for (const field of fields) {
    colNames.push(
      await ensureMysqlIndexColumn(poolRef, tableName, field, existingCols, input, sparse)
    );
  }

  const unique = options.unique ? 'UNIQUE' : '';
  try {
    await poolRef.query(
      `CREATE ${unique} INDEX ${qIdent(indexName)} ON ${cmsTable(tableName, input)} (${colNames
        .map((c) => qIdent(c))
        .join(', ')})`
    );
  } catch (err) {
    const errno = (err as { errno?: number })?.errno;
    // Duplicate key name / already exists
    if (errno !== 1061) {
      console.warn(`[mysql] createIndex ${tableName}.${indexName}:`, err);
    }
  }
  return indexName;
}

async function dropMysqlCollectionIndex(
  tableName: string,
  indexName: string,
  input?: MysqlCredentials | MysqlConnConfig
): Promise<void> {
  const poolRef = await getMysqlPool(input);
  const existingIndexes = await listTableIndexes(poolRef, tableName, input);
  if (!existingIndexes.has(indexName)) return;
  try {
    await poolRef.query(`DROP INDEX ${qIdent(indexName)} ON ${cmsTable(tableName, input)}`);
  } catch (err) {
    console.warn(`[mysql] dropIndex ${tableName}.${indexName}:`, err);
  }
}

function getMysqlCollectionModel(conn: MysqlConnection, tableName: string): MysqlModelCtor {
  const modelKey = `__native_coll__${tableName}`;
  if (conn.models[modelKey]) return conn.models[modelKey];
  const schema = new mongoose.Schema(
    {},
    { strict: false, timestamps: true, collection: tableName }
  );
  return conn.model(modelKey, schema);
}

function makeMysqlNativeCollection(conn: MysqlConnection, tableName: string) {
  const getModel = () => getMysqlCollectionModel(conn, tableName);

  return {
    collectionName: tableName,
    namespace: `${cmsDatabaseName(conn.config)}.${tableName}`,

    async createIndex(
      keys: Record<string, number | string>,
      options: { name?: string; unique?: boolean; sparse?: boolean } = {}
    ) {
      return createMysqlCollectionIndex(tableName, keys, options, conn.config);
    },

    async dropIndex(indexName: string) {
      await dropMysqlCollectionIndex(tableName, indexName, conn.config);
    },

    async indexExists(indexName: string) {
      const poolRef = await getMysqlPool(conn.config);
      const existing = await listTableIndexes(poolRef, tableName, conn.config);
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
          console.warn(`[mysql] bulkWrite op ${i} on ${tableName}:`, err);
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

export class MysqlConnection {
  models: Record<string, MysqlModelCtor> = {};
  readyState = 1;
  dbName: string;
  config?: MysqlConnConfig;
  name: string;

  constructor(dbName: string, config?: MysqlConnConfig) {
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
    await ensureMysqlTable(this.dbName, name, this.config);
  }

  /** MongoDB Connection.collection alias used by some plugins. */
  collection(name: string) {
    return makeMysqlNativeCollection(this, name);
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
          const poolRef = await getMysqlPool(conn.config);
          const [rows] = await poolRef.query(
            `SELECT TABLE_NAME AS name
             FROM information_schema.tables
             WHERE table_schema = ? AND table_type = 'BASE TABLE'
             ORDER BY TABLE_NAME`,
            [cmsDatabaseName(conn.config)]
          );
          let infos = (rows as Array<{ name: string }>).map((row) => ({
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
        await ensureMysqlTable(conn.dbName, name, conn.config);
      },
      async dropCollection(name: string) {
        const poolRef = await getMysqlPool(conn.config);
        await poolRef.query(`DROP TABLE IF EXISTS ${cmsTable(name, conn.config)}`);
        getMysqlStore().ensuredTables.delete(tableCacheKey(name, conn.config));
      },
      collection(name: string) {
        return makeMysqlNativeCollection(conn, name);
      },
    };
  }
}

export async function ensureCmsMysqlSchema(input?: MysqlCredentials | MysqlConnConfig): Promise<void> {
  const store = getMysqlStore();
  const dbName = cmsDatabaseName(input);

  if (store.schemaReadyFor && store.schemaReadyFor !== dbName) {
    store.schemaReadyFor = null;
    store.ensuredTables.clear();
  }

  if (store.schemaReadyFor === dbName) {
    if (await isCmsSchemaPresent(dbName, input)) return;
    store.schemaReadyFor = null;
    store.ensuredTables.clear();
  }

  if (store.schemaPromise) {
    await store.schemaPromise;
    return;
  }

  store.schemaPromise = (async () => {
    await ensureMysqlDatabase(dbName, input);
    for (const table of MYSQL_CMS_TABLES) {
      await ensureMysqlTable(dbName, table, input);
    }
    store.schemaReadyFor = dbName;
  })();

  try {
    await store.schemaPromise;
  } finally {
    store.schemaPromise = null;
  }
}

export async function getMysqlConnection(
  logicalName: string,
  input?: MysqlCredentials | MysqlConnConfig
): Promise<MysqlConnection> {
  const cfg = normalizeConfig(input);
  const dbName = cmsDatabaseName(cfg);
  const key = `${configKey(cfg)}::${dbName}::${logicalName}`;
  const store = getMysqlStore();
  const existing = store.connections.get(key);
  if (existing && existing.readyState === 1) return existing;
  await ensureCmsMysqlSchema(cfg);
  const conn = new MysqlConnection(dbName, cfg);
  store.connections.set(key, conn);
  return conn;
}

export { MYSQL_CMS_TABLES, DEFAULT_MYSQL_DATABASE_NAME } from './tables';
export { getMysqlDatabaseName, resolveMysqlDatabaseName } from '@/lib/db/config';
export {
  NAVIGABLE_COLUMNS,
  MYSQL_TABLE_SOURCE,
  browseViewName,
} from './navigableColumns';

export async function dropMysqlDatabase(dbName: string, input?: MysqlCredentials): Promise<void> {
  const poolRef = await getMysqlPool(input);
  await poolRef.query(`DROP DATABASE IF EXISTS ${qIdent(dbName)}`);
}
