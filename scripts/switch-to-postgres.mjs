/**
 * One-command MongoDB → PostgreSQL switch for Next CMS.
 *
 * Usage:
 *   npm run db:switch-postgres -- --host=127.0.0.1 --port=5432 --user=postgres --password=secret
 *
 * Reads the current MongoDB settings from `.env`, migrates every CMS collection
 * into PostgreSQL (POSTGRES_DATABASE / --database=, default nextcmsmains), then rewrites
 * `.env` to DB_TYPE=postgres.
 *
 * After it finishes, restart the Next.js server.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId } from 'mongodb';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');

dotenv.config({ path: ENV_PATH });

const DEFAULT_POSTGRES_DATABASE_NAME = 'nextcmsmains';
/** Resolved at runtime from --database= or POSTGRES_DATABASE in .env. */
let POSTGRES_DATABASE_NAME = DEFAULT_POSTGRES_DATABASE_NAME;

const TABLES = [
  'masterdbs',
  'users',
  'settings',
  'roles',
  'plugins',
  'plugindatas',
  'pluginmigrations',
  'pages',
  'blogposts',
  'categories',
  'tags',
  'authors',
  'comments',
  'analyticsevents',
  'layouts',
  'themesettings',
  'themes',
  'websitepreferences',
  'menuredirectmappings',
  'menuredirectanalytics',
  'menuredirecthistories',
  'forms',
  'formsubmissions',
  'formversions',
  'formauditlogs',
  'theme_engine_themes',
  'theme_engine_settings',
  'theme_engine_preview_sessions',
];

/** table → logical mongo source: master | users | pages */
const TABLE_SOURCE = {
  masterdbs: 'master',
  users: 'users',
  settings: 'users',
  roles: 'users',
  plugins: 'users',
  plugindatas: 'users',
  pluginmigrations: 'users',
  pages: 'pages',
  blogposts: 'pages',
  categories: 'pages',
  tags: 'pages',
  authors: 'pages',
  comments: 'pages',
  analyticsevents: 'pages',
  layouts: 'pages',
  themesettings: 'pages',
  themes: 'pages',
  websitepreferences: 'pages',
  menuredirectmappings: 'pages',
  menuredirectanalytics: 'pages',
  menuredirecthistories: 'pages',
  forms: 'pages',
  formsubmissions: 'pages',
  formversions: 'pages',
  formauditlogs: 'pages',
  theme_engine_themes: 'pages',
  theme_engine_settings: 'pages',
  theme_engine_preview_sessions: 'pages',
};

