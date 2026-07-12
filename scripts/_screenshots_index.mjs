// Generate docs/screenshots/README.md by scanning the captured PNG files.
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('docs/screenshots');
const files = fs.readdirSync(OUT).filter((f) => /^\d+-.*-dark\.png$/.test(f)).sort();

const GROUPS = {
  public: 'Public & Auth',
  editor: 'Block / Page Editor',
  dashboard: 'Dashboard (core)',
  blogs: 'Blog management',
  pages: 'Page management',
  themes: 'Themes',
  plugins: 'Plugins — Form Builder & Menu Redirect',
};

const parse = (f) => {
  const m = f.match(/^(\d+)-([a-z]+)-(.+)-dark\.png$/);
  if (!m) return null;
  return { num: +m[1], group: m[2], name: m[3], file: f };
};
const title = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const items = files.map(parse).filter(Boolean);

let md = `# OpenNext CMS — Dark-Mode Screenshots\n\n`;
md += `Full-page screenshots of every page and feature, captured in **dark mode** at 1440 px wide (full scroll height). ${items.length} screenshots.\n\n`;
md += `Regenerate:\n\n\`\`\`bash\nnpm run dev            # http://localhost:3011\nnpm run screenshots    # resumable — re-run until all pages are captured (see DB note)\nnode scripts/_shots_public.mjs        # logged-out auth/setup pages\nnode scripts/_screenshots_index.mjs   # rebuild this index\n\`\`\`\n\n`;
md += `> **DB note:** the free-tier MongoDB Atlas cluster can throttle TLS connections under a sustained crawl. \`screenshots.mjs\` is resumable and aborts cleanly when the DB tips — restart the dev server and re-run \`npm run screenshots\` until all 46 pages are present.\n\n`;
md += `> Dynamic pages (blog / form / theme detail, editor) render against seeded demo content: a published blog post, a "Contact us" form with submissions, and the default theme set.\n\n`;

md += `## Contents\n\n`;
for (const [key, label] of Object.entries(GROUPS)) {
  if (items.some((it) => it.group === key)) {
    const anchor = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    md += `- [${label}](#${anchor}) (${items.filter((it) => it.group === key).length})\n`;
  }
}
md += `\n`;

for (const [key, label] of Object.entries(GROUPS)) {
  const rows = items.filter((it) => it.group === key);
  if (!rows.length) continue;
  md += `## ${label}\n\n`;
  for (const it of rows) {
    md += `### ${it.num}. ${title(it.name)}\n\n`;
    md += `![${title(it.name)}](./${it.file})\n\n`;
  }
}

fs.writeFileSync(path.join(OUT, 'README.md'), md);
console.log(`Wrote docs/screenshots/README.md (${items.length} screenshots)`);
