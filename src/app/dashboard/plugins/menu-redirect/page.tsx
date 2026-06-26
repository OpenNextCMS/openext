'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/redux/store';
import PluginGate from '@/components/menu-redirect/PluginGate';
import MenuRedirectApp from '@/components/menu-redirect/MenuRedirectApp';

/**
 * Menu Redirect plugin entry. PluginGate enforces installed+enabled; only then
 * does the three-panel app mount (and its store actions fire).
 */
export default function MenuRedirectPage() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PluginGate>
          <MenuRedirectApp />
        </PluginGate>
      </PersistGate>
    </Provider>
  );
}
