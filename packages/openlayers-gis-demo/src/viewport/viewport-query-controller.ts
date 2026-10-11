import type {
  ViewportEventService,
  ViewportQueryParams,
  ViewportQueryState,
  ViewportQueryStatus,
} from './types'

export interface ViewportQueryControllerOptions {
  service: ViewportEventService
  onStateChange: (state: Readonly<ViewportQueryState>) => void
}

export class ViewportQueryController {
  readonly #service: ViewportEventService
  readonly #onStateChange: (state: Readonly<ViewportQueryState>) => void
  #state: ViewportQueryState = {
    status: 'idle',
    result: null,
    errorMessage: null,
    requestId: 0,
  }
  #activeAbortController: AbortController | null = null
  #lastParams: ViewportQueryParams | null = null
  #nextRequestId = 0
  #destroyed = false

  constructor(options: ViewportQueryControllerOptions) {
    this.#service = options.service
    this.#onStateChange = options.onStateChange
  }

  async query(params: ViewportQueryParams): Promise<void> {
    if (this.#destroyed) return

    const paramsSnapshot = this.#cloneParams(params)
    this.#lastParams = paramsSnapshot
    this.#activeAbortController?.abort()
    const abortController = new AbortController()
    this.#activeAbortController = abortController
    const requestId = ++this.#nextRequestId
    this.#emit({
      status: 'loading',
      result: this.#state.result,
      errorMessage: null,
      requestId,
    })

    try {
      const result = await this.#service.query({
        bbox: paramsSnapshot.bbox,
        filter: paramsSnapshot.filter,
        signal: abortController.signal,
      })
      if (!this.#canCommit(requestId)) return
      if (result.datasetVersion !== paramsSnapshot.expectedDatasetVersion) return

      this.#activeAbortController = null
      this.#emit({
        status: result.events.length === 0 ? 'empty' : 'success',
        result,
        errorMessage: null,
        requestId,
      })
    } catch (error) {
      if (!this.#canCommit(requestId) || this.#isAbortError(error)) return

      this.#activeAbortController = null
      this.#emit({
        status: 'error',
        result: this.#state.result,
        errorMessage: '当前视口数据加载失败，请重试',
        requestId,
      })
    }
  }

  async retry(): Promise<void> {
    if (!this.#lastParams || this.#destroyed) return
    await this.query(this.#lastParams)
  }

  cancel(): void {
    if (this.#destroyed || !this.#activeAbortController) return

    this.#activeAbortController.abort()
    this.#activeAbortController = null
    const requestId = ++this.#nextRequestId
    if (this.#state.status !== 'loading') return

    this.#emit({
      status: this.#getStableStatus(),
      result: this.#state.result,
      errorMessage: null,
      requestId,
    })
  }

  destroy(): void {
    if (this.#destroyed) return
    this.#destroyed = true
    this.#nextRequestId += 1
    this.#activeAbortController?.abort()
    this.#activeAbortController = null
    this.#lastParams = null
  }

  #cloneParams(params: ViewportQueryParams): ViewportQueryParams {
    return {
      bbox: [params.bbox[0], params.bbox[1], params.bbox[2], params.bbox[3]],
      filter: { ...params.filter },
      expectedDatasetVersion: params.expectedDatasetVersion,
    }
  }

  #canCommit(requestId: number): boolean {
    return !this.#destroyed && requestId === this.#nextRequestId
  }

  #isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError'
  }

  #getStableStatus(): ViewportQueryStatus {
    if (!this.#state.result) return 'idle'
    return this.#state.result.events.length === 0 ? 'empty' : 'success'
  }

  #emit(state: ViewportQueryState): void {
    if (this.#destroyed) return
    this.#state = state
    // 每次创建只读浅快照，避免 Vue 调用方意外改写 Controller 的内部状态对象。
    this.#onStateChange(Object.freeze({ ...state }))
  }
}
