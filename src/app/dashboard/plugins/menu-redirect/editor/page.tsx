'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/redux/store';
import PluginGate from '@/components/menu-redirect/PluginGate';
import EditorApp from '@/components/menu-redirect/EditorApp';

/**
 * Menu Redirect visual editor. PluginGate enforces installed+enabled; only then
 * does the editor mount and render the active header as drag-drop drop targets.
 */
export default function MenuRedirectEditorPage() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PluginGate>
          <EditorApp />
        </PluginGate>
      </PersistGate>
    </Provider>
  );
}