const NAVIGABLE = {
  masterdbs: [
    ['userDbName', 'string', '$.userDbName', 128, true],
    ['pageDbName', 'string', '$.pageDbName', 128, true],
  ],
  users: [
    ['username', 'string', '$.username', 191, true],
    ['email', 'string', '$.email', 191, true],
    ['role', 'int', '$.role', 0, true],
    ['active', 'bool', '$.active', 0, true],
    ['displayName', 'string', '$.displayName', 191, false],
  ],
  settings: [
    ['siteTitle', 'string', '$.siteTitle', 255, true],
    ['language', 'string', '$.language', 32, false],
  ],
  roles: [
    ['name', 'string', '$.name', 128, true],
    ['value', 'int', '$.value', 0, true],
    ['type', 'string', '$.type', 32, true],
  ],
  plugins: [
    ['pluginId', 'string', '$.pluginId', 128, true],
    ['name', 'string', '$.name', 191, false],
    ['version', 'string', '$.version', 64, false],
    ['isActive', 'bool', '$.isActive', 0, true],
  ],
  plugindatas: [
    ['pluginId', 'string', '$.pluginId', 128, true],
    ['key', 'string', '$.key', 191, true],
  ],
  pluginmigrations: [
    ['pluginId', 'string', '$.pluginId', 128, true],
    ['version', 'string', '$.version', 64, false],
  ],
  pages: [
    ['pageName', 'string', '$.pageName', 191, true],
    ['slug', 'string', '$.slug', 191, true],
    ['pageType', 'string', '$.pageType', 32, true],
    ['isPublished', 'bool', '$.isPublished', 0, true],
    ['isHome', 'bool', '$.isHome', 0, true],
  ],
  blogposts: [
    ['pageName', 'string', '$.pageName', 191, true],
    ['slug', 'string', '$.slug', 191, true],
    ['status', 'string', '$.status', 32, true],
    ['isPublished', 'bool', '$.isPublished', 0, true],
    ['authorName', 'string', '$.authorName', 191, false],
    ['publishedAt', 'datetime', '$.publishedAt', 0, true],
  ],
  categories: [
    ['name', 'string', '$.name', 191, true],
    ['slug', 'string', '$.slug', 191, true],
  ],
  tags: [
    ['name', 'string', '$.name', 191, true],
    ['slug', 'string', '$.slug', 191, true],
  ],
  authors: [
    ['name', 'string', '$.name', 191, true],
    ['slug', 'string', '$.slug', 191, true],
    ['email', 'string', '$.email', 191, false],
  ],
  comments: [
    ['postId', 'string', '$.postId', 64, true],
    ['authorName', 'string', '$.authorName', 191, false],
    ['status', 'string', '$.status', 32, true],
  ],
  analyticsevents: [
    ['event', 'string', '$.event', 128, true],
    ['path', 'string', '$.path', 512, false],
  ],
  layouts: [
    ['name', 'string', '$.name', 191, true],
    ['slug', 'string', '$.slug', 191, true],
  ],
  themesettings: [['themeId', 'string', '$.themeId', 128, true]],
  themes: [
    ['name', 'string', '$.name', 191, true],
    ['slug', 'string', '$.slug', 191, true],
    ['isActive', 'bool', '$.isActive', 0, true],
  ],
  websitepreferences: [
    ['siteName', 'string', '$.siteName', 191, false],
    ['primaryColor', 'string', '$.primaryColor', 64, false],
  ],
  menuredirectmappings: [
    ['fromPath', 'string', '$.fromPath', 512, true],
    ['toPath', 'string', '$.toPath', 512, false],
    ['isActive', 'bool', '$.isActive', 0, true],
  ],
  menuredirectanalytics: [['mappingId', 'string', '$.mappingId', 64, true]],
  menuredirecthistories: [
    ['mappingId', 'string', '$.mappingId', 64, true],
    ['action', 'string', '$.action', 64, false],
  ],
  forms: [
    ['name', 'string', '$.name', 191, true],
    ['slug', 'string', '$.slug', 191, true],
    ['status', 'string', '$.status', 32, true],
  ],
  formsubmissions: [
    ['formId', 'string', '$.formId', 64, true],
    ['status', 'string', '$.status', 32, true],
  ],
  formversions: [
    ['formId', 'string', '$.formId', 64, true],
    ['version', 'int', '$.version', 0, false],
  ],
  formauditlogs: [
    ['formId', 'string', '$.formId', 64, true],
    ['action', 'string', '$.action', 64, true],
  ],
  theme_engine_themes: [
    ['name', 'string', '$.name', 191, true],
    ['slug', 'string', '$.slug', 191, true],
  ],
  theme_engine_settings: [['themeId', 'string', '$.themeId', 128, true]],
  theme_engine_preview_sessions: [
    ['themeId', 'string', '$.themeId', 128, true],
    ['token', 'string', '$.token', 128, true],
  ],
};

function sanitizePostgresIdent(name, label = 'database') {
  const trimmed = String(name || '').trim();
  if (!trimmed || !/^[A-Za-z0-9_]+$/.test(trimmed)) {
    throw new Error(`Invalid PostgreSQL ${label}: "${name}" (use letters, numbers, underscore only)`);
  }
  return trimmed;
}

function parseArgs(argv) {
  const out = {
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DATABASE || DEFAULT_POSTGRES_DATABASE_NAME,
    dryRun: false,
    force: false,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--force') out.force = true;
    else if (arg.startsWith('--host=')) out.host = arg.slice(7);
    else if (arg.startsWith('--port=')) out.port = Number(arg.slice(7));
    else if (arg.startsWith('--user=')) out.user = arg.slice(7);
    else if (arg.startsWith('--password=')) out.password = arg.slice(11);
    else if (arg.startsWith('--database=')) out.database = arg.slice(11);
    else if (arg.startsWith('--postgres-database=')) out.database = arg.slice(20);
    else if (arg === '--help' || arg === '-h') out.help = true;
  }
  out.database = sanitizePostgresIdent(out.database);
  return out;
}

