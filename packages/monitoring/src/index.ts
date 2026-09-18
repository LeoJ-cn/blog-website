import { collectAndReport } from './performance/collector'
import { ConsoleReporter } from './reporter/console'
import type { MonitoringOptions } from './types'

export function startMonitoring(options: MonitoringOptions = {}) {
  const reporter = options.reporter ?? new ConsoleReporter()
  const onError = () => reporter.report({ name: 'jsError', value: 1, unit: 'count', timestamp: Date.now() })
  const onRejection = () => reporter.report({ name: 'unhandledRejection', value: 1, unit: 'count', timestamp: Date.now() })

  if (options.captureErrors !== false && typeof window !== 'undefined') {
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
  }

  return {
    collect: () => collectAndReport(reporter),
    stop: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', onError)
        window.removeEventListener('unhandledrejection', onRejection)
      }
    },
  }
}

export { collectAndReport, collectPerformanceMetrics } from './performance/collector'
export { ConsoleReporter } from './reporter/console'
export type { MonitoringOptions, MonitoringReporter, PerformanceMetric } from './types'
