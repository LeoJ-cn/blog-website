import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBrowserFrameMonitorRuntime } from './frame-monitor.runtime'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createBrowserFrameMonitorRuntime', () => {
  it('returns null outside a complete browser runtime', () => {
    vi.stubGlobal('window', undefined)
    vi.stubGlobal('document', undefined)

    expect(createBrowserFrameMonitorRuntime()).toBeNull()
  })

  it('observes only new LoAF entries so lifecycle restarts cannot replay history', () => {
    const observe = vi.fn()
    const disconnect = vi.fn()
    class FakePerformanceObserver {
      static supportedEntryTypes = ['long-animation-frame']
      constructor(callback: PerformanceObserverCallback) {
        void callback
      }
      observe = observe
      disconnect = disconnect
    }

    vi.stubGlobal('window', {
      requestAnimationFrame: vi.fn(),
      cancelAnimationFrame: vi.fn(),
      performance: { now: () => 0 },
    })
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    vi.stubGlobal('PerformanceObserver', FakePerformanceObserver)

    const runtime = createBrowserFrameMonitorRuntime()
    const observer = runtime?.createLongAnimationFrameObserver(() => undefined)

    expect(observe).toHaveBeenCalledWith({ type: 'long-animation-frame' })
    observer?.disconnect()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
