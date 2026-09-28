const values = new Map<string, unknown>()

export const Store = {
  get<T>(key: string): T | undefined { return values.get(key) as T | undefined },
  set<T>(key: string, value: T): void { values.set(key, value) },
  delete(key: string): void { values.delete(key) },
}
