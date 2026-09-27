import type {
  FrameMonitorRuntime,
  FrameMonitorVisibilityState,
} from './frame-monitor.types'

export interface FakeFrameMonitorRuntime extends FrameMonitorRuntime {
  readonly pendingFrameCount: number
  readonly pendingFrameIds: readonly number[]
  advanceFrame(interval: number): void
  advanceTime(duration: number): void
  setVisibility(state: FrameMonitorVisibilityState): void
  runCancelledFrame(id: number | undefined, elapsed?: number): void
}

export function createFakeFrameMonitorRuntime(initialNow = 0): FakeFrameMonitorRuntime {
  let now = initialNow
  let visibilityState: FrameMonitorVisibilityState = 'visible'
  let frameId = 0
  const pendingFrames = new Map<number, (timestamp: number) => void>()
  const cancelledFrames = new Map<number, (timestamp: number) => void>()
  const visibilityListeners = new Set<() => void>()

  return {
    now: () => now,
    requestFrame(callback) {
      const id = ++frameId
      pendingFrames.set(id, callback)
      return id
    },
    cancelFrame(id) {
      const callback = pendingFrames.get(id)
      if (callback) {
        cancelledFrames.set(id, callback)
        pendingFrames.delete(id)
      }
    },
    getVisibilityState: () => visibilityState,
    subscribeVisibilityChange(listener) {
      visibilityListeners.add(listener)
      return () => visibilityListeners.delete(listener)
    },
    get pendingFrameCount() {
      return pendingFrames.size
    },
    get pendingFrameIds() {
      return Array.from(pendingFrames.keys())
    },
    advanceFrame(interval) {
      now += interval
      const callbacks = Array.from(pendingFrames.values())
      pendingFrames.clear()
      for (const callback of callbacks) {
        callback(now)
      }
    },
    advanceTime(duration) {
      now += duration
    },
    setVisibility(state) {
      if (visibilityState === state) {
        return
      }
      visibilityState = state
      for (const listener of visibilityListeners) {
        listener()
      }
    },
    runCancelledFrame(id, elapsed = 0) {
      if (id === undefined) {
        return
      }
      now += elapsed
      const callback = cancelledFrames.get(id)
      cancelledFrames.delete(id)
      callback?.(now)
    },
  }
}
