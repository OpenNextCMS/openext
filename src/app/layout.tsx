import type React from 'react';
import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { PluginProvider } from '@/context/PluginContext';
import DynamicTitle from '@/components/DynamicTitle';
import ReduxProvider from '@/components/ReduxProvider';
import GoogleFontsLoader from '@/components/GoogleFontsLoader';
import { getSiteUrl } from '@/lib/seo/url';
import { resolveRequestLocale } from '@/lib/i18n/siteLocale';
import { isRtlLocale } from '@/lib/i18n/siteLanguages';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveRequestLocale();
  const dir = isRtlLocale(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body>
        <ReduxProvider>
          <GoogleFontsLoader />
          <DynamicTitle />
          <ThemeProvider>
            <PluginProvider>
              <Toaster />
              {children}
            </PluginProvider>
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
