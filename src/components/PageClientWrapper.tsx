'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from 'next-themes';
import { store, persistor } from '@/redux/store';

interface Props {
  children: React.ReactNode;
}

export default function PageClientWrapper({ children }: Props) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
