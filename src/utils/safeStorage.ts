const memoryStore = new Map<string, string>();

export const getSafeLocalStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storage = window.localStorage;
    if (
      storage &&
      typeof storage.getItem === 'function' &&
      typeof storage.setItem === 'function' &&
      typeof storage.removeItem === 'function'
    ) {
      return storage;
    }
  } catch {
    return null;
  }

  return null;
};

export const safeStorageGet = (key: string) => {
  const storage = getSafeLocalStorage();
  if (storage) return storage.getItem(key);
  return memoryStore.get(key) ?? null;
};

export const safeStorageSet = (key: string, value: string) => {
  const storage = getSafeLocalStorage();
  if (storage) {
    storage.setItem(key, value);
    return;
  }

  memoryStore.set(key, value);
};

export const safeStorageRemove = (key: string) => {
  const storage = getSafeLocalStorage();
  if (storage) {
    storage.removeItem(key);
    return;
  }

  memoryStore.delete(key);
};

export const safeStorageClear = () => {
  const storage = getSafeLocalStorage();
  if (storage) {
    storage.clear();
    return;
  }

  memoryStore.clear();
};
