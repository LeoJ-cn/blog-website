import { generateInspectionEvents } from '../mock/generate-events'
import type { InspectionEvent, InspectionEventFilter } from '../types/inspection-event'
import { DEFAULT_CELL_SIZE_DEGREES, SpatialGridIndex } from './spatial-grid-index'
import {
  isEventInsideBbox,
  validateWgs84Bbox,
  type ViewportDatasetBuildStats,
  type ViewportEventQuery,
  type ViewportEventQueryResult,
  type RestorableViewportEventService,
  type Wgs84Bbox,
} from './types'

/** 默认模拟网络等待时间，单位为毫秒，不计入 queryDurationMs。 */
const DEFAULT_LATENCY_MS = 80
/** 默认 LRU 条目上限；Key 同时包含数据版本、量化 BBOX 和筛选条件。 */
const DEFAULT_CACHE_CAPACITY = 20

interface CachedQueryCandidates {
  /** 量化 BBOX 相交网格返回的原始空间候选数量。 */
  candidateCount: number
  /** 已按量化 BBOX 和业务筛选过滤的事件；返回前还需按真实 BBOX 精筛。 */
  events: InspectionEvent[]
}

export interface MockViewportEventServiceOptions {
  /** 模拟异步请求延迟，单位为毫秒；必须为有限非负数。 */
  latencyMs?: number
  /** LRU 最多保留的查询条目数；必须为正整数。 */
  cacheCapacity?: number
  /** 固定网格边长，单位为经纬度角度；必须为有限正数。 */
  cellSizeDegrees?: number
  /** 用于可测试数据源替换；生产默认使用确定性 Mock 事件生成器。 */
  datasetFactory?: (count: number) => InspectionEvent[]
}

/** 在内存数据集上实现可取消视口查询、固定网格索引和有界 LRU 缓存。 */
class MockViewportEventService implements RestorableViewportEventService {
  readonly #latencyMs: number
  readonly #cacheCapacity: number
  readonly #cellSizeDegrees: number
  readonly #datasetFactory: (count: number) => InspectionEvent[]
  readonly #cache = new Map<string, CachedQueryCandidates>()
  #events: InspectionEvent[] = []
  #index = new SpatialGridIndex([], { cellSizeDegrees: DEFAULT_CELL_SIZE_DEGREES })
  #datasetVersion = 0
  #destroyed = false

  constructor(initialCount: number, options: MockViewportEventServiceOptions) {
    this.#latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS
    this.#cacheCapacity = options.cacheCapacity ?? DEFAULT_CACHE_CAPACITY
    this.#cellSizeDegrees = options.cellSizeDegrees ?? DEFAULT_CELL_SIZE_DEGREES
    this.#datasetFactory = options.datasetFactory ?? generateInspectionEvents

    if (!Number.isFinite(this.#latencyMs)) {
      throw new TypeError('模拟请求延迟必须是有限数值')
    }
    if (this.#latencyMs < 0) {
      throw new RangeError('模拟请求延迟不能小于 0')
    }
    if (!Number.isInteger(this.#cacheCapacity) || this.#cacheCapacity <= 0) {
      throw new RangeError('缓存容量必须是正整数')
    }

    this.setDatasetSize(initialCount)
  }

  /** 重建确定性 Mock 数据与索引，递增版本并清空引用旧事件的全部缓存。 */
  setDatasetSize(count: number): ViewportDatasetBuildStats {
    this.#assertActive()
    const normalizedCount = Math.max(0, Math.floor(count))
    const generationStartedAt = performance.now()
    const events = this.#datasetFactory(normalizedCount)
    const generationDurationMs = performance.now() - generationStartedAt
    this.#assertUniqueEventIds(events)

    return this.#replaceDataset(events, generationDurationMs)
  }

  /** 使用调用方恢复的完整事件快照重建索引，并使旧查询缓存立即失效。 */
  replaceDataset(events: readonly InspectionEvent[]): ViewportDatasetBuildStats {
    this.#assertActive()
    return this.#replaceDataset(events, 0)
  }

  #replaceDataset(
    events: readonly InspectionEvent[],
    generationDurationMs: number,
  ): ViewportDatasetBuildStats {
    this.#assertUniqueEventIds(events)
    const indexStartedAt = performance.now()
    const index = new SpatialGridIndex(events, { cellSizeDegrees: this.#cellSizeDegrees })
    const indexBuildDurationMs = performance.now() - indexStartedAt

    this.#events = structuredClone([...events])
    this.#index = index
    this.#datasetVersion += 1
    this.clearCache()

    return {
      datasetSize: this.#events.length,
      datasetVersion: this.#datasetVersion,
      generationDurationMs,
      indexBuildDurationMs,
      indexedCellCount: index.getCellCount(),
    }
  }

  /** 查询量化范围缓存，再按真实 BBOX 精筛；模拟延迟结束后才开始统计纯查询耗时。 */
  async query(query: ViewportEventQuery): Promise<ViewportEventQueryResult> {
    this.#assertActive()
    this.#throwIfAborted(query.signal)
    validateWgs84Bbox(query.bbox)
    await this.#waitForLatency(query.signal)
    this.#assertActive()
    this.#throwIfAborted(query.signal)

    const queryStartedAt = performance.now()
    const quantizedBbox = this.#quantizeOutward(query.bbox)
    const cacheKey = this.#createCacheKey(quantizedBbox, query.filter)
    let cacheHit = true
    let cached = this.#readCache(cacheKey)

    if (!cached) {
      cacheHit = false
      const candidates = this.#index.queryCandidates(quantizedBbox)
      cached = {
        candidateCount: candidates.length,
        events: candidates.filter(
          (event) =>
            isEventInsideBbox(event, quantizedBbox) && this.#matchesFilter(event, query.filter),
        ),
      }
      this.#throwIfAborted(query.signal)
      this.#writeCache(cacheKey, cached)
    }

    const events = cached.events.filter((event) => isEventInsideBbox(event, query.bbox))
    this.#throwIfAborted(query.signal)

    return {
      events: [...events],
      datasetSize: this.#events.length,
      datasetVersion: this.#datasetVersion,
      candidateCount: cached.candidateCount,
      matchedCount: events.length,
      queryDurationMs: performance.now() - queryStartedAt,
      cacheHit,
    }
  }

  /** 清空 LRU 查询结果但不影响数据集版本或空间索引。 */
  clearCache(): void {
    this.#cache.clear()
  }

  /** 幂等释放事件、索引和缓存；销毁后继续查询或重建数据会抛错。 */
  destroy(): void {
    this.#destroyed = true
    this.clearCache()
    this.#events = []
    this.#index = new SpatialGridIndex([], { cellSizeDegrees: this.#cellSizeDegrees })
  }

  #assertActive(): void {
    if (this.#destroyed) {
      throw new Error('Viewport event service has been destroyed')
    }
  }

  #assertUniqueEventIds(events: readonly InspectionEvent[]): void {
    const eventIds = new Set<string>()
    for (const event of events) {
      if (eventIds.has(event.id)) {
        throw new Error(`Duplicate inspection event id: ${event.id}`)
      }
      eventIds.add(event.id)
    }
  }

  #matchesFilter(event: InspectionEvent, filter: InspectionEventFilter): boolean {
    const keyword = filter.keyword.trim().toLocaleLowerCase()
    return (
      (!filter.type || event.type === filter.type) &&
      (!filter.status || event.status === filter.status) &&
      (!filter.level || event.level === filter.level) &&
      (!keyword ||
        event.id.toLocaleLowerCase().includes(keyword) ||
        event.address.toLocaleLowerCase().includes(keyword))
    )
  }

