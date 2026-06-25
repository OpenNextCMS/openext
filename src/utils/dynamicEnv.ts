// utils/dynamicEnv.ts
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

type EnvCache = {
  mtimeMs: number;
  values: Record<string, string>;
};

let cache: EnvCache | null = null;

export function getDynamicEnv() {
  const envPath = path.resolve(process.cwd(), '.env');

  let stat: fs.Stats;
  try {
    stat = fs.statSync(envPath);
  } catch {
    return {};
  }

  if (cache && cache.mtimeMs === stat.mtimeMs) {
    return cache.values;
  }

  const envContent = fs.readFileSync(envPath);
  const values = dotenv.parse(envContent);
  cache = { mtimeMs: stat.mtimeMs, values };
  return values;
}