import type { LowCodeStoreAdapter } from './types'

export function createMemoryStore(): LowCodeStoreAdapter {
  const values = new Map<string, unknown>()
  return {
    get: <T>(key: string) => values.get(key) as T | undefined,
    set: <T>(key: string, value: T) => { values.set(key, value) },
    delete: (key: string) => { values.delete(key) },
  }
}
