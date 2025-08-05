// redux/customStorage.ts
import { Storage } from 'redux-persist';

const isBrowser = typeof window !== 'undefined';

const getPageName = () => {
  if (!isBrowser) return 'default';
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('pagename') || 'default';
};

const customStorage: Storage = {
  getItem: (key) => {
    if (!isBrowser) return Promise.resolve(null);
    const pageKey = `${key}-${getPageName()}`;
    return Promise.resolve(localStorage.getItem(pageKey));
  },
  setItem: (key, value) => {
    if (!isBrowser) return Promise.resolve();
    const pageKey = `${key}-${getPageName()}`;
    return Promise.resolve(localStorage.setItem(pageKey, value));
  },
  removeItem: (key) => {
    if (!isBrowser) return Promise.resolve();
    const pageKey = `${key}-${getPageName()}`;
    return Promise.resolve(localStorage.removeItem(pageKey));
  },
};

export default customStorage;
