import { createMemoryDispatcher } from './dispatcher-adapter'
import { createMemoryStore } from './store-adapter'
import type { LowCodeCompatibilityContext } from './types'

export function createDefaultLowCodeContext(): LowCodeCompatibilityContext {
  return {
    store: createMemoryStore(),
    dispatcher: createMemoryDispatcher(),
    methods: [],
    data: [],
    controller: {
      getCategories: async () => [],
      getLogicNodes: async () => [],
      getApis: async () => [],
    },
    getLocale: () => 'zh-CN',
    translate: (key) => key,
    feedback: {
      success: () => undefined,
      error: () => undefined,
      warning: () => undefined,
      confirm: async () => true,
    },
  }
}
