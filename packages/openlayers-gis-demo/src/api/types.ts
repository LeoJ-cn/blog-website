import type { GisDatasetScale } from '../persistence/dataset-scale'
import type {
  GisEventImportResult,
  InspectionEventEditableFields,
} from '../persistence/gis-dataset-repository'
import type { PersistedEventDetails, PersistedGisDataset } from '../persistence/types'
import type { EventEvidenceMetadata } from '../types/event-evidence'
import type { EventStatus, InspectionEvent } from '../types/inspection-event'
import type { InspectionRegion } from '../types/region'
import type { ViewportEventQuery, ViewportEventQueryResult } from '../viewport/types'

export interface GisStorageState {
  /** indexed-db 表示可跨刷新持久化；memory 表示当前页面生命周期内降级。 */
  engine: 'indexed-db' | 'memory'
  /** true 仅表示浏览器本地持久化可用，不代表服务端同步。 */
  persistent: boolean
  /** null 表示未降级；非空值是稳定机器可读原因。 */
  fallbackReason: string | null
}

export interface GisApiState {
  datasetScale: GisDatasetScale
  /** 当前真实事件数量，单位为条；用户写入后可偏离量级基准值。 */
  datasetSize: number
  storage: GisStorageState
  /** true 表示资源已释放，后续异步业务操作必须失败。 */
  closed: boolean
}

/** 页面依赖的业务协议；不暴露 IndexedDB namespace、shard 或底层 Key-Value Store。 */
export interface GisApi {
  readonly state: GisApiState
  loadDataset(): Promise<PersistedGisDataset>
  queryViewport(query: ViewportEventQuery): Promise<ViewportEventQueryResult>
  addEvent(event: InspectionEvent): Promise<boolean>
  updateEvent(
    eventId: string,
    changes: InspectionEventEditableFields,
  ): Promise<InspectionEvent | null>
  removeEvent(eventId: string): Promise<boolean>
  setAssignee(eventId: string, assignee: string): Promise<boolean>
  advanceEventStatus(eventId: string): Promise<InspectionEvent | null>
  advanceEventStatuses(
    eventIds: readonly string[],
    fromStatus: Exclude<EventStatus, 'DONE'>,
  ): Promise<InspectionEvent[]>
  saveRegions(regions: readonly InspectionRegion[]): Promise<void>
  importEvents(events: readonly InspectionEvent[]): Promise<GisEventImportResult>
  loadEventDetails(eventId: string): Promise<PersistedEventDetails>
  addAttachment(
    eventId: string,
    attachment: EventEvidenceMetadata,
    blob: Blob,
  ): Promise<boolean>
  removeAttachment(eventId: string, attachmentId: string): Promise<boolean>
  loadAttachmentBlob(eventId: string, attachmentId: string): Promise<Blob | null>
  close(): void
}
