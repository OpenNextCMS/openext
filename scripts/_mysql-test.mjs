/**
 * Quick MySQL connection test.
 * Usage: node scripts/_mysql-test.mjs root "" openext
 *   arg1 = user, arg2 = password, arg3 = database
 */
import mysql from 'mysql2/promise';

const [, , user = 'root', password = '', database = 'openext'] = process.argv;

console.log(`Testing MySQL 127.0.0.1:3306 as ${user}, db=${database}`);

const candidates = [
  {
    label: 'tcp',
    config: {
      host: 'localhost',
      port: 3306,
    },
  },
  {
    label: 'tcp (ssl rejectUnauthorized=false)',
    config: {
      host: 'localhost',
      port: 3306,
      ssl: { rejectUnauthorized: false },
    },
  },
  {
    label: 'tcp (IPv6 ::1)',
    config: {
      host: '::1',
      port: 3306,
    },
  },
  {
    label: 'tcp (IPv6 ::1 ssl rejectUnauthorized=false)',
    config: {
      host: '::1',
      port: 3306,
      ssl: { rejectUnauthorized: false },
    },
  },
  {
    label: 'named-pipe MySQL',
    config: {
      socketPath: '\\\\.\\pipe\\MySQL',
    },
  },
  {
    label: 'named-pipe mysql',
    config: {
      socketPath: '\\\\.\\pipe\\mysql',
    },
  },
  {
    label: 'named-pipe MySQL80',
    config: {
      socketPath: '\\\\.\\pipe\\MySQL80',
    },
  },
  {
    label: 'named-pipe MySQL57',
    config: {
      socketPath: '\\\\.\\pipe\\MySQL57',
    },
  },
  {
    label: 'named-pipe MySQL56',
    config: {
      socketPath: '\\\\.\\pipe\\MySQL56',
    },
  },
  {
    label: 'named-pipe MySQL5',
    config: {
      socketPath: '\\\\.\\pipe\\MySQL5',
    },
  },
];

let conn;
let lastErr;
for (const c of candidates) {
  try {
    conn = await mysql.createConnection({
      ...c.config,
      user,
      password,
      database,
      connectTimeout: 15000,
      ssl: c.config.ssl ?? false,
      multipleStatements: false,
    });
    await conn.ping();
    const [rows] = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? LIMIT 10`,
      [database]
    );
    console.log(`✓ Connected via ${c.label}. Tables found:`, rows.map((r) => r.TABLE_NAME));
    conn = conn; // keep for finally
    lastErr = null;
    break;
  } catch (err) {
    lastErr = err;
    console.error(`- ${c.label} failed:`, err.code || '', err.message);
  }
}

if (lastErr) {
  console.error('✗ All MySQL connection attempts failed.');
  console.error('  last code:', lastErr.code || '');
  console.error('  last errno:', lastErr.errno, '| sqlState:', lastErr.sqlState);
}

if (conn) await conn.end().catch(() => {});
