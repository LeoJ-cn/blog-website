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
  #occupiedBounds: readonly [minX: number, minY: number, maxX: number, maxY: number] | null = null

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
      this.#extendOccupiedBounds(gridX, gridY)
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
    if (!this.#occupiedBounds) return []

    const originX = this.#getGridCoordinate(longitude)
    const originY = this.#getGridCoordinate(latitude)
    const [minOccupiedX, minOccupiedY, maxOccupiedX, maxOccupiedY] = this.#occupiedBounds
    const maximumRing = Math.max(
      Math.abs(originX - minOccupiedX),
      Math.abs(originX - maxOccupiedX),
      Math.abs(originY - minOccupiedY),
      Math.abs(originY - maxOccupiedY),
    )
    const candidates: InspectionEvent[] = []

    for (let ring = 0; ring <= maximumRing; ring += 1) {
      this.#collectRing(originX, originY, ring, candidates)
      if (candidates.length >= limit) break
    }
    return candidates
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

  #collectRing(
    originX: number,
    originY: number,
    ring: number,
    candidates: InspectionEvent[],
  ): void {
    if (ring === 0) {
      candidates.push(...(this.#buckets.get(`${originX}:${originY}`) ?? []))
      return
    }

    const minX = originX - ring
    const maxX = originX + ring
    const minY = originY - ring
    const maxY = originY + ring
    for (let gridX = minX; gridX <= maxX; gridX += 1) {
      candidates.push(...(this.#buckets.get(`${gridX}:${minY}`) ?? []))
      candidates.push(...(this.#buckets.get(`${gridX}:${maxY}`) ?? []))
    }
    for (let gridY = minY + 1; gridY < maxY; gridY += 1) {
      candidates.push(...(this.#buckets.get(`${minX}:${gridY}`) ?? []))
      candidates.push(...(this.#buckets.get(`${maxX}:${gridY}`) ?? []))
    }
  }

  #extendOccupiedBounds(gridX: number, gridY: number): void {
    if (!this.#occupiedBounds) {
      this.#occupiedBounds = [gridX, gridY, gridX, gridY]
      return
    }
    const [minX, minY, maxX, maxY] = this.#occupiedBounds
    this.#occupiedBounds = [
      Math.min(minX, gridX),
      Math.min(minY, gridY),
      Math.max(maxX, gridX),
      Math.max(maxY, gridY),
    ]
  }

  #getGridCoordinate(coordinate: number): number {
    // 对负坐标同样使用 floor，确保查询和建索引始终落入一致的左闭右开网格。
    return Math.floor(coordinate / this.#cellSizeDegrees)
  }
}
