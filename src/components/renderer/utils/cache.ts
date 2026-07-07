const cache = new Map<string, string>();

export function getCached(key: string) {
  return cache.get(key);
}

export function setCached(key: string, value: string) {
  cache.set(key, value);
}
