import { inject, provide, type InjectionKey } from 'vue'
import { setDataCreator, setDataProvider } from '../logic-editor/compat/data'
import { setLanguageProvider } from '../logic-editor/compat/locales'
import { setMethodCreator, setMethodsProvider } from '../logic-editor/compat/method'
import { setMethodListProvider } from '../logic-editor/compat/process'
import type { Method } from '../types/method'
import type { LowCodeCompatibilityContext } from './types'

const lowCodeContextKey: InjectionKey<LowCodeCompatibilityContext> = Symbol('LowCodeCompatibilityContext')

function bindLegacyAdapters(context: LowCodeCompatibilityContext): void {
  setMethodListProvider(() => context.methods)
  setMethodsProvider(() => context.methods)
  setMethodCreator((method) => {
    const id = method.id || crypto.randomUUID().replace(/-/g, '')
    const baseName = method.funcName?.trim() || 'default_method'
    let funcName = baseName
    let suffix = 1
    while (context.methods.some((item) => item.id === id || item.funcName === funcName)) {
      if (context.methods.some((item) => item.id === id)) {
        throw new Error(`方法 ID 已存在：${id}`)
      }
      funcName = `${baseName}_${suffix++}`
    }
    const created: Method = {
      ...method,
      id,
      funcName,
      funcLabel: method.funcLabel?.trim() || funcName,
      parameters: method.parameters || [],
      blockData: method.blockData || '',
      graphData: method.graphData || '',
      funcReturn: method.funcReturn || { state: false },
      temp_data: method.temp_data || [],
    }
    context.methods.push(created)
    return created
  })
  setDataProvider((id) => context.data.find((item) => (item.id || item.name) === id))
  setDataCreator(async (data) => {
    const id = data.id || crypto.randomUUID().replace(/-/g, '')
    context.data.push({ ...data, id })
    return id
  })
  setLanguageProvider(() => context.getLocale())
}

export function createLowCodeContext(options: LowCodeCompatibilityContext): LowCodeCompatibilityContext {
  bindLegacyAdapters(options)
  return options
}

export function provideLowCodeContext(context: LowCodeCompatibilityContext): void {
  bindLegacyAdapters(context)
  provide(lowCodeContextKey, context)
}

export function useLowCodeContext(): LowCodeCompatibilityContext {
  const context = inject(lowCodeContextKey)
  if (!context) {
    throw new Error('未注入 LowCodeCompatibilityContext，请先调用 provideLowCodeContext。')
  }
  return context
}
