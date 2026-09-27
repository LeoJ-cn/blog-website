export interface FramePerformanceSnapshot {
  fps: number
  maxFrameInterval: number
  droppedFrames: number
}

export interface FramePerformanceMonitorOptions {
  targetFps?: number
  sampleInterval?: number
}

export type FramePerformanceListener = (snapshot: FramePerformanceSnapshot) => void

export interface FramePerformanceMonitor {
  start(): void
  stop(): void
  reset(): void
  getSnapshot(): FramePerformanceSnapshot
  subscribe(listener: FramePerformanceListener): () => void
}
