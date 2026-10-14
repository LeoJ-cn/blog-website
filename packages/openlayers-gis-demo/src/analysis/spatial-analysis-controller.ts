import type { GisApi } from '../api/types'
import type { SpatialAnalysisInput, SpatialAnalysisResult } from '../types/spatial-analysis'

export type SpatialAnalysisControllerStatus =
  | 'idle' // 尚未选择工具或输入。
  | 'drawing' // 正在等待地图完成输入绘制。
  | 'ready' // 已有合法输入，可以执行分析。
  | 'running' // 分析请求执行中，输入暂时不可修改。
  | 'success' // 最近一次请求成功并已提交结果。
  | 'error' // 最近一次请求失败，输入仍保留以便重试。

export interface SpatialAnalysisControllerState {
  status: SpatialAnalysisControllerStatus
  input: SpatialAnalysisInput | null
  result: SpatialAnalysisResult | null
  errorMessage: string | null
  /** 单调递增请求序号；只有当前序号的异步结果可以提交。 */
  requestId: number
}

/** 编排分析请求和竞态保护，不持有 OpenLayers、Vue 响应式对象或完整事件集合。 */
export class SpatialAnalysisController {
  #state: SpatialAnalysisControllerState = {
    status: 'idle',
    input: null,
    result: null,
    errorMessage: null,
    requestId: 0,
  }

  constructor(
    private readonly api: Pick<GisApi, 'executeSpatialAnalysis'>,
    private readonly onStateChange?: (state: SpatialAnalysisControllerState) => void,
  ) {}

  get state(): SpatialAnalysisControllerState {
    return structuredClone(this.#state)
  }

  startDrawing(): void {
    this.#commit({
      status: 'drawing',
      input: null,
      result: null,
      errorMessage: null,
      requestId: this.#state.requestId + 1,
    })
  }

  setInput(input: SpatialAnalysisInput): void {
    this.#commit({
      status: 'ready',
      input: structuredClone(input),
      result: null,
      errorMessage: null,
      requestId: this.#state.requestId + 1,
    })
  }

  async execute(): Promise<SpatialAnalysisResult | null> {
    if (!this.#state.input) return null
    const requestId = this.#state.requestId + 1
    const input = structuredClone(this.#state.input)
    this.#commit({ status: 'running', requestId, errorMessage: null })
    try {
      const result = await this.api.executeSpatialAnalysis(input)
      if (this.#state.requestId !== requestId) return null
      this.#commit({ status: 'success', result: structuredClone(result), errorMessage: null })
      return result
    } catch (error) {
      if (this.#state.requestId !== requestId) return null
      this.#commit({
        status: 'error',
        result: null,
        errorMessage: error instanceof Error ? error.message : '空间分析执行失败',
      })
      return null
    }
  }

  reset(): void {
    // 递增 requestId 使已经发出的旧请求在完成后自动失效。
    this.#state = {
      status: 'idle',
      input: null,
      result: null,
      errorMessage: null,
      requestId: this.#state.requestId + 1,
    }
    this.#emit()
  }

  #commit(changes: Partial<SpatialAnalysisControllerState>): void {
    this.#state = { ...this.#state, ...changes }
    this.#emit()
  }

  #emit(): void {
    this.onStateChange?.(this.state)
  }
}
