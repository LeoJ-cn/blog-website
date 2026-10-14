import type { InspectionEvent } from '../types/inspection-event'

/** 固定 shard 数量；100k 档位平均每个 shard 约 781 条事件。 */
export const GIS_EVENT_SHARD_COUNT = 128 as const

/**
 * 使用 UTF-16 码元和 31 倍滚动哈希，确保相同事件 ID 在不同浏览器中落入同一 shard。
 */
export function getEventShardIndex(eventId: string): number {
  let hash = 0
  for (let index = 0; index < eventId.length; index += 1) {
    hash = (Math.imul(hash, 31) + eventId.charCodeAt(index)) >>> 0
  }
  return hash % GIS_EVENT_SHARD_COUNT
}

export function getEventShardKey(shardIndex: number): string {
  if (!Number.isInteger(shardIndex) || shardIndex < 0 || shardIndex >= GIS_EVENT_SHARD_COUNT) {
    throw new RangeError(`事件 shard 索引必须位于闭区间 [0, ${GIS_EVENT_SHARD_COUNT - 1}]`)
  }
  return `events:shard:${String(shardIndex).padStart(3, '0')}`
}

export function partitionEventsByShard(
  events: readonly InspectionEvent[],
): InspectionEvent[][] {
  const shards = Array.from(
    { length: GIS_EVENT_SHARD_COUNT },
    (): InspectionEvent[] => [],
  )
  for (const event of events) shards[getEventShardIndex(event.id)]!.push(event)
  return shards
}

export function mergeEventShards(
  shards: ReadonlyArray<readonly InspectionEvent[]>,
): InspectionEvent[] {
  // shard 的物理顺序不代表业务顺序；恢复时按 ID 码元排序，避免依赖不同运行时的本地化规则。
  return shards.flatMap((shard) => [...shard]).sort((left, right) => {
    if (left.id < right.id) return -1
    if (left.id > right.id) return 1
    return 0
  })
}
