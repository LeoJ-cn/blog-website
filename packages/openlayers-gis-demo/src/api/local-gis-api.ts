import type { GisDatasetScale } from '../persistence/dataset-scale'
import {
  GisDatasetRepository,
  type GisEventImportResult,
  type InspectionEventEditableFields,
} from '../persistence/gis-dataset-repository'
import type { PersistedEventDetails, PersistedGisDataset } from '../persistence/types'
import type { EventEvidenceMetadata } from '../types/event-evidence'
import type { EventStatus, InspectionEvent } from '../types/inspection-event'
import type { InspectionRegion } from '../types/region'
import { createMockViewportEventService } from '../viewport/mock-viewport-event-service'
import type { ViewportEventQuery, ViewportEventQueryResult } from '../viewport/types'
import type { GisApi, GisApiState } from './types'

export interface LocalGisApiOptions {
  /** 生产省略后固定使用 blog-gis；测试可传独立名称隔离页面级 Memory Registry。 */
  databaseName?: string
  /** 本地查询模拟延迟，单位为毫秒；页面默认沿用 Viewport Service 的 80ms。 */
  latencyMs?: number
  /** 仅用于得到可复现的业务活动与 metadata 时间。 */
  now?: () => Date
}

/** 用本地持久化 Repository 与内存空间索引实现页面业务协议。 */
export class LocalGisApi implements GisApi {
  readonly #scale: GisDatasetScale
  readonly #repository: GisDatasetRepository
  readonly #viewportService
  #datasetSize: number
  #closed = false

  private constructor(
    scale: GisDatasetScale,
    repository: GisDatasetRepository,
    dataset: PersistedGisDataset,
    latencyMs?: number,
  ) {
    this.#scale = scale
    this.#repository = repository
    this.#datasetSize = dataset.events.length
    this.#viewportService = createMockViewportEventService(0, { latencyMs })
    this.#viewportService.replaceDataset(dataset.events)
  }

  static async create(
    scale: GisDatasetScale,
    options: LocalGisApiOptions = {},
  ): Promise<LocalGisApi> {
    const repository = await GisDatasetRepository.create(scale, {
      databaseName: options.databaseName,
      now: options.now,
    })
    try {
      const dataset = await repository.loadOrInitialize()
      return new LocalGisApi(scale, repository, dataset, options.latencyMs)
    } catch (error) {
      repository.close()
      throw error
    }
  }

  get state(): GisApiState {
    return {
      datasetScale: this.#scale,
      datasetSize: this.#datasetSize,
      storage: { ...this.#repository.state },
      closed: this.#closed,
    }
  }

  async loadDataset(): Promise<PersistedGisDataset> {
    this.#assertActive()
    return this.#repository.loadOrInitialize()
  }

  async queryViewport(query: ViewportEventQuery): Promise<ViewportEventQueryResult> {
    this.#assertActive()
    return this.#viewportService.query(query)
  }

  async addEvent(event: InspectionEvent): Promise<boolean> {
    this.#assertActive()
    const added = await this.#repository.addEvent(event)
    if (added) await this.#refreshIndex()
    return added
  }

  async updateEvent(
    eventId: string,
    changes: InspectionEventEditableFields,
  ): Promise<InspectionEvent | null> {
    this.#assertActive()
    const updated = await this.#repository.updateEvent(eventId, changes)
    if (updated) await this.#refreshIndex()
    return updated
  }

  async removeEvent(eventId: string): Promise<boolean> {
    this.#assertActive()
    const removed = await this.#repository.removeEvent(eventId)
    if (removed) await this.#refreshIndex()
    return removed
  }

  async setAssignee(eventId: string, assignee: string): Promise<boolean> {
    this.#assertActive()
    return this.#repository.setAssignee(eventId, assignee)
  }

  async advanceEventStatus(eventId: string): Promise<InspectionEvent | null> {
    this.#assertActive()
    const updated = await this.#repository.advanceEventStatus(eventId)
    if (updated) await this.#refreshIndex()
    return updated
  }

  async advanceEventStatuses(
    eventIds: readonly string[],
    fromStatus: Exclude<EventStatus, 'DONE'>,
  ): Promise<InspectionEvent[]> {
    this.#assertActive()
    const updated = await this.#repository.advanceEventStatuses(eventIds, fromStatus)
    if (updated.length > 0) await this.#refreshIndex()
    return updated
  }

  async saveRegions(regions: readonly InspectionRegion[]): Promise<void> {
    this.#assertActive()
    await this.#repository.saveRegions(regions)
  }

  async importEvents(events: readonly InspectionEvent[]): Promise<GisEventImportResult> {
    this.#assertActive()
    const result = await this.#repository.importEvents(events)
    if (result.addedCount + result.overwrittenCount > 0) await this.#refreshIndex()
    return result
  }

  async loadEventDetails(eventId: string): Promise<PersistedEventDetails> {
    this.#assertActive()
    return this.#repository.loadEventDetails(eventId)
  }

  async addAttachment(
    eventId: string,
    attachment: EventEvidenceMetadata,
    blob: Blob,
  ): Promise<boolean> {
    this.#assertActive()
    return this.#repository.addAttachment(eventId, attachment, blob)
  }

  async removeAttachment(eventId: string, attachmentId: string): Promise<boolean> {
    this.#assertActive()
    return this.#repository.removeAttachment(eventId, attachmentId)
  }

  async loadAttachmentBlob(eventId: string, attachmentId: string): Promise<Blob | null> {
    this.#assertActive()
    return this.#repository.loadAttachmentBlob(eventId, attachmentId)
  }

  close(): void {
    if (this.#closed) return
    this.#closed = true
    this.#viewportService.destroy()
    this.#repository.close()
  }

  async #refreshIndex(): Promise<void> {
    const dataset = await this.#repository.loadOrInitialize()
    this.#datasetSize = dataset.events.length
    this.#viewportService.replaceDataset(dataset.events)
  }

  #assertActive(): void {
    if (this.#closed) throw new Error('Local GIS API has been closed')
  }
}
