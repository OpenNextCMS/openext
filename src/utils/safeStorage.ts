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

/** Clear MySQL install draft keys when the user picks another engine. */
export const clearMysqlSetupStorage = () => {
  for (const key of ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE']) {
    safeStorageRemove(key);
  }
};

/** Clear PostgreSQL install draft keys when the user picks another engine. */
export const clearPostgresSetupStorage = () => {
  for (const key of [
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DATABASE',
  ]) {
    safeStorageRemove(key);
  }
};

/** Clear MongoDB install draft keys when the user picks MySQL/Postgres instead. */
export const clearMongodbSetupStorage = () => {
  for (const key of [
    'MONGODB',
    'MONGODB_URI',
    'MONGODB_USERNAME',
    'MONGODB_PASSWORD',
    'MONGODB_HOST',
    'MONGODB_CLUSTER',
    'MONGODB_AUTH_MECH',
    'MONGODB_AUTH_SOURCE',
  ]) {
    safeStorageRemove(key);
  }
};
