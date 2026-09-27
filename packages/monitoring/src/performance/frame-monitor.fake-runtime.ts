import type {
  FrameMonitorRuntime,
  FrameMonitorVisibilityState,
  LongAnimationFrameEntry,
} from './frame-monitor.types'

export interface FakeFrameMonitorRuntime extends FrameMonitorRuntime {
  readonly pendingFrameCount: number
  readonly pendingFrameIds: readonly number[]
  readonly longAnimationFrameObserverCount: number
  advanceFrame(interval: number): void
  advanceTime(duration: number): void
  setVisibility(state: FrameMonitorVisibilityState): void
  runCancelledFrame(id: number | undefined, elapsed?: number): void
  emitLongAnimationFrame(entry: LongAnimationFrameEntry): void
}

export interface FakeFrameMonitorRuntimeOptions {
  longAnimationFrameSupported?: boolean
}

export function createFakeFrameMonitorRuntime(
  initialNow = 0,
  options: FakeFrameMonitorRuntimeOptions = {},
): FakeFrameMonitorRuntime {
  let now = initialNow
  let visibilityState: FrameMonitorVisibilityState = 'visible'
  let frameId = 0
  const pendingFrames = new Map<number, (timestamp: number) => void>()
  // 保留被取消的回调，专门模拟真实浏览器中取消与回调执行发生竞争的极端时序。
  const cancelledFrames = new Map<number, (timestamp: number) => void>()
  const visibilityListeners = new Set<() => void>()
  const longAnimationFrameListeners = new Set<(entry: LongAnimationFrameEntry) => void>()

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
    createLongAnimationFrameObserver(listener) {
      if (!options.longAnimationFrameSupported) {
        return null
      }
      longAnimationFrameListeners.add(listener)
      return {
        disconnect: () => longAnimationFrameListeners.delete(listener),
      }
    },
    get pendingFrameCount() {
      return pendingFrames.size
    },
    get pendingFrameIds() {
      return Array.from(pendingFrames.keys())
    },
    get longAnimationFrameObserverCount() {
      return longAnimationFrameListeners.size
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
      // 测试可主动执行旧回调，以验证 generation 令牌确实会拒绝过期采样。
      if (id === undefined) {
        return
      }
      now += elapsed
      const callback = cancelledFrames.get(id)
      cancelledFrames.delete(id)
      callback?.(now)
    },
    emitLongAnimationFrame(entry) {
      for (const listener of longAnimationFrameListeners) {
        listener(entry)
      }
    },
  }
}
