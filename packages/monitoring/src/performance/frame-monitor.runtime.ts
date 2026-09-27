import type { FrameMonitorRuntime } from './frame-monitor.types'

export function createBrowserFrameMonitorRuntime(): FrameMonitorRuntime | null {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof window.requestAnimationFrame !== 'function' ||
    typeof window.cancelAnimationFrame !== 'function' ||
    typeof window.performance?.now !== 'function'
  ) {
    return null
  }

  return {
    now: () => window.performance.now(),
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (id) => window.cancelAnimationFrame(id),
    getVisibilityState: () => (document.visibilityState === 'hidden' ? 'hidden' : 'visible'),
    subscribeVisibilityChange(listener) {
      document.addEventListener('visibilitychange', listener)
      return () => document.removeEventListener('visibilitychange', listener)
    },
  }
}
