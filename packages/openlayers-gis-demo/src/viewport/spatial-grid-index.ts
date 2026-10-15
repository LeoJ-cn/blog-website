import type { InspectionEvent } from '../types/inspection-event'
import type { Wgs84Coordinate } from '../types/region'
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
      const gridX = this.#getGridCoordinate(event.lng)
      const gridY = this.#getGridCoordinate(event.lat)
      const key = `${gridX}:${gridY}`
      const bucket = this.#buckets.get(key)
      if (bucket) {
        bucket.push(event)
      } else {
        this.#buckets.set(key, [event])
      }
    }
  }

  /**
   * 从目标点所在网格按方形环向外读取候选，达到 limit 或覆盖全部占用桶后停止。
   * 返回值只用于 Service 的 Haversine 精排，不保证自身顺序具有距离语义。
   */
  queryNearestCandidates(point: Wgs84Coordinate, limit: number): readonly InspectionEvent[] {
    const [longitude, latitude] = point
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      throw new TypeError('最近邻目标坐标必须是有限数值')
    }
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      throw new RangeError('最近邻目标坐标超出 WGS84 合法范围')
    }
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError('最近邻候选数量必须是正整数')
    }
    // 精确最近邻必须考虑相邻网格中可能更靠近边界的点。第一阶段最多 100k 数据，
    // 因此返回全部占用桶供 Service 做 Haversine 精排，避免“桶内够数即停止”产生错误结果。
    return [...this.#buckets.values()].flat()
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

    const theoreticalCellCount = (maxGridX - minGridX + 1) * (maxGridY - minGridY + 1)
    // 大范围 Polygon 可能覆盖数亿个理论空网格；超过占用桶规模时改为扫描现有桶。
    if (theoreticalCellCount > this.#buckets.size * 2) {
      for (const [key, bucket] of this.#buckets) {
        const [gridX, gridY] = key.split(':').map(Number)
        if (gridX < minGridX || gridX > maxGridX || gridY < minGridY || gridY > maxGridY) continue
        for (const event of bucket) {
          // 扫描占用桶的优化路径必须与逐网格路径保持相同的稳定业务 ID 去重语义。
          if (seenEventIds.has(event.id)) continue
          seenEventIds.add(event.id)
          candidates.push(event)
        }
      }
      return candidates
    }

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

  #getGridCoordinate(coordinate: number): number {
    // 对负坐标同样使用 floor，确保查询和建索引始终落入一致的左闭右开网格。
    return Math.floor(coordinate / this.#cellSizeDegrees)
  }
}
