import { ThemeEngine } from '../services/ThemeEngine';

/**
 * AssetController — serves a theme's static assets (screenshots, CSS, fonts,
 * images) from `/themes/<slug>` via the Theme Engine's traversal-safe loader
 * (spec §7 loadAsset, §9 asset serving). Public + cacheable.
 */
export const AssetController = {
  async serve(slug: string, pathSegments: string[]): Promise<Response> {
    const relativePath = pathSegments.join('/');
    const asset = await ThemeEngine.loadAsset(relativePath, slug);
    // Buffer → Uint8Array so it is a valid BodyInit for the Web Response.
    return new Response(new Uint8Array(asset.buffer), {
      status: 200,
      headers: {
        'content-type': asset.contentType,
        'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  },
};
