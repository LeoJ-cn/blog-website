export interface FrameSampleMetrics {
  duration: number
  frameCount: number
  fps: number
  p95FrameInterval: number
  maxFrameInterval: number
}

export interface FrameTargetMetrics {
  fps: number
  frameBudget: number
  overBudgetFrames: number
  missedFrames: number
  achievementRate: number
}

export interface LongAnimationFrameMetrics {
  count: number
  totalBlockingDuration: number
  maxDuration: number
}

export type FrameMonitorStatus = 'idle' | 'running' | 'suspended'

export interface FramePerformanceSnapshot {
  timestamp: number
  status: FrameMonitorStatus
  sample: FrameSampleMetrics
  target: FrameTargetMetrics | null
  longAnimationFrames: LongAnimationFrameMetrics | null
}

export type FrameMonitorVisibilityState = 'visible' | 'hidden'

export interface LongAnimationFrameEntry {
  duration: number
  blockingDuration: number
}

export interface LongAnimationFrameObserver {
  disconnect(): void
}

export interface FrameMonitorRuntime {
  now(): number
  requestFrame(callback: (timestamp: number) => void): number
  cancelFrame(id: number): void
  getVisibilityState(): FrameMonitorVisibilityState
  subscribeVisibilityChange(listener: () => void): () => void
  createLongAnimationFrameObserver(
    listener: (entry: LongAnimationFrameEntry) => void,
  ): LongAnimationFrameObserver | null
}

export interface FramePerformanceMonitorOptions {
  targetFps?: number
  sampleInterval?: number
  runtime?: FrameMonitorRuntime | null
  onListenerError?: (error: unknown) => void
}

export type FramePerformanceListener = (snapshot: FramePerformanceSnapshot) => void

export interface FramePerformanceMonitor {
  start(): void
  stop(): void
  reset(): void
  getSnapshot(): FramePerformanceSnapshot
  subscribe(listener: FramePerformanceListener): () => void
}
