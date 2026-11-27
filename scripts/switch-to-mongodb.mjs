/**
 * One-command MySQL → MongoDB switch for Next CMS.
 *
 * Usage (Compass):
 *   npm run db:switch-mongodb -- --type=compass --username=admin --password=secret --host=127.0.0.1:27017 --authSource=admin --authMech=SCRAM-SHA-256
 *
 * Usage (Atlas):
 *   npm run db:switch-mongodb -- --type=atlas --username=user --password=secret --cluster=cluster0 --host=abc123
 *
 * Usage (URI):
 *   npm run db:switch-mongodb -- --type=uri --uri="mongodb://127.0.0.1:27017"
 *
 * Reads MySQL from `.env` (or --mysql-* flags), migrates every table in
 * MYSQL_DATABASE (custom name from install, default nextcmsmains) into MongoDB
 * (master / USER_DB_NAME / PAGE_DB_NAME), then rewrites `.env` to DB_TYPE=mongodb.
 *
 * After it finishes, restart the Next.js server.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId } from 'mongodb';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');

dotenv.config({ path: ENV_PATH });

const DEFAULT_MYSQL_DATABASE_NAME = 'nextcmsmains';

/** Navigable SQL columns → JSON paths (split storage; values may not be in `doc`). */
const NAVIGABLE = {
  masterdbs: [
    ['userDbName', 'string', '$.userDbName'],
    ['pageDbName', 'string', '$.pageDbName'],
  ],
  users: [
    ['username', 'string', '$.username'],
    ['email', 'string', '$.email'],
    ['role', 'int', '$.role'],
    ['active', 'bool', '$.active'],
    ['displayName', 'string', '$.displayName'],
  ],
  settings: [
    ['siteTitle', 'string', '$.siteTitle'],
    ['language', 'string', '$.language'],
  ],
  roles: [
    ['name', 'string', '$.name'],
    ['value', 'int', '$.value'],
    ['type', 'string', '$.type'],
  ],
  plugins: [
    ['pluginId', 'string', '$.pluginId'],
    ['name', 'string', '$.name'],
    ['version', 'string', '$.version'],
    ['isActive', 'bool', '$.isActive'],
  ],
  plugindatas: [
    ['pluginId', 'string', '$.pluginId'],
    ['key', 'string', '$.key'],
  ],
  pluginmigrations: [
    ['pluginId', 'string', '$.pluginId'],
    ['version', 'string', '$.version'],
  ],
  pages: [
    ['pageName', 'string', '$.pageName'],
    ['slug', 'string', '$.slug'],
    ['pageType', 'string', '$.pageType'],
    ['isPublished', 'bool', '$.isPublished'],
    ['isHome', 'bool', '$.isHome'],
  ],
  blogposts: [
    ['pageName', 'string', '$.pageName'],
    ['slug', 'string', '$.slug'],
    ['status', 'string', '$.status'],
    ['isPublished', 'bool', '$.isPublished'],
    ['authorName', 'string', '$.authorName'],
    ['publishedAt', 'datetime', '$.publishedAt'],
  ],
  categories: [
    ['name', 'string', '$.name'],
    ['slug', 'string', '$.slug'],
  ],
  tags: [
    ['name', 'string', '$.name'],
    ['slug', 'string', '$.slug'],
  ],
  authors: [
    ['name', 'string', '$.name'],
    ['slug', 'string', '$.slug'],
    ['email', 'string', '$.email'],
  ],
  comments: [
    ['postId', 'string', '$.postId'],
    ['authorName', 'string', '$.authorName'],
    ['status', 'string', '$.status'],
  ],
  analyticsevents: [
    ['event', 'string', '$.event'],
    ['path', 'string', '$.path'],
  ],
  layouts: [
    ['name', 'string', '$.name'],
    ['slug', 'string', '$.slug'],
  ],
  themesettings: [['themeId', 'string', '$.themeId']],
  themes: [
    ['name', 'string', '$.name'],
    ['slug', 'string', '$.slug'],
    ['isActive', 'bool', '$.isActive'],
  ],
  websitepreferences: [
    ['siteName', 'string', '$.siteName'],
    ['primaryColor', 'string', '$.primaryColor'],
  ],
  menuredirectmappings: [
    ['fromPath', 'string', '$.fromPath'],
    ['toPath', 'string', '$.toPath'],
    ['isActive', 'bool', '$.isActive'],
  ],
  menuredirectanalytics: [['mappingId', 'string', '$.mappingId']],
  menuredirecthistories: [
    ['mappingId', 'string', '$.mappingId'],
    ['action', 'string', '$.action'],
  ],
  forms: [
    ['name', 'string', '$.name'],
    ['slug', 'string', '$.slug'],
    ['status', 'string', '$.status'],
  ],
  formsubmissions: [
    ['formId', 'string', '$.formId'],
    ['status', 'string', '$.status'],
  ],
  formversions: [
    ['formId', 'string', '$.formId'],
    ['version', 'int', '$.version'],
  ],
  formauditlogs: [
    ['formId', 'string', '$.formId'],
    ['action', 'string', '$.action'],
  ],
  theme_engine_themes: [
    ['name', 'string', '$.name'],
    ['slug', 'string', '$.slug'],
  ],
  theme_engine_settings: [['themeId', 'string', '$.themeId']],
  theme_engine_preview_sessions: [
    ['themeId', 'string', '$.themeId'],
    ['token', 'string', '$.token'],
  ],
};

