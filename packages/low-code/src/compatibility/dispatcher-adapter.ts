import type { LowCodeDispatcherAdapter } from './types'

export function createMemoryDispatcher(): LowCodeDispatcherAdapter {
  const listeners = new Map<string, Array<(...args: any[]) => void>>()
  return {
    listen(event, listener) {
      listeners.set(event, [...(listeners.get(event) || []), listener])
    },
    trigger(event, ...args) {
      ;(listeners.get(event) || []).forEach((listener) => listener(...args))
    },
    unlisten(event, listener) {
      listeners.set(event, (listeners.get(event) || []).filter((item) => item !== listener))
    },
  }
}
