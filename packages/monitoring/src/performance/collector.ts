import type { MonitoringReporter, PerformanceMetric } from '../types'

function metric(name: string, value: number, unit: PerformanceMetric['unit']): PerformanceMetric {
  return { name, value, unit, timestamp: Date.now() }
}

export function collectPerformanceMetrics(): PerformanceMetric[] {
  if (typeof performance === 'undefined') return []
  const metrics: PerformanceMetric[] = []
  const navigation = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined
  if (navigation) {
    metrics.push(
      metric('domContentLoaded', navigation.domContentLoadedEventEnd - navigation.startTime, 'ms'),
    )
    metrics.push(metric('loadEvent', navigation.loadEventEnd - navigation.startTime, 'ms'))
  }
  const paints = performance.getEntriesByType('paint')
  for (const paint of paints) metrics.push(metric(paint.name, paint.startTime, 'ms'))
  metrics.push(metric('resourceCount', performance.getEntriesByType('resource').length, 'count'))
  return metrics
}

export function collectAndReport(reporter: MonitoringReporter): PerformanceMetric[] {
  const metrics = collectPerformanceMetrics()
  metrics.forEach((item) => reporter.report(item))
  return metrics
}
