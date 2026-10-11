import type { TrackPoint } from '../types/track'

/**
 * WGS84 巡检采样点按 [经度, 纬度] 排列，使用蛇形路线依次经过 4×3 责任网格的全部中心点。
 * 网格边界与 create-responsibility-grid-layer.ts 保持一致，端点也保留在闭合覆盖范围内。
 */
const ROUTE: readonly (readonly [number, number])[] = [
  [121.4375, 31.203333],
  [121.4625, 31.203333],
  [121.4875, 31.203333],
  [121.5125, 31.203333],
  [121.5125, 31.23],
  [121.4875, 31.23],
  [121.4625, 31.23],
  [121.4375, 31.23],
  [121.4375, 31.256667],
  [121.4625, 31.256667],
  [121.4875, 31.256667],
  [121.5125, 31.256667],
]

const TRACK_START_TIME = Date.parse('2026-10-08T08:30:00+08:00')

export const mockInspectionTrack: readonly TrackPoint[] = ROUTE.map(([lng, lat], index) => ({
  lng,
  lat,
  // 相邻网格中心间隔 30 秒，完整演示约 5 分 30 秒并保留真实的时间插值语义。
  timestamp: TRACK_START_TIME + index * 30_000,
}))