function envValue(value) {
  const raw = value == null ? '' : String(value);
  if (raw === '') return '';
  if (/[\s#"'$`\\]/.test(raw)) return JSON.stringify(raw);
  return raw;
}

/** Put a CMS db name into a URI. Avoids `new URL()` — it breaks Atlas replica-set hosts (commas). */
function withMongoDbName(uri, dbName) {
  const raw = String(uri || '').trim();
  if (!raw) throw new Error('MongoDB URI is empty');

  if (/^mongodb\+srv:\/\//i.test(raw)) {
    const url = new URL(raw);
    url.pathname = `/${dbName}`;
    return url.toString();
  }

  if (!/^mongodb:\/\//i.test(raw)) {
    throw new Error('URI must start with mongodb:// or mongodb+srv://');
  }

  const rest = raw.replace(/^mongodb:\/\//i, '');
  const qIndex = rest.indexOf('?');
  const beforeQuery = qIndex === -1 ? rest : rest.slice(0, qIndex);
  const query = qIndex === -1 ? '' : rest.slice(qIndex);
  const slash = beforeQuery.indexOf('/');
  const authority = slash === -1 ? beforeQuery : beforeQuery.slice(0, slash);
  return `mongodb://${authority}/${dbName}${query}`;
}

function buildMongoUri(dbName) {
  const {
    MONGODB,
    MONGODB_URI,
    MONGODB_USERNAME,
    MONGODB_PASSWORD,
    MONGODB_HOST,
    MONGODB_CLUSTER,
    MONGODB_AUTH_MECH,
    MONGODB_AUTH_SOURCE,
  } = process.env;

  if (MONGODB === 'uri' || (!MONGODB && MONGODB_URI)) {
    if (!MONGODB_URI) throw new Error('MONGODB_URI is required');
    return withMongoDbName(MONGODB_URI, dbName);
  }

  if (!MONGODB_USERNAME || !MONGODB_PASSWORD || !MONGODB_HOST) {
    throw new Error('MongoDB credentials missing from .env');
  }

  if (MONGODB === 'atlas') {
    if (!MONGODB_CLUSTER) throw new Error('MONGODB_CLUSTER required for Atlas');
    return `mongodb+srv://${encodeURIComponent(MONGODB_USERNAME)}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/${dbName}?retryWrites=true&w=majority`;
  }

  if (MONGODB === 'compass') {
    const mech = MONGODB_AUTH_MECH || 'SCRAM-SHA-256';
    const source = MONGODB_AUTH_SOURCE || 'admin';
    return `mongodb://${encodeURIComponent(MONGODB_USERNAME)}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}/${dbName}?authMechanism=${mech}&authSource=${source}`;
  }

  throw new Error(`Unsupported or missing MONGODB type in .env (got: ${MONGODB || 'unset'})`);
}

function jsonSafe(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (v instanceof ObjectId) return v.toHexString();
      if (v && typeof v === 'object' && v._bsontype === 'ObjectID') return String(v);
      if (v instanceof Date) return v.toISOString();
      return v;
    })
  );
}

function idOf(doc) {
  if (!doc || doc._id == null) return null;
  if (doc._id instanceof ObjectId) return doc._id.toHexString();
  if (typeof doc._id === 'object' && doc._id.$oid) return doc._id.$oid;
  return String(doc._id);
}

function qIdent(name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`Invalid identifier: ${name}`);
  return `"${name}"`;
}

function cmsTable(table) {
  return `public.${qIdent(table)}`;
}

function docFieldKey(jsonPath) {
  const m = jsonPath.match(/^\$\.([A-Za-z_][A-Za-z0-9_]*)$/);
  return m ? m[1] : null;
}

function serializeColumnValue(type, value) {
  if (value == null) return null;
  switch (type) {
    case 'bool':
      return value === true || value === 1 || value === '1' || value === 'true';
    case 'int': {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    case 'datetime': {
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    default:
      return String(value);
  }
}

function splitDocumentForStorage(table, doc) {
  const defs = NAVIGABLE[table] || [];
  const plain = { ...doc };
  const overflow = { ...plain };
  const columns = {};
  const rowMetaKeys = new Set(['_id', 'createdAt', 'updatedAt', '__v']);

  for (const [colName, type, jsonPath] of defs) {
    const topKey = docFieldKey(jsonPath);
    let value;
    if (topKey) {
      value = plain[topKey];
      delete overflow[topKey];
    } else {
      const path = jsonPath.replace(/^\$\.?/, '');
      value = path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), plain);
      delete overflow[path.split('.')[0]];
    }
    columns[colName] = serializeColumnValue(type, value);
  }

  for (const key of rowMetaKeys) {
    delete overflow[key];
  }

  return { overflow, columns };
}

