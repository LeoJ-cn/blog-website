import type { StorageRuntimeState } from '@blog/indexed-db'
import type { InspectionEvent } from '../types/inspection-event'
import type { InspectionRegion } from '../types/region'
import type { GisDatasetScale } from './dataset-scale'

export interface GisDatasetMetadata {
  /** 当前 namespace 对应的数据量级。 */
  scale: GisDatasetScale
  /** 当前真实事件数量，单位为条；用户新增或删除后允许偏离量级基准容量。 */
  currentEventCount: number
  /** 固定 Mock 生成规则版本；版本不一致时重建当前量级。 */
  fixtureVersion: number
  /** 事件固定分片数量；第一版恒为 128。 */
  shardCount: 128
  /** 首次初始化时间，使用 ISO 8601 字符串。 */
  initializedAt: string
  /** 最近一次持久化修改时间，使用 ISO 8601 字符串。 */
  updatedAt: string
}

export interface PersistedGisDataset {
  metadata: GisDatasetMetadata
  events: InspectionEvent[]
  regions: InspectionRegion[]
  storageState: StorageRuntimeState
}
