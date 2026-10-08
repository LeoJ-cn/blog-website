import type { EventLevel, EventStatus, EventType, InspectionEvent } from '../types/inspection-event'

const TYPES: readonly EventType[] = ['ROAD_DAMAGE', 'LIGHT_FAILURE', 'GARBAGE', 'MANHOLE']
const STATUSES: readonly EventStatus[] = ['PENDING', 'PROCESSING', 'DONE']
const LEVELS: readonly EventLevel[] = ['HIGH', 'MEDIUM', 'LOW']
const DISTRICTS = ['黄浦区', '静安区', '徐汇区', '虹口区', '浦东新区'] as const

function createSeededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    // 采用固定参数的线性同余生成器；目标是可复现数据，不用于安全随机场景。
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/** 相同 count 始终生成相同数据，便于复现性能对比和交互问题。 */
export function generateInspectionEvents(count: number): InspectionEvent[] {
  const normalizedCount = Math.max(0, Math.floor(count))
  const random = createSeededRandom(20261008 + normalizedCount)
  // 所有事件从固定基准时间开始，每条递增 30 秒，确保相同 count 的时间序列也可复现。
  const baseTime = Date.parse('2026-10-08T08:00:00+08:00')

  return Array.from({ length: normalizedCount }, (_, index) => {
    const districtIndex = index % DISTRICTS.length
    // 平方根修正半径分布，避免所有点过度聚集在热点中心。
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random()) * (0.018 + districtIndex * 0.004)
    return {
      id: `EVT-${String(index + 1).padStart(6, '0')}`,
      type: TYPES[index % TYPES.length]!,
      status: STATUSES[Math.floor(random() * STATUSES.length)]!,
      level: LEVELS[Math.floor(random() * LEVELS.length)]!,
      lng: 121.4737 + Math.cos(angle) * radius + (districtIndex - 2) * 0.007,
      lat: 31.2304 + Math.sin(angle) * radius + ((districtIndex % 2) - 0.5) * 0.008,
      address: `${DISTRICTS[districtIndex]}巡检网格 ${String((index % 240) + 1).padStart(3, '0')} 号`,
      createdAt: new Date(baseTime + index * 30_000).toISOString(),
    }
  })
}
