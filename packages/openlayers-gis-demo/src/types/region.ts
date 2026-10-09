/** WGS84 坐标，按 [经度, 纬度] 排列，单位为度。 */
export type Wgs84Coordinate = readonly [number, number]

export type RegionGeometry =
  | {
      type: 'Polygon'
      /** Polygon 环坐标；首尾坐标相同，每个坐标均按 [WGS84 经度, WGS84 纬度] 排列。 */
      rings: readonly (readonly Wgs84Coordinate[])[]
    }
  | {
      type: 'Circle'
      /** 圆心经纬度，按 [WGS84 经度, WGS84 纬度] 排列。 */
      center: Wgs84Coordinate
      /** 地表半径，单位为米，必须大于 0。 */
      radiusMeters: number
    }

export interface InspectionRegion {
  /** 区域业务唯一键，不使用 OpenLayers Feature ID 作为持久化协议。 */
  id: string
  name: string
  geometry: RegionGeometry
  /** null 表示尚未针对当前事件集合计算；空数组表示区域内没有事件。 */
  eventIds: string[] | null
  /** ISO 8601 格式的创建时间。 */
  createdAt: string
}
