import type React from 'react';
import '@/styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext';
import DynamicTitle from '@/components/DynamicTitle';
import ReduxProvider from '@/components/ReduxProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ReduxProvider>
          <DynamicTitle />
          <ThemeProvider>
            <Toaster />
            {children}
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
