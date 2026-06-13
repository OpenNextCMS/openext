import type React from 'react';
import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { PluginProvider } from '@/context/PluginContext';
import DynamicTitle from '@/components/DynamicTitle';
import ReduxProvider from '@/components/ReduxProvider';
import { getSiteUrl } from '@/lib/seo/url';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ReduxProvider>
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