/** table → logical mongo DB: master | users | pages */
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

function sanitizeMysqlIdent(name, label = 'database') {
  const trimmed = String(name || '').trim();
  if (!trimmed || !/^[A-Za-z0-9_]+$/.test(trimmed)) {
    throw new Error(`Invalid MySQL ${label}: "${name}" (use letters, numbers, underscore only)`);
  }
  return trimmed;
}

function parseArgs(argv) {
  const out = {
    type: '',
    uri: '',
    username: '',
    password: '',
    host: '127.0.0.1:27017',
    cluster: '',
    authMech: 'SCRAM-SHA-256',
    authSource: 'admin',
    mysqlHost: process.env.MYSQL_HOST || '127.0.0.1',
    mysqlPort: Number(process.env.MYSQL_PORT || 3306),
    mysqlUser: process.env.MYSQL_USER || 'root',
    mysqlPassword: process.env.MYSQL_PASSWORD || '',
    mysqlDatabase:
      process.env.MYSQL_DATABASE || DEFAULT_MYSQL_DATABASE_NAME,
    dryRun: false,
    force: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--force') out.force = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg.startsWith('--type=')) out.type = arg.slice(7).toLowerCase();
    else if (arg.startsWith('--uri=')) out.uri = arg.slice(6);
    else if (arg.startsWith('--uri-file=')) {
      const filePath = path.isAbsolute(arg.slice(11))
        ? arg.slice(11)
        : path.join(ROOT, arg.slice(11));
      out.uri = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/)[0].trim();
    }
    else if (arg.startsWith('--username=')) out.username = arg.slice(11);
    else if (arg.startsWith('--password=')) out.password = arg.slice(11);
    else if (arg.startsWith('--host=')) out.host = arg.slice(7);
    else if (arg.startsWith('--cluster=')) out.cluster = arg.slice(10);
    else if (arg.startsWith('--authMech=')) out.authMech = arg.slice(11);
    else if (arg.startsWith('--authSource=')) out.authSource = arg.slice(13);
    else if (arg.startsWith('--mysql-host=')) out.mysqlHost = arg.slice(13);
    else if (arg.startsWith('--mysql-port=')) out.mysqlPort = Number(arg.slice(13));
    else if (arg.startsWith('--mysql-user=')) out.mysqlUser = arg.slice(13);
    else if (arg.startsWith('--mysql-password=')) out.mysqlPassword = arg.slice(17);
    else if (arg.startsWith('--mysql-database=')) out.mysqlDatabase = arg.slice(17);
    else if (arg.startsWith('--database=')) out.mysqlDatabase = arg.slice(11);
  }

  out.mysqlDatabase = sanitizeMysqlIdent(out.mysqlDatabase);
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

