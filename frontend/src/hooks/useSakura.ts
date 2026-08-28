import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sakura-enabled-v2';

let enabled = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) !== 'false' : true;
const listeners = new Set<(value: boolean) => void>();

export function isSakuraEnabled(): boolean {
  return enabled;
}

export function setSakuraEnabled(value: boolean): void {
  enabled = value;
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((listener) => listener(value));
}

export function useSakura(): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(enabled);
  useEffect(() => {
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  const toggle = useCallback((next: boolean) => setSakuraEnabled(next), []);
  return [value, toggle];
}