function storedColumnDdl(name, type, length) {
  switch (type) {
    case 'int':
      return `${qIdent(name)} INTEGER NULL`;
    case 'bool':
      return `${qIdent(name)} BOOLEAN NULL`;
    case 'datetime':
      return `${qIdent(name)} TIMESTAMPTZ NULL`;
    default:
      return `${qIdent(name)} VARCHAR(${length || 255}) NULL`;
  }
}

function placeholders(count, start = 1) {
  return Array.from({ length: count }, (_, i) => `$${start + i}`).join(', ');
}

async function withAdminClient(cfg, fn) {
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

async function ensureDatabase(cfg, dbName, force) {
  await withAdminClient(cfg, async (client) => {
    if (force) {
      await client
        .query(
          `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
          [dbName]
        )
        .catch(() => undefined);
      await client.query(`DROP DATABASE IF EXISTS ${qIdent(dbName)}`);
    }
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (!existing.rowCount) {
      await client.query(`CREATE DATABASE ${qIdent(dbName)}`);
    }
  });
}

async function listTableColumns(client, table) {
  const { rows } = await client.query(
    `SELECT column_name AS name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return new Set(rows.map((r) => r.name));
}

async function listTableIndexes(client, table) {
  const { rows } = await client.query(
    `SELECT indexname AS name
     FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = $1`,
    [table]
  );
  return new Set(rows.map((r) => r.name));
}

async function ensureBrowseView(client, table) {
  const finalSet = await listTableColumns(client, table);
  const browseCols = ['_id', ...(NAVIGABLE[table] || []).map((d) => d[0]), 'createdAt', 'updatedAt'].filter(
    (n) => finalSet.has(n)
  );
  if (!browseCols.length) return;
  await client.query(
    `CREATE OR REPLACE VIEW ${qIdent(`browse_${table}`)} AS SELECT ${browseCols
      .map(qIdent)
      .join(', ')} FROM ${cmsTable(table)}`
  );
}

async function ensureOneTable(client, table) {
  if (!/^[A-Za-z0-9_]+$/.test(table)) {
    console.warn(`  ! skip invalid table name: ${table}`);
    return;
  }

  await client.query(
    `CREATE TABLE IF NOT EXISTS ${cmsTable(table)} (
      "_id" VARCHAR(64) NOT NULL,
      "doc" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMPTZ NULL,
      "updatedAt" TIMESTAMPTZ NULL,
      PRIMARY KEY ("_id")
    )`
  );

  let existing = await listTableColumns(client, table);
  const existingIndexes = await listTableIndexes(client, table);

  for (const def of NAVIGABLE[table] || []) {
    const [colName, type, , length, indexed] = def;
    if (!existing.has(colName)) {
      try {
        await client.query(`ALTER TABLE ${cmsTable(table)} ADD COLUMN ${storedColumnDdl(colName, type, length)}`);
        existing.add(colName);
      } catch (err) {
        console.warn(`  ! skip column ${table}.${colName}: ${err.message}`);
      }
    }
    if (indexed && existing.has(colName)) {
      const idx = `idx_${table}_${colName}`.slice(0, 63);
      if (!existingIndexes.has(idx)) {
        try {
          await client.query(
            `CREATE INDEX IF NOT EXISTS ${qIdent(idx)} ON ${cmsTable(table)} (${qIdent(colName)})`
          );
          existingIndexes.add(idx);
        } catch {
          /* index may already exist */
        }
      }
    }
  }

  await ensureBrowseView(client, table);
}

async function ensureSchema(client, extraTables = []) {
  const all = [...new Set([...TABLES, ...extraTables])];
  for (const table of all) {
    await ensureOneTable(client, table);
  }
}

function writePostgresEnv({ host, port, user, password, database }) {
  const userDbName = process.env.USER_DB_NAME || 'users';
  const pageDbName = process.env.PAGE_DB_NAME || 'pages';
  const jwtSecret = process.env.JWT_SECRET || '';
  const content = `# NEXT CMS — switched to PostgreSQL by npm run db:switch-postgres
# NEXT_PUBLIC_BACKEND_URL=http://localhost:3012
DB_TYPE=postgres
POSTGRES_HOST=${envValue(host)}
POSTGRES_PORT=${envValue(port)}
POSTGRES_USER=${envValue(user)}
POSTGRES_PASSWORD=${envValue(password)}
POSTGRES_DATABASE=${envValue(database || POSTGRES_DATABASE_NAME)}
USER_DB_NAME=${envValue(userDbName)}
PAGE_DB_NAME=${envValue(pageDbName)}
isRegistration=${process.env.isRegistration || 'true'}
dbConnection=true
NEXT_PUBLIC_needsRestart=false
DEFAULT_HOME_SLUG=${envValue(process.env.DEFAULT_HOME_SLUG || 'default_home')}
WEB_ACCESS_KEY=${envValue(process.env.WEB_ACCESS_KEY || 'allowMe')}
JWT_SECRET=${envValue(jwtSecret)}
`.trim();

  if (fs.existsSync(ENV_PATH)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(ENV_PATH, path.join(ROOT, `.env.mongodb.backup.${stamp}`));
  }
  fs.writeFileSync(ENV_PATH, content + '\n', 'utf8');
}

async function databaseHasData(client) {
  const { rows: tables } = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );
  if (!tables.length) return false;

  for (const { table_name: tableName } of tables) {
    const { rows } = await client.query(`SELECT COUNT(*)::bigint AS cnt FROM ${cmsTable(tableName)}`);
    if (Number(rows[0]?.cnt || 0) > 0) return true;
  }
  return false;
}

async function upsertDocument(client, table, doc) {
  const id = idOf(doc);
  if (!id) return false;
  doc._id = id;

  const createdAt = doc.createdAt ? new Date(doc.createdAt) : null;
  const updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : null;
  const { overflow, columns } = splitDocumentForStorage(table, doc);
  const payload = JSON.stringify(overflow);

  const colNames = (NAVIGABLE[table] || []).map((d) => d[0]);
  const insertCols = ['"_id"', '"doc"', '"createdAt"', '"updatedAt"', ...colNames.map(qIdent)];
  const values = [id, payload, createdAt, updatedAt];
  for (const name of colNames) {
    values.push(columns[name] ?? null);
  }

  const updates = [
    `"doc" = EXCLUDED."doc"`,
    `"updatedAt" = EXCLUDED."updatedAt"`,
    ...colNames.map((c) => `${qIdent(c)} = EXCLUDED.${qIdent(c)}`),
  ].join(', ');

  await client.query(
    `INSERT INTO ${cmsTable(table)} (${insertCols.join(', ')})
     VALUES ($1, $2::jsonb, $3, $4${colNames.length ? ', ' + placeholders(colNames.length, 5) : ''})
     ON CONFLICT ("_id") DO UPDATE SET ${updates}`,
    values
  );
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`
Switch this CMS installation from MongoDB to PostgreSQL (one command).

  npm run db:switch-postgres -- --host=127.0.0.1 --port=5432 --user=postgres --password=secret
  npm run db:switch-postgres -- --host=127.0.0.1 --user=postgres --password=secret --database=mycms_db

Options:
  --host=                PostgreSQL host (default: 127.0.0.1 or POSTGRES_HOST)
  --port=                PostgreSQL port (default: 5432)
  --user=                PostgreSQL user (default: postgres)
  --password=            PostgreSQL password
  --database=            PostgreSQL database name (default: POSTGRES_DATABASE from .env or nextcmsmains)
  --postgres-database=   Alias for --database=
  --dry-run              Connect + count docs only; do not write PostgreSQL or .env
  --force                Allow overwrite if target PostgreSQL database already has data
`);
    process.exit(0);
  }

  POSTGRES_DATABASE_NAME = args.database;

  if (
    (process.env.DB_TYPE === 'postgres' || process.env.DB_TYPE === 'postgresql') &&
    !process.env.MONGODB &&
    !process.env.MONGODB_URI
  ) {
    console.error('Already on PostgreSQL (DB_TYPE=postgres). Nothing to switch.');
    process.exit(1);
  }

  if (!fs.existsSync(ENV_PATH)) {
    console.error('No .env found. Complete a MongoDB install first, then run this command.');
    process.exit(1);
  }

  const userDbName = process.env.USER_DB_NAME || 'users';
  const pageDbName = process.env.PAGE_DB_NAME || 'pages';
  const dbNameFor = (source) => {
    if (source === 'master') return 'master';
    if (source === 'users') return userDbName;
    return pageDbName;
  };

  console.log('→ Connecting to MongoDB…');
  const mongo = new MongoClient(buildMongoUri('master'), { serverSelectionTimeoutMS: 15000 });
  await mongo.connect();

  const plan = [];
  const seen = new Set();

  async function collectFrom(source) {
    const db = mongo.db(dbNameFor(source));
    const collections = await db.listCollections().toArray();
    for (const { name } of collections) {
      if (name.startsWith('system.')) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      const docs = await db.collection(name).find({}).toArray();
      plan.push({ table: name, source, count: docs.length, docs });
    }
  }

  for (const table of TABLES) {
    const source = TABLE_SOURCE[table];
    const db = mongo.db(dbNameFor(source));
    const exists = await db.listCollections({ name: table }).toArray();
    seen.add(table);
    if (!exists.length) {
      plan.push({ table, source, count: 0, docs: [] });
      continue;
    }
    const docs = await db.collection(table).find({}).toArray();
    plan.push({ table, source, count: docs.length, docs });
  }
  await collectFrom('master');
  await collectFrom('users');
  await collectFrom('pages');

  const total = plan.reduce((n, p) => n + p.count, 0);
  console.log(`→ Found ${total} document(s) across ${plan.filter((p) => p.count).length} collection(s).`);

  if (args.dryRun) {
    for (const p of plan.filter((x) => x.count)) {
      console.log(`   ${p.table.padEnd(28)} ${p.count}`);
    }
    console.log('Dry run complete. No PostgreSQL/.env changes.');
    await mongo.close();
    return;
  }

  const pgCfg = {
    host: args.host,
    port: args.port,
    user: args.user,
    password: args.password,
  };

  console.log(`→ Connecting to PostgreSQL at ${args.host}:${args.port}…`);

  const adminProbe = new pg.Client({ ...pgCfg, database: 'postgres', connectionTimeoutMillis: 15000 });
  await adminProbe.connect();
  await adminProbe.end().catch(() => undefined);

  const pgClient = new pg.Client({
    ...pgCfg,
    database: POSTGRES_DATABASE_NAME,
    connectionTimeoutMillis: 15000,
  });

  try {
    const dbExists = await withAdminClient(pgCfg, async (client) => {
      const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
        POSTGRES_DATABASE_NAME,
      ]);
      return rowCount > 0;
    });

    if (dbExists && !args.force) {
      await pgClient.connect();
      if (await databaseHasData(pgClient)) {
        throw new Error(
          `PostgreSQL database "${POSTGRES_DATABASE_NAME}" already has data. Re-run with --force to overwrite tables.`
        );
      }
      await pgClient.end().catch(() => undefined);
    } else if (!dbExists) {
      await pgClient.end().catch(() => undefined);
    } else {
      await pgClient.end().catch(() => undefined);
    }

    console.log('→ Ensuring PostgreSQL database…');
    await ensureDatabase(pgCfg, POSTGRES_DATABASE_NAME, args.force);

    await pgClient.connect();

    console.log('→ Creating navigable PostgreSQL schema…');
    await ensureSchema(
      pgClient,
      plan.map((p) => p.table)
    );

    console.log('→ Migrating documents…');
    for (const p of plan) {
      if (!p.count) continue;
      let written = 0;
      for (const raw of p.docs) {
        const doc = jsonSafe(raw);
        if (await upsertDocument(pgClient, p.table, doc)) {
          written += 1;
        }
      }
      console.log(`   ${p.table.padEnd(28)} ${written}`);
    }

    console.log('→ Updating .env to DB_TYPE=postgres…');
    writePostgresEnv(args);

    console.log(`
✓ Switch complete.

  Database: ${POSTGRES_DATABASE_NAME}
  Browse views: browse_users, browse_pages, browse_blogposts, …

  Next steps:
  1. Restart the Next.js server (npm run dev / npm run start)
  2. Open pgAdmin or psql → ${POSTGRES_DATABASE_NAME} → use browse_* views to navigate

  A backup of your previous .env was saved as .env.mongodb.backup.*
`);
  } finally {
    await pgClient.end().catch(() => undefined);
    await mongo.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error('\nSwitch failed:', err.message || err);
  process.exit(1);
});
