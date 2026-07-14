import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/response';
import { ThemeAssetService } from '../services/ThemeAssetService';

/**
 * ThemeAssetController — GET /theme-assets/:theme/* and /api/themes/:id/assets/*
 */
export const ThemeAssetController = {
  async serveBySlug(slug: string, fileParts: string[]) {
    try {
      const relativePath = fileParts.join('/');
      const asset = await ThemeAssetService.readAsset(slug, relativePath);
      return new NextResponse(new Uint8Array(asset.buffer), {
        status: 200,
        headers: {
          'Content-Type': asset.contentType,
          'Cache-Control': asset.cacheControl,
        },
      });
    } catch (err) {
      return handleApiError(err);
    }
  },
};