function buildMongoUri(args, dbName) {
  if (args.type === 'uri') {
    const uri = args.uri || process.env.MONGODB_URI || '';
    if (!uri) throw new Error('--uri, --uri-file, or MONGODB_URI is required when --type=uri');
    return withMongoDbName(uri, dbName);
  }

  if (!args.username || !args.password) {
    throw new Error('--username and --password are required for compass/atlas');
  }

  const user = encodeURIComponent(args.username);
  const pass = encodeURIComponent(args.password);

  if (args.type === 'atlas') {
    const { cluster, hostLeaf } = resolveAtlasParts(args.cluster, args.host);
    return `mongodb+srv://${user}:${pass}@${cluster}.${hostLeaf}.mongodb.net/${dbName}?retryWrites=true&w=majority`;
  }

  if (args.type === 'compass') {
    return `mongodb://${user}:${pass}@${args.host}/${dbName}?authMechanism=${encodeURIComponent(args.authMech)}&authSource=${encodeURIComponent(args.authSource)}`;
  }

  throw new Error('--type must be compass, atlas, or uri');
}

/** Accept either (--cluster + --host leaf) or a full cluster0.xxxxx.mongodb.net host. */
function resolveAtlasParts(cluster, host) {
  const raw = String(host || '').trim();
  if (raw.includes('mongodb.net')) {
    const bare = raw.replace(/^mongodb\+srv:\/\//, '').split('/')[0];
    const parts = bare.split('.');
    // cluster0.xxxxx.mongodb.net
    if (parts.length >= 3 && parts[parts.length - 2] === 'mongodb') {
      return { cluster: parts[0], hostLeaf: parts[1] };
    }
  }
  if (!cluster) throw new Error('--cluster is required for atlas');
  if (!raw) throw new Error('--host is required for atlas (subdomain leaf, e.g. abc12)');
  return { cluster, hostLeaf: raw };
}

function reviveDates(value) {
  if (value == null) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (Array.isArray(value)) return value.map(reviveDates);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = reviveDates(v);
    return out;
  }
  return value;
}

function deserializeColumnValue(type, value) {
  if (value == null) return undefined;
  switch (type) {
    case 'bool':
      return value === 1 || value === true || value === '1';
    case 'int':
      return Number(value);
    case 'datetime': {
      if (value instanceof Date) return value;
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? undefined : d;
    }
    default:
      return String(value);
  }
}

