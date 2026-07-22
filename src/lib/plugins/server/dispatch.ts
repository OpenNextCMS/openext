import { NextRequest, NextResponse } from 'next/server';
import type { AuthUser } from '@/lib/api/auth';
import type { PluginRequest, PluginResponse } from '@/lib/plugins/server/types';

export async function buildPluginRequest(options: {
  req: NextRequest;
  pluginId: string;
  pathSegments: string[];
  user: AuthUser | null;
  permissions: string[];
  roles: string[];
}): Promise<PluginRequest> {
  const { req, pluginId, pathSegments, user, permissions, roles } = options;
  const url = new URL(req.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  let body: unknown = null;
  const contentType = req.headers.get('content-type') || '';
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (contentType.includes('application/json')) {
      try {
        body = await req.json();
      } catch {
        body = null;
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      body = Object.fromEntries(new URLSearchParams(text));
    } else if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData();
        body = Object.fromEntries([...formData.entries()]);
      } catch {
        body = null;
      }
    } else {
      const text = await req.text();
      body = text || null;
    }
  }

  const relativePath = pathSegments.join('/');

  return {
    method: req.method,
    url: req.url,
    path: relativePath,
    params: {},
    query,
    body,
    headers: req.headers,
    user,
    permissions,
    roles,
    pluginId,
  };
}

export function pluginResponseToNext(res: PluginResponse): NextResponse {
  const body = res.getBody();
  const headers = res.getHeaders();
  const status = res.getStatus();

  if (body === null || body === undefined) {
    return new NextResponse(null, { status, headers });
  }

  if (headers['content-type']?.includes('application/json') || typeof body === 'object') {
    return NextResponse.json(body, { status, headers });
  }

  return new NextResponse(String(body), { status, headers });
}
