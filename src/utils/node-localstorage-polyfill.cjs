const memoryStore = new Map();

const polyfilledLocalStorage = {
  getItem: (key) => {
    return memoryStore.has(String(key)) ? memoryStore.get(String(key)) : null;
  },
  setItem: (key, value) => {
    memoryStore.set(String(key), String(value));
  },
  removeItem: (key) => {
    memoryStore.delete(String(key));
  },
  clear: () => {
    memoryStore.clear();
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: polyfilledLocalStorage,
  configurable: true,
  writable: true,
  enumerable: true,
});
