"use client";

// Jednoduchá pamäťová cache pre klientske fetche (stale-while-revalidate).
// Vďaka nej sa pri návrate na kartu zobrazia dáta OKAMŽITE (bez skeletonu)
// a na pozadí sa načítajú čerstvé.
const store = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T): void {
  store.set(key, value);
}
