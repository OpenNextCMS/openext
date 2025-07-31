// /app/api/db-status/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing "key" query param' }, { status: 400 });
    }

    const envPath = path.resolve(process.cwd(), '.env');
    const envContent = await fs.readFile(envPath, 'utf-8');
    const parsed = dotenv.parse(envContent);

    if (!(key in parsed)) {
      return NextResponse.json({ error: `Key "${key}" not found` }, { status: 404 });
    }

    return NextResponse.json({ [key]: parsed[key] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read .env file' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key || typeof value !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const envPath = path.resolve(process.cwd(), '.env');
    const envContent = await fs.readFile(envPath, 'utf-8');
    const lines = envContent.split('\n');

    let updated = false;
    const newLines = lines.map((line) => {
      if (line.startsWith(`${key}=`)) {
        updated = true;
        return `${key}=${value}`;
      }
      return line;
    });

    if (!updated) {
      newLines.push(`${key}=${value}`);
    }

    await fs.writeFile(envPath, newLines.join('\n'), 'utf-8');

    return NextResponse.json({ message: 'Environment variable updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update .env file' }, { status: 500 });
  }
}
