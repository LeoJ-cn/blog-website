import type { InspectionRegion } from '../types/region'

/** 固定 WGS84 坐标的预设区域，确保刷新后仍能复现相同空间范围。 */
export const mockInspectionRegions: InspectionRegion[] = [
  {
    id: 'REGION-HUANGPU-001',
    name: '黄浦核心巡检区',
    geometry: {
      type: 'Polygon',
      rings: [
        [
          [121.462, 31.238],
          [121.482, 31.238],
          [121.482, 31.222],
          [121.462, 31.222],
          [121.462, 31.238],
        ],
      ],
    },
    eventIds: null,
    createdAt: '2026-10-08T08:00:00.000+08:00',
  },
  {
    id: 'REGION-EAST-002',
    name: '东部重点巡检圈',
    geometry: {
      type: 'Circle',
      center: [121.493, 31.226],
      radiusMeters: 1_200,
    },
    eventIds: null,
    createdAt: '2026-10-08T08:05:00.000+08:00',
  },
]
