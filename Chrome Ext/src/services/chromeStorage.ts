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
