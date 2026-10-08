import type { TrackPoint } from '../types/track'

const ROUTE: readonly (readonly [number, number])[] = [
  [121.449, 31.222],
  [121.452, 31.224],
  [121.456, 31.226],
  [121.46, 31.229],
  [121.464, 31.231],
  [121.468, 31.233],
  [121.472, 31.232],
  [121.476, 31.235],
  [121.48, 31.237],
  [121.484, 31.24],
  [121.488, 31.242],
  [121.492, 31.245],
]

const TRACK_START_TIME = Date.parse('2026-10-08T08:30:00+08:00')

export const mockInspectionTrack: readonly TrackPoint[] = ROUTE.map(([lng, lat], index) => ({
  lng,
  lat,
  // 相邻采样点间隔 20 秒，用较短演示时长保留真实的时间插值语义。
  timestamp: TRACK_START_TIME + index * 20_000,
}))
