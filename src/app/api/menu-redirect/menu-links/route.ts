import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';
import { getPageDbConnection, getPageModel } from '@/utils/db';
import { apiError, apiOk, handleApiError } from '@/lib/api/response';
import { guardMenuRedirect } from '@/lib/menu-redirect/guard';
import type { HeaderMenuLink } from '@/types/menu-redirect';

/* eslint-disable @typescript-eslint/no-explicit-any */
function findNavbarBlock(blocks: any[]): any | null {
  if (!Array.isArray(blocks)) return null;
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    if (block.type === 'nav-bar') return block;
    if (Array.isArray(block.children)) {
      for (const column of block.children) {
        const found = findNavbarBlock(Array.isArray(column) ? column : []);
        if (found) return found;
      }
    }
  }
  return null;
}

function parseNavbarContent(navbar: any): Record<string, unknown> {
  if (!navbar?.content) return {};
  if (typeof navbar.content === 'object') return navbar.content;
  if (typeof navbar.content !== 'string' || !navbar.content.startsWith('{')) return {};
  try {
    return JSON.parse(navbar.content);
  } catch {
    return {};
  }
}

function normalizeHref(value: unknown): string {
  const href = typeof value === 'string' ? value.trim() : '';
  return href || '#';
}

function normalizeLinks(input: unknown, depth = 0): HeaderMenuLink[] {
  if (!Array.isArray(input) || depth > 1) return [];

  return input
    .filter((link) => link && typeof link === 'object')
    .map((link, index) => {
      const raw = link as Record<string, unknown>;
      const href = normalizeHref(raw.href ?? raw.onClickValue);
      const label =
        typeof raw.label === 'string' && raw.label.trim()
          ? raw.label.trim()
          : `Link ${index + 1}`;

      return {
        label,
        href,
        onClick:
          typeof raw.onClick === 'string' && raw.onClick.trim() ? raw.onClick.trim() : 'redirect',
        onClickValue: normalizeHref(raw.onClickValue ?? href),
        children: normalizeLinks(raw.children, depth + 1),
      };
    });
}

async function getHeader(headerId?: string) {
  const pageDb = await getPageDbConnection();
  const Page = getPageModel(pageDb);

  let header = headerId
    ? await Page.findOne({ _id: headerId })
    : await Page.findOne({ pageType: 'header', isGlobal: true });
  if (!header && !headerId) header = await Page.findOne({ pageType: 'header' });

  return header;
}

export async function GET(req: NextRequest) {
  try {
    await guardMenuRedirect('read');
    const { searchParams } = new URL(req.url);
    const header = await getHeader(searchParams.get('headerId') || undefined);

    if (!header) return apiOk({ headerId: null, headerName: null, links: [] });

    const navbar = findNavbarBlock(Array.isArray(header.component) ? header.component : []);
    if (!navbar) return apiOk({ headerId: String(header._id), headerName: header.pageName, links: [] });

    const content = parseNavbarContent(navbar);
    return apiOk({
      headerId: String(header._id),
      headerName: header.pageName || 'Header',
      links: normalizeLinks(content.links),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await guardMenuRedirect('update');
    const body = await req.json();
    const header = await getHeader(typeof body?.headerId === 'string' ? body.headerId : undefined);

    if (!header) return apiError('Header not found', 404);

    const navbar = findNavbarBlock(Array.isArray(header.component) ? header.component : []);
    if (!navbar) return apiError('Header has no nav-bar block', 404);

    const content = parseNavbarContent(navbar);
    const links = normalizeLinks(body?.links);
    navbar.content = JSON.stringify({ ...content, links });
    header.markModified('component');

    if (userId) {
      header.modifications.push({
        modifiedBy: new Types.ObjectId(userId),
        modifiedAt: new Date(),
      });
    }

    await header.save();

    try {
      revalidatePath('/');
    } catch (err) {
      console.warn('Failed to revalidate menu links:', err);
    }

    return apiOk({
      headerId: String(header._id),
      headerName: header.pageName || 'Header',
      links,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
