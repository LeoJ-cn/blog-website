export type Nullable<T> = T | null
export type Maybe<T> = T | null | undefined

export interface BuildInfo {
  version: string
  buildTool: 'vite' | 'webpack'
  mode: 'development' | 'test' | 'staging' | 'production'
  commit: string
  buildTime: string
}

export interface PerformanceMetric {
  name: string
  value: number
  unit?: string
  timestamp: number
}
