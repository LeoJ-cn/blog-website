import type {
  FramePerformanceListener,
  FramePerformanceMonitor,
  FramePerformanceMonitorOptions,
  FramePerformanceSnapshot,
} from './frame-monitor.types'

const DEFAULT_TARGET_FPS = 60
const DEFAULT_SAMPLE_INTERVAL = 500

function createEmptySnapshot(): FramePerformanceSnapshot {
  return {
    fps: 0,
    maxFrameInterval: 0,
    droppedFrames: 0,
  }
}

export function createFramePerformanceMonitor(
  options: FramePerformanceMonitorOptions = {},
): FramePerformanceMonitor {
  const targetFps =
    options.targetFps !== undefined && options.targetFps > 0
      ? options.targetFps
      : DEFAULT_TARGET_FPS
  const sampleInterval =
    options.sampleInterval !== undefined && options.sampleInterval > 0
      ? options.sampleInterval
      : DEFAULT_SAMPLE_INTERVAL
  const frameBudget = 1000 / targetFps
  const listeners = new Set<FramePerformanceListener>()

  let animationId: number | null = null
  let running = false
  let lastFrameTime: number | null = null
  let sampleStartedAt = 0
  let sampledFrames = 0
  let snapshot = createEmptySnapshot()

  const supportsFrameMonitoring = () =>
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function' &&
    typeof window.cancelAnimationFrame === 'function' &&
    typeof window.performance?.now === 'function'

  const copySnapshot = (): FramePerformanceSnapshot => ({ ...snapshot })

  const emit = () => {
    for (const listener of listeners) {
      listener(copySnapshot())
    }
  }

  const tick = (timestamp: number) => {
    if (!running) {
      return
    }

    if (lastFrameTime !== null) {
      const frameInterval = timestamp - lastFrameTime
      snapshot = {
        ...snapshot,
        maxFrameInterval: Math.round(Math.max(snapshot.maxFrameInterval, frameInterval) * 10) / 10,
        droppedFrames:
          snapshot.droppedFrames + Math.max(0, Math.round(frameInterval / frameBudget) - 1),
      }
    }

    lastFrameTime = timestamp
    sampledFrames += 1

    const elapsed = timestamp - sampleStartedAt

    if (elapsed >= sampleInterval) {
      snapshot = {
        ...snapshot,
        fps: elapsed > 0 ? Math.round((sampledFrames * 1000) / elapsed) : 0,
      }
      sampleStartedAt = timestamp
      sampledFrames = 0
      emit()
    }

    if (running) {
      animationId = window.requestAnimationFrame(tick)
    }
  }

  const start = () => {
    if (running || !supportsFrameMonitoring()) {
      return
    }

    running = true
    lastFrameTime = null
    sampledFrames = 0
    sampleStartedAt = window.performance.now()
    animationId = window.requestAnimationFrame(tick)
  }

  const stop = () => {
    running = false

    if (animationId !== null && supportsFrameMonitoring()) {
      window.cancelAnimationFrame(animationId)
    }

    animationId = null
    lastFrameTime = null
    sampledFrames = 0

    if (snapshot.fps !== 0) {
      snapshot = { ...snapshot, fps: 0 }
      emit()
    }
  }

  const reset = () => {
    snapshot = createEmptySnapshot()
    lastFrameTime = null
    sampledFrames = 0
    sampleStartedAt = supportsFrameMonitoring() ? window.performance.now() : 0
    emit()
  }

  return {
    start,
    stop,
    reset,
    getSnapshot: copySnapshot,
    subscribe(listener) {
      listeners.add(listener)
      listener(copySnapshot())
      start()

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
