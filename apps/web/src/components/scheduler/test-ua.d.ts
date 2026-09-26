export interface PerformanceDetails {
  cores: number
  memory: number
  dpr: number
  cpuScore: number
  memScore: number
  staticWeighted: number
  dynamicScore: number
  benchmarkAborted: boolean
  abortReason: string
}

export interface PerformanceProbeResult {
  tier: 'FLAGSHIP' | 'HIGH_PERF' | 'MAINSTREAM' | 'ENTRY' | 'CONSTRAINED'
  tierLabel: string
  score: number
  performanceDetails: PerformanceDetails
  deviceDetails: Record<string, unknown>
}

export function detectPerformanceTier(): Promise<PerformanceProbeResult>
export function renderPerformanceReport(result: PerformanceProbeResult): HTMLElement
