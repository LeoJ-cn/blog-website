import type { MonitoringReporter, PerformanceMetric } from '../types'

export class ConsoleReporter implements MonitoringReporter {
  report(metric: PerformanceMetric): void {
    console.info(`[monitoring] ${metric.name}: ${metric.value}${metric.unit}`)
  }
}
