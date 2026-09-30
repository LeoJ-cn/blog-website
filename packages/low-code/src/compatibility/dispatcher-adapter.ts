import type { LowCodeDispatcherAdapter } from './types'

export function createMemoryDispatcher(): LowCodeDispatcherAdapter {
  const listeners = new Map<string, Array<(...args: any[]) => unknown>>()
  return {
    listen(event, listener) {
      listeners.set(event, [...(listeners.get(event) || []), listener])
    },
    trigger(event, ...args) {
      return Promise.all((listeners.get(event) || []).map((listener) => listener(...args)))
    },
    unlisten(event, listener) {
      listeners.set(event, (listeners.get(event) || []).filter((item) => item !== listener))
    },
  }
}
