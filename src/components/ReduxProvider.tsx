'use client';

import { usePathname } from 'next/navigation';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/redux/store';

function needsEditorPersist(pathname: string | null): boolean {
  if (!pathname) return false;
  const p = pathname.toLowerCase();
  return p.startsWith('/editor') || p.includes('/dashboard/plugins/menu-redirect');
}

export default function ReduxProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const persist = needsEditorPersist(pathname);

  return (
    <Provider store={store}>
      {persist ? (
        <PersistGate loading={null} persistor={persistor}>
          {children}
        </PersistGate>
      ) : (
        children
      )}
    </Provider>
  );
}