function setByJsonPath(target, jsonPath, value) {
  const path = String(jsonPath || '').replace(/^\$\.?/, '');
  if (!path) return;
  const parts = path.split('.');
  let cur = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!cur[key] || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

/** Merge overflow `doc` + navigable SQL columns into a full Mongo document. */
function toMongoDoc(tableName, row) {
  let doc = row.doc;
  if (typeof doc === 'string') {
    try {
      doc = JSON.parse(doc);
    } catch {
      doc = {};
    }
  }
  if (!doc || typeof doc !== 'object') doc = {};

  const id = String(row._id || doc._id || '');
  if (!id) return null;

  const merged = { ...doc };

  for (const def of NAVIGABLE[tableName] || []) {
    const [colName, type, jsonPath] = def;
    if (row[colName] === undefined || row[colName] === null) continue;
    const docVal = deserializeColumnValue(type, row[colName]);
    if (docVal === undefined) continue;
    const topKey = String(jsonPath).match(/^\$\.([A-Za-z_][A-Za-z0-9_]*)$/)?.[1];
    if (topKey) merged[topKey] = docVal;
    else setByJsonPath(merged, jsonPath, docVal);
  }

  const revived = reviveDates({ ...merged, _id: id });

  // Prefer ObjectId when the stored id looks like one (keeps mongoose refs working).
  if (/^[a-fA-F0-9]{24}$/.test(id)) {
    try {
      revived._id = new ObjectId(id);
    } catch {
      revived._id = id;
    }
  } else {
    revived._id = id;
  }

  if (!revived.createdAt && row.createdAt) revived.createdAt = new Date(row.createdAt);
  if (!revived.updatedAt && row.updatedAt) revived.updatedAt = new Date(row.updatedAt);

  return revived;
}

function sourceForTable(tableName) {
  if (TABLE_SOURCE[tableName]) return TABLE_SOURCE[tableName];
  // Plugin / unknown tables default to the pages DB (content side).
  return 'pages';
}

function writeMongodbEnv(args) {
  const userDbName = process.env.USER_DB_NAME || 'users';
  const pageDbName = process.env.PAGE_DB_NAME || 'pages';
  const jwtSecret = process.env.JWT_SECRET || '';

  let credentials = '';
  if (args.type === 'uri') {
    credentials = `MONGODB_URI=${envValue(args.uri)}
MONGODB=uri`;
  } else if (args.type === 'atlas') {
    const { cluster, hostLeaf } = resolveAtlasParts(args.cluster, args.host);
    credentials = `MONGODB_USERNAME=${envValue(args.username)}
MONGODB_PASSWORD=${envValue(args.password)}
MONGODB_HOST=${envValue(hostLeaf)}
MONGODB_CLUSTER=${envValue(cluster)}
MONGODB=atlas`;
  } else {
    credentials = `MONGODB_USERNAME=${envValue(args.username)}
MONGODB_PASSWORD=${envValue(args.password)}
MONGODB_HOST=${envValue(args.host)}
MONGODB_AUTH_MECH=${envValue(args.authMech)}
MONGODB_AUTH_SOURCE=${envValue(args.authSource)}
MONGODB=compass`;
  }

  const content = `# NEXT CMS — switched to MongoDB by npm run db:switch-mongodb
# NEXT_PUBLIC_BACKEND_URL=http://localhost:3012
DB_TYPE=mongodb
${credentials}
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
    fs.copyFileSync(ENV_PATH, path.join(ROOT, `.env.mysql.backup.${stamp}`));
  }
  fs.writeFileSync(ENV_PATH, content + '\n', 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
Switch this CMS installation from MySQL to MongoDB (one command).

  npm run db:switch-mongodb -- --type=compass --username=admin --password=secret --host=127.0.0.1:27017
  npm run db:switch-mongodb -- --type=atlas --username=user --password=secret --cluster=cluster0 --host=xxxxx
  npm run db:switch-mongodb -- --type=uri --uri="mongodb://127.0.0.1:27017"
  node scripts/switch-to-mongodb.mjs --type=uri --uri-file=atlas-uri.txt

Options:
  --type=             compass | atlas | uri
  --uri=              Full MongoDB URI (--type=uri). Prefer standard mongodb:// (not +srv) on Windows.
  --uri-file=         Read URI from a one-line file (avoids CMD splitting on &)
  --username=         MongoDB username
  --password=         MongoDB password
  --host=             Compass host (host:port) or Atlas host subdomain / full *.mongodb.net host
  --cluster=          Atlas cluster name
  --authMech=         Compass auth mechanism (default: SCRAM-SHA-256)
  --authSource=       Compass auth source (default: admin)
  --mysql-host=       Override MySQL host from .env
  --mysql-port=       Override MySQL port from .env
  --mysql-user=       Override MySQL user from .env
  --mysql-password=   Override MySQL password from .env
  --mysql-database=   Override MySQL database name from .env (custom install name)
  --database=         Alias for --mysql-database=
  --dry-run           Count rows only; do not write MongoDB or .env
  --force             Drop overlapping Mongo collections before insert
`);
    process.exit(0);
  }

  if (!args.type) {
    console.error('Missing --type=compass|atlas|uri. Run with --help for examples.');
    process.exit(1);
  }

  const dbType = String(process.env.DB_TYPE || '').toLowerCase();
  if (
    dbType === 'mongodb' &&
    !process.env.MYSQL_HOST &&
    !process.env.POSTGRES_HOST
  ) {
    console.error('Already on MongoDB (DB_TYPE=mongodb). Nothing to switch.');
    process.exit(1);
  }

  if (!fs.existsSync(ENV_PATH)) {
    console.error('No .env found. Complete a MySQL/Postgres install first, then run this command.');
    process.exit(1);
  }

  const userDbName = process.env.USER_DB_NAME || 'users';
  const pageDbName = process.env.PAGE_DB_NAME || 'pages';
  const dbNameFor = (source) => {
    if (source === 'master') return 'master';
    if (source === 'users') return userDbName;
    return pageDbName;
  };

  const sourceEngine =
    dbType === 'postgres' || process.env.POSTGRES_HOST ? 'postgres' : 'mysql';

  let plan = [];

  if (sourceEngine === 'postgres') {
    const { default: pg } = await import('pg');
    const pgHost = process.env.POSTGRES_HOST || '127.0.0.1';
    const pgPort = Number(process.env.POSTGRES_PORT || 5432);
    const pgUser = process.env.POSTGRES_USER || 'postgres';
    const pgPassword = process.env.POSTGRES_PASSWORD || '';
    const pgDatabase =
      process.env.POSTGRES_DATABASE || DEFAULT_MYSQL_DATABASE_NAME;

    console.log(`→ Connecting to PostgreSQL at ${pgHost}:${pgPort} (database: ${pgDatabase})…`);
    const pool = new pg.Pool({
      host: pgHost,
      port: pgPort,
      user: pgUser,
      password: pgPassword,
      database: pgDatabase,
      connectionTimeoutMillis: 15000,
    });

    try {
      const { rows: tables } = await pool.query(
        `SELECT table_name AS name
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
         ORDER BY table_name`
      );

      if (!tables.length) {
        throw new Error(`No tables found in PostgreSQL database "${pgDatabase}"`);
      }

      for (const { name } of tables) {
        if (String(name).startsWith('browse_')) continue;
        if (!/^[A-Za-z0-9_]+$/.test(String(name))) continue;
        const { rows } = await pool.query(`SELECT * FROM public."${name}"`);
        plan.push({
          table: name,
          source: sourceForTable(name),
          count: rows.length,
          rows,
        });
      }
    } finally {
      await pool.end().catch(() => undefined);
    }
  } else {
  const mysqlDatabase = args.mysqlDatabase;

  console.log(`→ Connecting to MySQL at ${args.mysqlHost}:${args.mysqlPort} (database: ${mysqlDatabase})…`);
  const mysqlCandidates = [
    {
      label: 'tcp (provided host)',
      config: { host: args.mysqlHost, port: args.mysqlPort },
    },
    {
      label: 'tcp (localhost)',
      config: { host: 'localhost', port: args.mysqlPort },
    },
    {
      label: 'tcp (IPv6 ::1)',
      config: { host: '::1', port: args.mysqlPort },
    },
    {
      label: 'named-pipe MySQL',
      config: { socketPath: '\\\\.\\pipe\\MySQL' },
    },
    {
      label: 'named-pipe mysql',
      config: { socketPath: '\\\\.\\pipe\\mysql' },
    },
    {
      label: 'named-pipe MySQL80',
      config: { socketPath: '\\\\.\\pipe\\MySQL80' },
    },
    {
      label: 'named-pipe MySQL57',
      config: { socketPath: '\\\\.\\pipe\\MySQL57' },
    },
    {
      label: 'named-pipe MySQL56',
      config: { socketPath: '\\\\.\\pipe\\MySQL56' },
    },
    {
      label: 'named-pipe MySQL5',
      config: { socketPath: '\\\\.\\pipe\\MySQL5' },
    },
  ];

  let mysqlConn;
  let lastErr;
  for (const c of mysqlCandidates) {
    try {
      mysqlConn = await mysql.createConnection({
        ...c.config,
        user: args.mysqlUser,
        password: args.mysqlPassword,
        database: mysqlDatabase,
        connectTimeout: 30000,
        ssl: false,
        multipleStatements: false,
      });
      await mysqlConn.ping();
      console.log(`→ MySQL connected via ${c.label}`);
      lastErr = undefined;
      break;
    } catch (err) {
      lastErr = err;
      console.error(`- MySQL ${c.label} failed:`, err.code || '', err.message);
      if (mysqlConn) {
        await mysqlConn.end().catch(() => undefined);
        mysqlConn = undefined;
      }
    }
  }
  if (!mysqlConn) {
    throw lastErr || new Error('Failed to connect to MySQL');
  }

  try {
    const [tables] = await mysqlConn.query(
      `SELECT TABLE_NAME AS name
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [mysqlDatabase]
    );

    if (!tables.length) {
      throw new Error(`No tables found in MySQL database "${mysqlDatabase}"`);
    }

    for (const { name } of tables) {
      if (String(name).startsWith('browse_')) continue;
      if (!/^[A-Za-z0-9_]+$/.test(String(name))) {
        console.warn(`  ! skip invalid table name: ${name}`);
        continue;
      }
      const [rows] = await mysqlConn.query(`SELECT * FROM \`${name}\``);
      plan.push({
        table: name,
        source: sourceForTable(name),
        count: rows.length,
        rows,
      });
    }
  } finally {
    await mysqlConn.end().catch(() => undefined);
  }
  } // end mysql sourceEngine branch

  const total = plan.reduce((n, p) => n + p.count, 0);
  console.log(`→ Found ${total} row(s) across ${plan.filter((p) => p.count).length} table(s).`);

  if (args.dryRun) {
    for (const p of plan.filter((x) => x.count)) {
      console.log(`   ${p.table.padEnd(28)} ${p.count} → ${dbNameFor(p.source)}`);
    }
    console.log('Dry run complete. No MongoDB/.env changes.');
    return;
  }

  console.log('→ Connecting to MongoDB…');
  const mongo = new MongoClient(buildMongoUri(args, 'master'), {
    serverSelectionTimeoutMS: 20000,
  });
  await mongo.connect();

  try {
    // Quick ping
    await mongo.db('master').command({ ping: 1 });

    console.log('→ Migrating documents…');
    for (const p of plan) {
      if (!p.count) continue;
      const db = mongo.db(dbNameFor(p.source));
      const col = db.collection(p.table);

      if (args.force) {
        await col.drop().catch(() => undefined);
      } else {
        const existing = await col.estimatedDocumentCount();
        if (existing > 0) {
          throw new Error(
            `MongoDB collection ${dbNameFor(p.source)}.${p.table} already has ${existing} document(s). Re-run with --force to overwrite.`
          );
        }
      }

      const docs = [];
      for (const row of p.rows) {
        const doc = toMongoDoc(p.table, row);
        if (doc) docs.push(doc);
      }
      if (!docs.length) continue;

      // Bulk write in chunks
      const chunkSize = 500;
      let written = 0;
      for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize);
        await col.insertMany(chunk, { ordered: false });
        written += chunk.length;
      }
      console.log(`   ${p.table.padEnd(28)} ${written} → ${dbNameFor(p.source)}`);
    }

    // Ensure masterdbs points at logical DB names used by the CMS
    const masterCol = mongo.db('master').collection('masterdbs');
    const masterCount = await masterCol.countDocuments();
    if (masterCount === 0) {
      await masterCol.insertOne({
        userDbName,
        pageDbName,
        userDbUri: buildMongoUri(args, userDbName),
        pageDbUri: buildMongoUri(args, pageDbName),
      });
      console.log('   (created masterdbs pointer record)');
    } else {
      await masterCol.updateMany(
        {},
        {
          $set: {
            userDbName,
            pageDbName,
            userDbUri: buildMongoUri(args, userDbName),
            pageDbUri: buildMongoUri(args, pageDbName),
          },
        }
      );
    }

    console.log('→ Updating .env to DB_TYPE=mongodb…');
    writeMongodbEnv(args);

    console.log(`
✓ Switch complete.

  MongoDB databases: master, ${userDbName}, ${pageDbName}
  Type: ${args.type}

  Next steps:
  1. Restart the Next.js server (npm run dev / npm run start)
  2. Verify data in Compass / Atlas

  A backup of your previous .env was saved as .env.mysql.backup.*
`);
  } finally {
    await mongo.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error('\nSwitch failed:', err.message || err);
  process.exit(1);
});
