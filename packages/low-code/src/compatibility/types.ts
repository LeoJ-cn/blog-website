import type { Data } from '../types/data'
import type { Method } from '../types/method'

export interface LowCodeStoreAdapter {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  delete(key: string): void
}

export interface LowCodeDispatcherAdapter {
  listen(event: string, listener: (...args: any[]) => void): void
  trigger(event: string, ...args: any[]): void
  unlisten(event: string, listener: (...args: any[]) => void): void
}

export interface LowCodeControllerAdapter {
  getCategories(): Promise<unknown[]>
  getLogicNodes(): Promise<unknown[]>
  getApis(): Promise<unknown[]>
}

export interface LowCodeFeedbackAdapter {
  success(message: string): void
  error(message: string): void
  warning(message: string): void
  confirm(message: string): Promise<boolean>
}

export interface LowCodeCompatibilityContext {
  store: LowCodeStoreAdapter
  dispatcher: LowCodeDispatcherAdapter
  methods: Method[]
  data: Data[]
  controller: LowCodeControllerAdapter
  getLocale(): string
  translate(key: string): string
  feedback: LowCodeFeedbackAdapter
}
