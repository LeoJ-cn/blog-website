import { calculateFrameSample, calculateTargetMetrics } from './frame-statistics'
import { createBrowserFrameMonitorRuntime } from './frame-monitor.runtime'
import type {
  FramePerformanceListener,
  FramePerformanceMonitor,
  FramePerformanceMonitorOptions,
  FramePerformanceSnapshot,
  FrameMonitorRuntime,
  FrameMonitorStatus,
  LongAnimationFrameEntry,
  LongAnimationFrameObserver,
  LongAnimationFrameMetrics,
} from './frame-monitor.types'

const DEFAULT_SAMPLE_INTERVAL = 1000

function createEmptySnapshot(
  status: FrameMonitorStatus = 'idle',
  timestamp = 0,
): FramePerformanceSnapshot {
  return {
    timestamp,
    status,
    sample: {
      duration: 0,
      frameCount: 0,
      fps: 0,
      p95FrameInterval: 0,
      maxFrameInterval: 0,
    },
    target: null,
    longAnimationFrames: null,
  }
}

export function createFramePerformanceMonitor(
  options: FramePerformanceMonitorOptions = {},
): FramePerformanceMonitor {
  const runtime: FrameMonitorRuntime | null =
    options.runtime === undefined ? createBrowserFrameMonitorRuntime() : options.runtime
  const sampleInterval =
    options.sampleInterval !== undefined &&
    Number.isFinite(options.sampleInterval) &&
    options.sampleInterval > 0
      ? options.sampleInterval
      : DEFAULT_SAMPLE_INTERVAL
  const listeners = new Set<FramePerformanceListener>()
  let snapshot = createEmptySnapshot('idle', runtime?.now() ?? 0)
  let frameId: number | null = null
  let generation = 0
  let unsubscribeVisibility: (() => void) | null = null
  let windowStartedAt = runtime?.now() ?? 0
  let lastFrameTime: number | null = null
  let frameCount = 0
  let frameIntervals: number[] = []
  let longAnimationFrameObserver: LongAnimationFrameObserver | null = null
  let supportsLongAnimationFrames = false
  let longAnimationFrameEntries: LongAnimationFrameEntry[] = []

  const copySnapshot = (): FramePerformanceSnapshot => ({
    ...snapshot,
    sample: { ...snapshot.sample },
    target: snapshot.target ? { ...snapshot.target } : null,
    longAnimationFrames: snapshot.longAnimationFrames
      ? { ...snapshot.longAnimationFrames }
      : null,
  })

  const notifyListener = (listener: FramePerformanceListener) => {
    try {
      listener(copySnapshot())
    } catch (error) {
      options.onListenerError?.(error)
    }
  }

  const emit = () => {
    for (const listener of listeners) {
      notifyListener(listener)
    }
  }

  const resetWindow = (timestamp: number) => {
    windowStartedAt = timestamp
    lastFrameTime = null
    frameCount = 0
    frameIntervals = []
    longAnimationFrameEntries = []
  }

  const summarizeLongAnimationFrames = (): LongAnimationFrameMetrics | null => {
    if (!supportsLongAnimationFrames) {
      return null
    }
    return {
      count: longAnimationFrameEntries.length,
      totalBlockingDuration: longAnimationFrameEntries.reduce(
        (total, entry) => total + entry.blockingDuration,
        0,
      ),
      maxDuration:
        longAnimationFrameEntries.length > 0
          ? Math.max(...longAnimationFrameEntries.map((entry) => entry.duration))
          : 0,
    }
  }

  const stopLongAnimationFrameObserver = () => {
    longAnimationFrameObserver?.disconnect()
    longAnimationFrameObserver = null
  }

  const startLongAnimationFrameObserver = () => {
    if (!runtime || longAnimationFrameObserver) {
      return
    }
    longAnimationFrameObserver = runtime.createLongAnimationFrameObserver((entry) => {
      if (
        snapshot.status === 'running' &&
        Number.isFinite(entry.duration) &&
        entry.duration >= 0 &&
        Number.isFinite(entry.blockingDuration) &&
        entry.blockingDuration >= 0
      ) {
        longAnimationFrameEntries.push(entry)
      }
    })
    supportsLongAnimationFrames = longAnimationFrameObserver !== null
  }

  const cancelScheduledFrame = () => {
    generation += 1
    if (runtime && frameId !== null) {
      runtime.cancelFrame(frameId)
    }
    frameId = null
  }

  const scheduleFrame = () => {
    if (!runtime || snapshot.status !== 'running' || frameId !== null) {
      return
    }
    const scheduledGeneration = generation
    frameId = runtime.requestFrame((timestamp) => {
      if (scheduledGeneration !== generation || snapshot.status !== 'running') {
        return
      }
      frameId = null

      if (timestamp >= windowStartedAt && (lastFrameTime === null || timestamp > lastFrameTime)) {
        if (lastFrameTime !== null) {
          frameIntervals.push(timestamp - lastFrameTime)
        }
        lastFrameTime = timestamp
        frameCount += 1

        const elapsed = timestamp - windowStartedAt
        if (elapsed + 0.001 >= sampleInterval) {
          const sample = calculateFrameSample(frameIntervals, elapsed, frameCount)
          snapshot = {
            timestamp,
            status: 'running',
            sample,
            target: calculateTargetMetrics(frameIntervals, sample.fps, options.targetFps),
            longAnimationFrames: summarizeLongAnimationFrames(),
          }
          resetWindow(timestamp)
          emit()
        }
      }

      scheduleFrame()
    })
  }

  const handleVisibilityChange = () => {
    if (!runtime || snapshot.status === 'idle') {
      return
    }

    if (runtime.getVisibilityState() === 'hidden') {
      cancelScheduledFrame()
      stopLongAnimationFrameObserver()
      resetWindow(runtime.now())
      snapshot = { ...snapshot, timestamp: runtime.now(), status: 'suspended' }
      emit()
      return
    }

    resetWindow(runtime.now())
    snapshot = { ...snapshot, timestamp: runtime.now(), status: 'running' }
    startLongAnimationFrameObserver()
    emit()
    scheduleFrame()
  }

  const start = () => {
    if (!runtime || snapshot.status !== 'idle') {
      return
    }
    unsubscribeVisibility = runtime.subscribeVisibilityChange(handleVisibilityChange)
    resetWindow(runtime.now())
    snapshot = {
      ...snapshot,
      timestamp: runtime.now(),
      status: runtime.getVisibilityState() === 'hidden' ? 'suspended' : 'running',
    }
    if (snapshot.status === 'running') {
      startLongAnimationFrameObserver()
    }
    scheduleFrame()
  }

  const stop = () => {
    if (snapshot.status === 'idle') {
      return
    }
    cancelScheduledFrame()
    stopLongAnimationFrameObserver()
    unsubscribeVisibility?.()
    unsubscribeVisibility = null
    resetWindow(runtime?.now() ?? 0)
    snapshot = { ...snapshot, timestamp: runtime?.now() ?? 0, status: 'idle' }
    emit()
  }

  const reset = () => {
    const status = snapshot.status
    const timestamp = runtime?.now() ?? 0
    resetWindow(timestamp)
    snapshot = createEmptySnapshot(status, timestamp)
    emit()
  }

  return {
    start,
    stop,
    reset,
    getSnapshot: copySnapshot,
    subscribe(listener) {
      listeners.add(listener)
      start()
      notifyListener(listener)

      let subscribed = true
      return () => {
        if (!subscribed) {
          return
        }
        subscribed = false
        listeners.delete(listener)
        if (listeners.size === 0) {
          stop()
        }
      }
    },
  }
}
