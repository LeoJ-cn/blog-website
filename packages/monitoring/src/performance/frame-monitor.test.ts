import { describe, expect, it, vi } from 'vitest'
import { createFakeFrameMonitorRuntime } from './frame-monitor.fake-runtime'
import { createFramePerformanceMonitor } from './frame-monitor'

function runStableFrames(
  runtime: ReturnType<typeof createFakeFrameMonitorRuntime>,
  fps: number,
  seconds = 1,
) {
  for (let index = 0; index < fps * seconds; index += 1) {
    runtime.advanceFrame(1000 / fps)
  }
}

describe('createFramePerformanceMonitor', () => {
  it.each([60, 90, 120, 144, 165, 240])('reports an uncapped %i FPS sample', (fps) => {
    const runtime = createFakeFrameMonitorRuntime()
    const monitor = createFramePerformanceMonitor({ runtime, sampleInterval: 1000 })
    const unsubscribe = monitor.subscribe(() => undefined)

    runStableFrames(runtime, fps)

    expect(monitor.getSnapshot().sample.fps).toBe(fps)
    expect(monitor.getSnapshot().sample.p95FrameInterval).toBeCloseTo(1000 / fps, 5)
    expect(runtime.pendingFrameCount).toBe(1)
    unsubscribe()
  })

  it('calculates metrics against an explicit target only', () => {
    const runtime = createFakeFrameMonitorRuntime()
    const monitor = createFramePerformanceMonitor({ runtime, sampleInterval: 1000, targetFps: 120 })
    monitor.subscribe(() => undefined)

    runStableFrames(runtime, 60)

    expect(monitor.getSnapshot().target?.fps).toBe(120)
    expect(monitor.getSnapshot().target?.achievementRate).toBeCloseTo(0.5, 1)
    expect(monitor.getSnapshot().target?.missedFrames).toBeGreaterThan(0)

    const noTargetRuntime = createFakeFrameMonitorRuntime()
    const noTargetMonitor = createFramePerformanceMonitor({
      runtime: noTargetRuntime,
      sampleInterval: 1000,
    })
    noTargetMonitor.subscribe(() => undefined)
    runStableFrames(noTargetRuntime, 60)
    expect(noTargetMonitor.getSnapshot().target).toBeNull()
  })

  it('ignores duplicate and backwards timestamps', () => {
    const runtime = createFakeFrameMonitorRuntime()
    const monitor = createFramePerformanceMonitor({ runtime, sampleInterval: 100 })
    monitor.subscribe(() => undefined)

    runtime.advanceFrame(20)
    runtime.advanceFrame(0)
    runtime.advanceFrame(-10)
    runtime.advanceFrame(90)

    const snapshot = monitor.getSnapshot()
    expect(snapshot.sample.fps).toBeGreaterThanOrEqual(0)
    expect(snapshot.sample.p95FrameInterval).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(snapshot.sample.maxFrameInterval)).toBe(true)
  })

  it('keeps start, stop, reset, and unsubscribe idempotent', () => {
    const runtime = createFakeFrameMonitorRuntime()
    const monitor = createFramePerformanceMonitor({ runtime })
    const unsubscribe = monitor.subscribe(() => undefined)

    monitor.start()
    monitor.start()
    expect(runtime.pendingFrameCount).toBe(1)

    monitor.reset()
    expect(monitor.getSnapshot().status).toBe('running')
    expect(monitor.getSnapshot().sample.fps).toBe(0)

    monitor.stop()
    monitor.stop()
    expect(runtime.pendingFrameCount).toBe(0)
    expect(monitor.getSnapshot().status).toBe('idle')

    unsubscribe()
    unsubscribe()
  })

  it('stops only after the final subscriber leaves', () => {
    const runtime = createFakeFrameMonitorRuntime()
    const monitor = createFramePerformanceMonitor({ runtime })
    const first = monitor.subscribe(() => undefined)
    const second = monitor.subscribe(() => undefined)

    first()
    expect(runtime.pendingFrameCount).toBe(1)
    second()
    expect(runtime.pendingFrameCount).toBe(0)
  })

  it('isolates listener failures and keeps scheduling frames', () => {
    const runtime = createFakeFrameMonitorRuntime()
    const onListenerError = vi.fn()
    const healthyListener = vi.fn()
    const monitor = createFramePerformanceMonitor({
      runtime,
      sampleInterval: 100,
      onListenerError,
    })

    monitor.subscribe(() => {
      throw new Error('listener failed')
    })
    monitor.subscribe(healthyListener)
    runStableFrames(runtime, 100, 0.1)

    expect(onListenerError).toHaveBeenCalled()
    expect(healthyListener).toHaveBeenCalled()
    expect(runtime.pendingFrameCount).toBe(1)
  })

  it('suspends while hidden and excludes hidden time after recovery', () => {
    const runtime = createFakeFrameMonitorRuntime()
    const monitor = createFramePerformanceMonitor({ runtime, sampleInterval: 100 })
    monitor.subscribe(() => undefined)

    runtime.advanceFrame(20)
    runtime.setVisibility('hidden')
    expect(monitor.getSnapshot().status).toBe('suspended')
    expect(runtime.pendingFrameCount).toBe(0)

    runtime.advanceTime(30_000)
    runtime.setVisibility('visible')
    runStableFrames(runtime, 50, 0.1)

    expect(monitor.getSnapshot().status).toBe('running')
    expect(monitor.getSnapshot().sample.maxFrameInterval).toBeCloseTo(20, 5)
  })

  it('ignores a cancelled callback delivered after suspension', () => {
    const runtime = createFakeFrameMonitorRuntime()
    const monitor = createFramePerformanceMonitor({ runtime, sampleInterval: 100 })
    monitor.subscribe(() => undefined)
    const pendingId = runtime.pendingFrameIds[0]

    runtime.setVisibility('hidden')
    runtime.runCancelledFrame(pendingId, 10_000)
    runtime.setVisibility('visible')
    runStableFrames(runtime, 50, 0.1)

    expect(monitor.getSnapshot().sample.maxFrameInterval).toBeCloseTo(20, 5)
  })

  it('stays idle when no runtime is available', () => {
    const listener = vi.fn()
    const monitor = createFramePerformanceMonitor({ runtime: null })

    monitor.subscribe(listener)

    expect(monitor.getSnapshot().status).toBe('idle')
    expect(monitor.getSnapshot().sample.fps).toBe(0)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
