import { NextResponse } from 'next/server';
import { getSiteLanguageConfig } from '@/lib/i18n/siteLocale';
import { getLanguageLabel, isRtlLocale } from '@/lib/i18n/siteLanguages';

/** Public language catalog for the visitor language switcher. */
export async function GET() {
  try {
    const config = await getSiteLanguageConfig();
    return NextResponse.json({
      success: true,
      data: {
        ...config,
        languages: config.enabledLanguages.map((code) => ({
          code,
          label: getLanguageLabel(code),
          rtl: isRtlLocale(code),
        })),
      },
    });
  } catch (error) {
    console.error('[api/public/site-languages]', error);
    return NextResponse.json({ success: false, message: 'Failed to load languages' }, { status: 500 });
  }
}
