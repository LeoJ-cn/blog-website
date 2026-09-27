import { expect, it } from 'vitest'
import { createFakeFrameMonitorRuntime } from './frame-monitor.fake-runtime'
import { createFramePerformanceMonitor } from './frame-monitor'
import type { FramePerformanceSnapshot } from './frame-monitor.types'

function expectFiniteSnapshot(snapshot: FramePerformanceSnapshot) {
  const values = [
    snapshot.timestamp,
    snapshot.sample.duration,
    snapshot.sample.frameCount,
    snapshot.sample.fps,
    snapshot.sample.p95FrameInterval,
    snapshot.sample.maxFrameInterval,
    snapshot.target?.frameBudget ?? 0,
    snapshot.target?.overBudgetFrames ?? 0,
    snapshot.target?.missedFrames ?? 0,
    snapshot.target?.achievementRate ?? 0,
    snapshot.longAnimationFrames?.count ?? 0,
    snapshot.longAnimationFrames?.totalBlockingDuration ?? 0,
    snapshot.longAnimationFrames?.maxDuration ?? 0,
  ]

  expect(values.every((value) => Number.isFinite(value) && value >= 0)).toBe(true)
}

it('keeps scheduling and metrics bounded through 100,000 lifecycle operations', () => {
  const runtime = createFakeFrameMonitorRuntime(0, { longAnimationFrameSupported: true })
  const monitor = createFramePerformanceMonitor({
    runtime,
    sampleInterval: 100,
    targetFps: 120,
  })
  let unsubscribe = monitor.subscribe(() => undefined)

  for (let index = 1; index <= 100_000; index += 1) {
    runtime.advanceFrame(index % 997 === 0 ? 50 : 1000 / 120)

    if (index % 250 === 0) {
      runtime.emitLongAnimationFrame({ duration: 70, blockingDuration: 20 })
    }
    if (index % 5_000 === 0) {
      runtime.setVisibility('hidden')
      runtime.advanceTime(30_000)
      runtime.setVisibility('visible')
    }
    if (index % 10_000 === 0) {
      monitor.reset()
      unsubscribe()
      expect(runtime.pendingFrameCount).toBe(0)
      expect(runtime.longAnimationFrameObserverCount).toBe(0)
      unsubscribe = monitor.subscribe(() => undefined)
    }

    expect(runtime.pendingFrameCount).toBeLessThanOrEqual(1)
    expect(runtime.longAnimationFrameObserverCount).toBeLessThanOrEqual(1)
  }

  expectFiniteSnapshot(monitor.getSnapshot())
  unsubscribe()
  const stoppedSnapshot = monitor.getSnapshot()

  runtime.advanceFrame(1000)
  runtime.emitLongAnimationFrame({ duration: 100, blockingDuration: 50 })

  expect(monitor.getSnapshot()).toEqual(stoppedSnapshot)
  expect(runtime.pendingFrameCount).toBe(0)
  expect(runtime.longAnimationFrameObserverCount).toBe(0)
})
