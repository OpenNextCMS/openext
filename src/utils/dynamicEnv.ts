// utils/dynamicEnv.ts
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export function getDynamicEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath);
  return dotenv.parse(envContent);
}