  #quantizeOutward(bbox: Wgs84Bbox): Wgs84Bbox {
    const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bbox
    const floorToCell = (value: number) =>
      Math.floor(value / this.#cellSizeDegrees) * this.#cellSizeDegrees
    const ceilToCell = (value: number) =>
      Math.ceil(value / this.#cellSizeDegrees) * this.#cellSizeDegrees

    // 最小边向外取 floor、最大边向外取 ceil，确保量化缓存绝不会漏掉真实视口。
    return [
      Math.max(-180, floorToCell(minLongitude)),
      Math.max(-90, floorToCell(minLatitude)),
      Math.min(180, ceilToCell(maxLongitude)),
      Math.min(90, ceilToCell(maxLatitude)),
    ]
  }

  #createCacheKey(bbox: Wgs84Bbox, filter: InspectionEventFilter): string {
    const normalizedFilter = {
      keyword: filter.keyword.trim().toLocaleLowerCase(),
      type: filter.type,
      status: filter.status,
      level: filter.level,
    }
    return JSON.stringify([
      this.#datasetVersion,
      bbox.map((coordinate) => coordinate.toFixed(8)),
      normalizedFilter,
    ])
  }

  #readCache(cacheKey: string): CachedQueryCandidates | undefined {
    const cached = this.#cache.get(cacheKey)
    if (!cached) return undefined

    // Map 的删除再写入会把条目移动到迭代末尾，以此维护最近使用顺序。
    this.#cache.delete(cacheKey)
    this.#cache.set(cacheKey, cached)
    return cached
  }

  #writeCache(cacheKey: string, value: CachedQueryCandidates): void {
    this.#cache.set(cacheKey, value)
    if (this.#cache.size <= this.#cacheCapacity) return

    const leastRecentlyUsedKey = this.#cache.keys().next().value
    if (leastRecentlyUsedKey !== undefined) {
      this.#cache.delete(leastRecentlyUsedKey)
    }
  }

  async #waitForLatency(signal?: AbortSignal): Promise<void> {
    if (this.#latencyMs === 0) {
      await Promise.resolve()
      this.#throwIfAborted(signal)
      return
    }

    await new Promise<void>((resolve, reject) => {
      const handleAbort = () => {
        clearTimeout(timerId)
        signal?.removeEventListener('abort', handleAbort)
        reject(this.#createAbortError())
      }
      const timerId = setTimeout(() => {
        signal?.removeEventListener('abort', handleAbort)
        resolve()
      }, this.#latencyMs)
      signal?.addEventListener('abort', handleAbort, { once: true })
    })
  }

  #throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) throw this.#createAbortError()
  }

  #createAbortError(): Error {
    if (typeof DOMException !== 'undefined') {
      return new DOMException('查询已取消', 'AbortError')
    }
    const error = new Error('查询已取消')
    error.name = 'AbortError'
    return error
  }
}

/** 创建 ViewportEventService 抽象，调用方不依赖 Mock 实现类。 */
export function createMockViewportEventService(
  initialCount: number,
  options: MockViewportEventServiceOptions = {},
): RestorableViewportEventService {
  return new MockViewportEventService(initialCount, options)
}
