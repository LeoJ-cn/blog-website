import type { InspectionEvent } from '../types/inspection-event'
import { validateWgs84Bbox, type Wgs84Bbox } from './types'

/** 城市演示数据使用的默认网格边长；该经验值不代表通用 GIS 场景的最优配置。 */
export const DEFAULT_CELL_SIZE_DEGREES = 0.01

export interface SpatialGridIndexOptions {
  /** 网格边长，单位为经纬度角度，必须为有限正数。 */
  cellSizeDegrees: number
}

/**
 * 基于 WGS84 固定角度网格的只读空间索引。
 * 索引仅负责快速返回相交桶候选，调用方仍需使用真实 BBOX 做精确包含判断。
 */
export class SpatialGridIndex {
  readonly #buckets = new Map<string, InspectionEvent[]>()
  readonly #cellSizeDegrees: number

  /** 构造时一次性把事件写入左闭右开网格桶；后续事件变化必须重建索引。 */
  constructor(events: readonly InspectionEvent[], options: SpatialGridIndexOptions) {
    const { cellSizeDegrees } = options
    if (!Number.isFinite(cellSizeDegrees)) {
      throw new TypeError('网格边长必须是有限数值')
    }
    if (cellSizeDegrees <= 0) {
      throw new RangeError('网格边长必须大于 0')
    }

    this.#cellSizeDegrees = cellSizeDegrees
    for (const event of events) {
      const key = this.#getCellKey(event.lng, event.lat)
      const bucket = this.#buckets.get(key)
      if (bucket) {
        bucket.push(event)
      } else {
        this.#buckets.set(key, [event])
      }
    }
  }

  /** 返回与 BBOX 覆盖网格相交的去重候选；结果可能包含真实 BBOX 外的事件。 */
  queryCandidates(bbox: Wgs84Bbox): readonly InspectionEvent[] {
    validateWgs84Bbox(bbox)
    const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bbox
    const minGridX = this.#getGridCoordinate(minLongitude)
    const minGridY = this.#getGridCoordinate(minLatitude)
    const maxGridX = this.#getGridCoordinate(maxLongitude)
    const maxGridY = this.#getGridCoordinate(maxLatitude)
    const candidates: InspectionEvent[] = []
    const seenEventIds = new Set<string>()

    for (let gridX = minGridX; gridX <= maxGridX; gridX += 1) {
      for (let gridY = minGridY; gridY <= maxGridY; gridY += 1) {
        const bucket = this.#buckets.get(`${gridX}:${gridY}`)
        if (!bucket) continue

        for (const event of bucket) {
          // ID 是事件的稳定业务身份；防止未来桶策略调整后同一事件被重复返回。
          if (seenEventIds.has(event.id)) continue
          seenEventIds.add(event.id)
          candidates.push(event)
        }
      }
    }

    return candidates
  }

  /** 返回至少包含一个事件的桶数量，不包含空网格。 */
  getCellCount(): number {
    return this.#buckets.size
  }

  #getCellKey(longitude: number, latitude: number): string {
    return `${this.#getGridCoordinate(longitude)}:${this.#getGridCoordinate(latitude)}`
  }

  #getGridCoordinate(coordinate: number): number {
    // 对负坐标同样使用 floor，确保查询和建索引始终落入一致的左闭右开网格。
    return Math.floor(coordinate / this.#cellSizeDegrees)
  }
}
