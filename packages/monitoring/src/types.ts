export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'count' | 'score' | 'bytes'
  timestamp: number
}

export interface MonitoringReporter {
  report(metric: PerformanceMetric): void
}

export interface MonitoringOptions {
  reporter?: MonitoringReporter
  captureErrors?: boolean
}
