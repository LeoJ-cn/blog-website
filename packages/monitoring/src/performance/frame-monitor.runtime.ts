import type { FrameMonitorRuntime } from './frame-monitor.types'

export function createBrowserFrameMonitorRuntime(): FrameMonitorRuntime | null {
  // SSR 或缺少基础计时能力时整体降级为不可用，调用方仍可安全返回 idle 快照。
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
    createLongAnimationFrameObserver(listener) {
      // LoAF 是增强指标；浏览器不支持时只关闭该指标，不影响基础 RAF/FPS 采样。
      if (
        typeof PerformanceObserver === 'undefined' ||
        !PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')
      ) {
        return null
      }

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const longFrame = entry as PerformanceEntry & { blockingDuration?: number }
          listener({
            duration: longFrame.duration,
            blockingDuration: longFrame.blockingDuration ?? 0,
          })
        }
      })
      observer.observe({ type: 'long-animation-frame' })
      return { disconnect: () => observer.disconnect() }
    },
  }
}
