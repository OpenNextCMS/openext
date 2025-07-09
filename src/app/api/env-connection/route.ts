// /app/api/db-status/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export async function GET() {
  const envPath = path.resolve(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath);
  const parsed = dotenv.parse(envContent);
  const dbConnection = parsed.dbConnection === 'true';

  return NextResponse.json({ dbConnection });
}
