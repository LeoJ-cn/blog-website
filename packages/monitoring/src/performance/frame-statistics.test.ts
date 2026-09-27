import { describe, expect, it } from 'vitest'
import {
  calculateFrameSample,
  calculatePercentile,
  calculateTargetMetrics,
} from './frame-statistics'

describe('calculatePercentile', () => {
  it('returns zero for an empty sample', () => {
    expect(calculatePercentile([], 95)).toBe(0)
  })

  it('uses the nearest-rank percentile', () => {
    expect(calculatePercentile([50, 10, 40, 20, 30], 95)).toBe(50)
    expect(calculatePercentile([50, 10, 40, 20, 30], 50)).toBe(30)
  })

  it('ignores invalid frame intervals', () => {
    expect(calculatePercentile([8, 0, -1, Number.NaN, Number.POSITIVE_INFINITY, 12], 95)).toBe(
      12,
    )
  })
})

describe('calculateFrameSample', () => {
  it.each([60, 90, 120, 144, 165, 240])('does not cap a stable %i FPS sample', (fps) => {
    const interval = 1000 / fps
    const sample = calculateFrameSample(Array.from({ length: fps - 1 }, () => interval), 1000, fps)

    expect(sample.fps).toBe(fps)
    expect(sample.p95FrameInterval).toBeCloseTo(interval, 5)
    expect(sample.maxFrameInterval).toBeCloseTo(interval, 5)
  })

  it('returns finite zero values for an invalid duration', () => {
    expect(calculateFrameSample([16], 0, 1)).toEqual({
      duration: 0,
      frameCount: 1,
      fps: 0,
      p95FrameInterval: 16,
      maxFrameInterval: 16,
    })
  })
})

describe('calculateTargetMetrics', () => {
  it('returns null when no valid target is configured', () => {
    expect(calculateTargetMetrics([16], 60)).toBeNull()
    expect(calculateTargetMetrics([16], 60, 0)).toBeNull()
    expect(calculateTargetMetrics([16], 60, Number.NaN)).toBeNull()
  })

  it('calculates missed target frames against an explicit 60 FPS budget', () => {
    const target = calculateTargetMetrics([16, 50], 50, 60)

    expect(target).not.toBeNull()
    expect(target?.frameBudget).toBeCloseTo(1000 / 60, 5)
    expect(target?.overBudgetFrames).toBe(1)
    expect(target?.missedFrames).toBe(2)
    expect(target?.achievementRate).toBeCloseTo(50 / 60, 5)
  })

  it('does not mark stable 120 FPS intervals as missing a 120 FPS target', () => {
    const target = calculateTargetMetrics(Array.from({ length: 120 }, () => 1000 / 120), 120, 120)

    expect(target?.overBudgetFrames).toBe(0)
    expect(target?.missedFrames).toBe(0)
    expect(target?.achievementRate).toBe(1)
  })

  it('ignores invalid intervals and caps achievement at one', () => {
    const target = calculateTargetMetrics([8, 0, -1, Number.NaN, Number.POSITIVE_INFINITY], 120, 60)

    expect(target?.overBudgetFrames).toBe(0)
    expect(target?.missedFrames).toBe(0)
    expect(target?.achievementRate).toBe(1)
  })
})
