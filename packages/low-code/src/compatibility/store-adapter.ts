import type { LowCodeStoreAdapter } from './types'
import { reactive } from 'vue'

export function createMemoryStore(): LowCodeStoreAdapter {
  // Vue 对 Map 的 get/set 能建立依赖追踪，默认适配器也必须驱动抽屉可见性更新。
  const values = reactive(new Map<string, unknown>())
  return {
    get: <T>(key: string) => values.get(key) as T | undefined,
    set: <T>(key: string, value: T) => { values.set(key, value) },
    delete: (key: string) => { values.delete(key) },
  }
}
