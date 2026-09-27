import type { FrameSampleMetrics, FrameTargetMetrics } from './frame-monitor.types'

function getValidIntervals(values: readonly number[]): number[] {
  return values.filter((value) => Number.isFinite(value) && value > 0)
}

export function calculatePercentile(values: readonly number[], percentile: number): number {
  const sortedValues = getValidIntervals(values).sort((left, right) => left - right)

  if (sortedValues.length === 0) {
    return 0
  }

  const normalizedPercentile = Math.max(0, Math.min(percentile, 100))
  // 使用 nearest-rank，保证结果一定来自真实帧间隔，便于面板直接解释最差一档样本。
  const rank = Math.max(1, Math.ceil((normalizedPercentile / 100) * sortedValues.length))

  return sortedValues[rank - 1] ?? 0
}

export function calculateFrameSample(
  intervals: readonly number[],
  duration: number,
  frameCount: number,
): FrameSampleMetrics {
  const validIntervals = getValidIntervals(intervals)
  const validDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
  const validFrameCount = Number.isFinite(frameCount) ? Math.max(0, Math.floor(frameCount)) : 0

  return {
    duration: validDuration,
    frameCount: validFrameCount,
    // RAF 回调次数代表窗口内实际观察到的帧数，再按真实窗口时长折算成每秒值。
    fps: validDuration > 0 ? Math.round((validFrameCount * 1000) / validDuration) : 0,
    p95FrameInterval: calculatePercentile(validIntervals, 95),
    maxFrameInterval: validIntervals.length > 0 ? Math.max(...validIntervals) : 0,
  }
}

export function calculateTargetMetrics(
  intervals: readonly number[],
  fps: number,
  targetFps?: number,
): FrameTargetMetrics | null {
  if (targetFps === undefined || !Number.isFinite(targetFps) || targetFps <= 0) {
    return null
  }

  const frameBudget = 1000 / targetFps
  const validIntervals = getValidIntervals(intervals)
  const validFps = Number.isFinite(fps) ? Math.max(0, fps) : 0

  return {
    fps: targetFps,
    frameBudget,
    // 等于预算仍视为按时完成；只有严格超出预算的间隔才计为 over-budget。
    overBudgetFrames: validIntervals.filter((interval) => interval > frameBudget).length,
    // 用间隔覆盖的预算槽位近似丢帧数；这是趋势指标，不等同于浏览器实际提交帧计数。
    missedFrames: validIntervals.reduce(
      (total, interval) => total + Math.max(0, Math.round(interval / frameBudget) - 1),
      0,
    ),
    // 达成率只表达是否达到目标，超出目标不展示为 100% 以上。
    achievementRate: Math.min(1, validFps / targetFps),
  }
}
