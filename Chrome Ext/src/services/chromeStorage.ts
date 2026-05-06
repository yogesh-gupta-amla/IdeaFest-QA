export function storageGet(keys: string[]): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        result[key] = JSON.parse(raw);
      } catch {
        result[key] = raw;
      }
    }
  }
  return Promise.resolve(result);
}

export function storageSet(obj: Record<string, unknown>): Promise<void> {
  for (const [key, value] of Object.entries(obj)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  return Promise.resolve();
}

export function storageRemove(keys: string[]): Promise<void> {
  for (const key of keys) {
    localStorage.removeItem(key);
  }
  return Promise.resolve();
}

export function storageRemoveByPrefix(prefixes: string[]): Promise<void> {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (prefixes.some((p) => k.startsWith(p))) keysToRemove.push(k);
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
  return Promise.resolve();
}
