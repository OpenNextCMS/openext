// redux/customStorage.ts
import { Storage } from 'redux-persist';
import { safeStorageGet, safeStorageRemove, safeStorageSet } from '@/utils/safeStorage';

const getPageName = () => {
  if (typeof window === 'undefined') return 'default';
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('pagename') || 'default';
};

const customStorage: Storage = {
  getItem: (key) => {
    const pageKey = `${key}-${getPageName()}`;
    return Promise.resolve(safeStorageGet(pageKey));
  },
  setItem: (key, value) => {
    const pageKey = `${key}-${getPageName()}`;
    safeStorageSet(pageKey, value);
    return Promise.resolve();
  },
  removeItem: (key) => {
    const pageKey = `${key}-${getPageName()}`;
    safeStorageRemove(pageKey);
    return Promise.resolve();
  },
};

export default customStorage;
