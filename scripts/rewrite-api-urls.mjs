/**
 * Codemod: rewrite nextcms fetch calls to use apiUrl() from @/lib/apiClient.
 * Run: node scripts/rewrite-api-urls.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('src');
const SKIP = new Set(['app/api', 'node_modules', '.next']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if ([...SKIP].some((s) => rel === s || rel.startsWith(s + '/'))) continue;
      walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function ensureImport(content, filePath) {
  if (content.includes("from '@/lib/apiClient'") || content.includes('from "@/lib/apiClient"')) {
    return content;
  }
  if (!content.includes('apiUrl(') && !content.includes('API_BASE') && !content.includes('assetUrl(')) {
    return content;
  }

  const importLine = "import { apiUrl } from '@/lib/apiClient';\n";

  // After 'use client' if present (must stay first line)
  if (content.startsWith("'use client'") || content.startsWith('"use client"')) {
    const nl = content.indexOf('\n');
    return content.slice(0, nl + 1) + importLine + content.slice(nl + 1);
  }
  return importLine + content;
}

function transform(content) {
  let c = content;
  let changed = false;

  // fetch(`/api/...`) or fetch('/api/...') or fetch("/api/...")
  const before1 = c;
  c = c.replace(
    /fetch\(\s*(['"`])(\/api\/[^'"`]*?)\1/g,
    (m, q, p) => {
      changed = true;
      if (q === '`') return `fetch(apiUrl(\`${p}\`)`;
      return `fetch(apiUrl('${p}')`;
    }
  );

  // fetch(`${backendUrl}/api/...`)
  c = c.replace(
    /fetch\(\s*`\$\{backendUrl\}(\/api\/[^`]*)`/g,
    (m, p) => {
      changed = true;
      return `fetch(apiUrl(\`${p}\`)`;
    }
  );

  // fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || ''}/api/...`)
  c = c.replace(
    /fetch\(\s*`\$\{process\.env\.NEXT_PUBLIC_BACKEND_URL\s*\|\|\s*['"]['"]\}(\/api\/[^`]*)`/g,
    (m, p) => {
      changed = true;
      return `fetch(apiUrl(\`${p}\`)`;
    }
  );

  // `${backendUrl}/api/...` used as URL strings (not only fetch)
  c = c.replace(
    /`\$\{backendUrl\}(\/api\/[^`]*)`/g,
    (m, p) => {
      changed = true;
      return `apiUrl(\`${p}\`)`;
    }
  );

  // `${backendUrl}/theme-assets` etc.
  c = c.replace(
    /`\$\{backendUrl\}(\/(?:theme-assets|theme-engine-assets|plugins|uploads|upload)[^`]*)`/g,
    (m, p) => {
      changed = true;
      return `apiUrl(\`${p}\`)`;
    }
  );

  // Remove unused backendUrl declarations that only read env
  const beforeDecl = c;
  c = c.replace(
    /^\s*const backendUrl\s*=\s*process\.env\.NEXT_PUBLIC_BACKEND_URL\s*\|\|\s*['"]['"];?\s*\n/gm,
    () => {
      changed = true;
      return '';
    }
  );

  // Special case: backendUrl === '' ternary for api-sync
  c = c.replace(
    /backendUrl\s*===\s*['"]['"]\s*\?\s*['"]\/api\/verify-connection['"]\s*:\s*['"]\/api\/api-sync['"]/g,
    () => {
      changed = true;
      return `'/api/auth/verify-connection'`;
    }
  );

  // fetch(backendUrl + '/api/...')
  c = c.replace(
    /fetch\(\s*backendUrl\s*\+\s*(['"`])(\/api\/[^'"`]*)\1/g,
    (m, q, p) => {
      changed = true;
      return `fetch(apiUrl('${p}')`;
    }
  );

  if (changed || c.includes('apiUrl(')) {
    c = ensureImport(c, '');
  }

  return { content: c, changed: c !== content };
}

const files = walk(ROOT);
let updated = 0;
for (const file of files) {
  // Skip API routes — they will be deleted
  if (file.replace(/\\/g, '/').includes('/app/api/')) continue;

  const original = fs.readFileSync(file, 'utf8');
  // Skip if no API-related patterns
  if (
    !original.includes('/api/') &&
    !original.includes('NEXT_PUBLIC_BACKEND_URL') &&
    !original.includes('backendUrl')
  ) {
    continue;
  }

  const { content, changed } = transform(original);
  if (changed && content !== original) {
    fs.writeFileSync(file, content);
    updated += 1;
    console.log('updated', path.relative(process.cwd(), file));
  }
}

console.log(`Done. Updated ${updated} files.`);
