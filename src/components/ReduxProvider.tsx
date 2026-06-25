'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/redux/store';

export default function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={<div className="min-h-screen bg-background" />} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}
