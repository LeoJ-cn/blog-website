import {
  createKeyValueStore,
  type CreateKeyValueStoreOptions,
  type KeyValueStore,
  type StorageRuntimeState,
} from '@blog/indexed-db'
import { generateInspectionEvents } from '../mock/generate-events'
import { mockInspectionRegions } from '../mock/regions'
import type {
  EventActivity,
  EventActivityType,
  EventStatus,
  InspectionEvent,
} from '../types/inspection-event'
import type { EventEvidenceMetadata } from '../types/event-evidence'
import type { InspectionRegion } from '../types/region'
import { getDatasetSize, type GisDatasetScale } from './dataset-scale'
import {
  GIS_EVENT_SHARD_COUNT,
  getEventShardIndex,
  getEventShardKey,
  mergeEventShards,
  partitionEventsByShard,
} from './event-shards'
import type {
  GisDatasetMetadata,
  PersistedEventDetails,
  PersistedGisDataset,
  PersistedSpatialAnalysis,
  SpatialAnalysisSummary,
} from './types'

const DEFAULT_DATABASE_NAME = 'blog-gis'
const METADATA_KEY = 'metadata'
const REGIONS_KEY = 'regions'
const ANALYSES_INDEX_KEY = 'analyses:index'

const NEXT_EVENT_STATUS = {
  PENDING: 'PROCESSING',
  PROCESSING: 'DONE',
  DONE: null,
} as const satisfies Record<EventStatus, EventStatus | null>

export const GIS_FIXTURE_VERSION = 1

type StoreFactory = (options: CreateKeyValueStoreOptions) => Promise<KeyValueStore>

export interface GisDatasetRepositoryOptions {
  /** 生产固定为 blog-gis；测试可传独立名称隔离页面级 Memory Registry。 */
  databaseName?: string
  /** 注入时间只用于得到可复现的 metadata 测试，不改变生产时钟语义。 */
  now?: () => Date
  /** 测试可模拟未来 fixture 版本；生产必须使用 GIS_FIXTURE_VERSION。 */
  fixtureVersion?: number
  storeFactory?: StoreFactory
  onRuntimeStateChange?: CreateKeyValueStoreOptions['onRuntimeStateChange']
}

export type InspectionEventEditableFields = Pick<
  InspectionEvent,
  'type' | 'level' | 'lng' | 'lat' | 'address'
>

export interface GisEventImportResult {
  /** 导入前不存在、此次新增的事件数量。 */
  addedCount: number
  /** 导入前已存在、此次按 ID 覆盖基础字段的事件数量。 */
  overwrittenCount: number
}

export class GisDatasetRepository {
  readonly #scale: GisDatasetScale
  readonly #store: KeyValueStore
  readonly #now: () => Date
  readonly #fixtureVersion: number
  #dataset: PersistedGisDataset | null = null

  private constructor(
    scale: GisDatasetScale,
    store: KeyValueStore,
    options: GisDatasetRepositoryOptions,
  ) {
    this.#scale = scale
    this.#store = store
    this.#now = options.now ?? (() => new Date())
    this.#fixtureVersion = options.fixtureVersion ?? GIS_FIXTURE_VERSION
  }

  static async create(
    scale: GisDatasetScale,
    options: GisDatasetRepositoryOptions = {},
  ): Promise<GisDatasetRepository> {
    const storeFactory = options.storeFactory ?? createKeyValueStore
    const store = await storeFactory({
      databaseName: options.databaseName ?? DEFAULT_DATABASE_NAME,
      namespace: `dataset:${scale}`,
      fallback: 'memory',
      onRuntimeStateChange: options.onRuntimeStateChange,
    })
    return new GisDatasetRepository(scale, store, options)
  }

  get state(): StorageRuntimeState {
    return this.#store.state
  }

  async loadOrInitialize(): Promise<PersistedGisDataset> {
    if (this.#dataset) return structuredClone(this.#dataset)
    const metadata = await this.#store.get<GisDatasetMetadata>(METADATA_KEY)
    if (metadata && this.#isCurrentMetadata(metadata)) {
      const restored = await this.#restore(metadata)
      if (restored) {
        this.#dataset = restored
        return structuredClone(restored)
      }
    }
    const initialized = await this.#initialize()
    this.#dataset = initialized
    return structuredClone(initialized)
  }

  /** 新增 ID 唯一的事件，并将目标 shard 与数量 metadata 作为同一原子批次写入。 */
  async addEvent(event: InspectionEvent): Promise<boolean> {
    const dataset = await this.#ensureDataset()
    if (dataset.events.some(({ id }) => id === event.id)) return false

    const shardIndex = getEventShardIndex(event.id)
    const shard = dataset.events.filter(
      (currentEvent) => getEventShardIndex(currentEvent.id) === shardIndex,
    )
    shard.push(structuredClone(event))
    const metadata = this.#createUpdatedMetadata(dataset.metadata, dataset.events.length + 1, true)
    await this.#store.setMany([
      [getEventShardKey(shardIndex), shard],
      [METADATA_KEY, metadata],
    ])
    this.#dataset = {
      ...dataset,
      metadata,
      events: mergeEventShards(partitionEventsByShard([...dataset.events, event])),
      storageState: this.state,
    }
    return true
  }

  /** 编辑非状态业务字段；事件不存在时不写入并返回 null。 */
  async updateEvent(
    eventId: string,
    changes: InspectionEventEditableFields,
  ): Promise<InspectionEvent | null> {
    const dataset = await this.#ensureDataset()
    const eventIndex = dataset.events.findIndex(({ id }) => id === eventId)
    const currentEvent = dataset.events[eventIndex]
    if (!currentEvent) return null

    const updatedEvent: InspectionEvent = { ...currentEvent, ...changes }
    const nextEvents = [...dataset.events]
    nextEvents[eventIndex] = updatedEvent
    const shardIndex = getEventShardIndex(eventId)
    const shard = nextEvents.filter((event) => getEventShardIndex(event.id) === shardIndex)
    const metadata = this.#createUpdatedMetadata(dataset.metadata, dataset.events.length, true)
    const activity = await this.#createActivityMutation(eventId, 'EDITED', '事件资料已更新')
    await this.#store.setMany([
      [getEventShardKey(shardIndex), shard],
      [METADATA_KEY, metadata],
      ...activity.entries,
    ])
    this.#dataset = { ...dataset, metadata, events: nextEvents, storageState: this.state }
    return structuredClone(updatedEvent)
  }

  /** 分派或转派事件；空白人员名称和不存在的事件均拒绝写入。 */
  async setAssignee(eventId: string, assignee: string): Promise<boolean> {
    const dataset = await this.#ensureDataset()
    if (!dataset.events.some(({ id }) => id === eventId)) return false
    const normalizedAssignee = assignee.trim()
    if (!normalizedAssignee) return false

    const activity = await this.#createActivityMutation(
      eventId,
      'ASSIGNED',
      `任务已分派给 ${normalizedAssignee}`,
    )
    const metadata = this.#createUpdatedMetadata(dataset.metadata, dataset.events.length)
    await this.#store.setMany([
      [this.#assigneeKey(eventId), normalizedAssignee],
      [METADATA_KEY, metadata],
      ...activity.entries,
    ])
    this.#dataset = { ...dataset, metadata, storageState: this.state }
    return true
  }

  /** 按待处理→处理中→已完成单向推进；不存在或已完成事件返回 null。 */
  async advanceEventStatus(eventId: string): Promise<InspectionEvent | null> {
    const dataset = await this.#ensureDataset()
    const eventIndex = dataset.events.findIndex(({ id }) => id === eventId)
    const currentEvent = dataset.events[eventIndex]
    if (!currentEvent) return null
    const nextStatus = NEXT_EVENT_STATUS[currentEvent.status]
    if (!nextStatus) return null

    const updatedEvent: InspectionEvent = { ...currentEvent, status: nextStatus }
    const nextEvents = [...dataset.events]
    nextEvents[eventIndex] = updatedEvent
    const shardIndex = getEventShardIndex(eventId)
    const shard = nextEvents.filter((event) => getEventShardIndex(event.id) === shardIndex)
    const activity = await this.#createActivityMutation(
      eventId,
      'STATUS_CHANGED',
      nextStatus === 'PROCESSING' ? '事件已开始处理' : '事件已完成处置',
    )
    const metadata = this.#createUpdatedMetadata(dataset.metadata, dataset.events.length, true)
    await this.#store.setMany([
      [getEventShardKey(shardIndex), shard],
      [METADATA_KEY, metadata],
      ...activity.entries,
    ])
    this.#dataset = { ...dataset, metadata, events: nextEvents, storageState: this.state }
    return structuredClone(updatedEvent)
  }

  /** 批量推进匹配起始状态的事件，并将跨 shard 更新与各事件活动一次提交。 */
  async advanceEventStatuses(
    eventIds: readonly string[],
    fromStatus: Exclude<EventStatus, 'DONE'>,
  ): Promise<InspectionEvent[]> {
    const dataset = await this.#ensureDataset()
    const targetIds = new Set(eventIds)
    const nextStatus = NEXT_EVENT_STATUS[fromStatus]
    const updatedEvents: InspectionEvent[] = []
    const nextEvents = dataset.events.map((event) => {
      if (!targetIds.has(event.id) || event.status !== fromStatus) return event
      const updatedEvent: InspectionEvent = { ...event, status: nextStatus }
      updatedEvents.push(updatedEvent)
      return updatedEvent
    })
    if (updatedEvents.length === 0) return []

    const affectedShardIndexes = [...new Set(updatedEvents.map(({ id }) => getEventShardIndex(id)))]
    const activityMutations = await Promise.all(
      updatedEvents.map(({ id }) =>
        this.#createActivityMutation(
          id,
          'STATUS_CHANGED',
          nextStatus === 'PROCESSING' ? '事件已批量开始处理' : '事件已批量完成处置',
        ),
      ),
    )
    const metadata = this.#createUpdatedMetadata(dataset.metadata, dataset.events.length, true)
    await this.#store.setMany([
      ...affectedShardIndexes.map(
        (shardIndex) =>
          [
            getEventShardKey(shardIndex),
            nextEvents.filter((event) => getEventShardIndex(event.id) === shardIndex),
          ] as const,
      ),
      [METADATA_KEY, metadata],
      ...activityMutations.flatMap(({ entries }) => entries),
    ])
    this.#dataset = { ...dataset, metadata, events: nextEvents, storageState: this.state }
    return structuredClone(updatedEvents)
  }

  /** 整体保存当前量级的区域定义；调用方传入空数组表示删除全部区域。 */
  async saveRegions(regions: readonly InspectionRegion[]): Promise<void> {
    const dataset = await this.#ensureDataset()
    const nextRegions = structuredClone([...regions])
    const metadata = this.#createUpdatedMetadata(dataset.metadata, dataset.events.length)
    await this.#store.setMany([
      [REGIONS_KEY, nextRegions],
      [METADATA_KEY, metadata],
    ])
    this.#dataset = { ...dataset, metadata, regions: nextRegions, storageState: this.state }
  }

  async listSpatialAnalyses(): Promise<SpatialAnalysisSummary[]> {
    return (await this.#store.get<SpatialAnalysisSummary[]>(ANALYSES_INDEX_KEY)) ?? []
  }

  async loadSpatialAnalysis(analysisId: string): Promise<PersistedSpatialAnalysis | null> {
    const record = await this.#store.get<PersistedSpatialAnalysis | null>(this.#analysisKey(analysisId))
    return record ? structuredClone(record) : null
  }

  /** 记录与不含大型事件 ID 集合的摘要索引在同一批次提交。 */
  async saveSpatialAnalysis(record: PersistedSpatialAnalysis): Promise<void> {
    const summaries = await this.listSpatialAnalyses()
    const summary: SpatialAnalysisSummary = {
      id: record.id,
      name: record.name,
      kind: record.kind,
      datasetScale: record.datasetScale,
      datasetVersion: record.datasetVersion,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
    const nextSummaries = [...summaries.filter(({ id }) => id !== record.id), summary].sort(
      (left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    )
    await this.#store.setMany([
      [this.#analysisKey(record.id), structuredClone(record)],
      [ANALYSES_INDEX_KEY, nextSummaries],
    ])
  }

  /** 使用 null 墓碑删除记录，并原子更新摘要索引。 */
  async removeSpatialAnalysis(analysisId: string): Promise<boolean> {
    const summaries = await this.listSpatialAnalyses()
    if (!summaries.some(({ id }) => id === analysisId)) return false
    await this.#store.setMany([
      [this.#analysisKey(analysisId), null],
      [ANALYSES_INDEX_KEY, summaries.filter(({ id }) => id !== analysisId)],
    ])
    return true
  }

  /** 读取事件增量详情；显式 null 墓碑与缺失 Key 均解释为未保存。 */
  async loadEventDetails(eventId: string): Promise<PersistedEventDetails> {
    const [assignee, activities, attachments] = await Promise.all([
      this.#store.get<string | null>(this.#assigneeKey(eventId)),
      this.#store.get<EventActivity[] | null>(this.#activitiesKey(eventId)),
      this.#store.get<PersistedEventDetails['attachments'] | null>(this.#attachmentsKey(eventId)),
    ])
    return {
      assignee: typeof assignee === 'string' ? assignee : null,
      activities: Array.isArray(activities) ? activities : [],
      attachments: Array.isArray(attachments) ? attachments : [],
    }
  }

  /** 原子保存附件元数据与 Blob；事件不存在或附件 ID 冲突时返回 false。 */
  async addAttachment(
    eventId: string,
    attachment: EventEvidenceMetadata,
    blob: Blob,
  ): Promise<boolean> {
    const dataset = await this.#ensureDataset()
    if (!dataset.events.some(({ id }) => id === eventId)) return false
    const details = await this.loadEventDetails(eventId)
    if (details.attachments.some(({ id }) => id === attachment.id)) return false

    const attachments = [...details.attachments, structuredClone(attachment)]
    const metadata = this.#createUpdatedMetadata(dataset.metadata, dataset.events.length)
    await this.#store.setMany([
      [this.#attachmentsKey(eventId), attachments],
      [this.#attachmentBlobKey(eventId, attachment.id), blob],
      [METADATA_KEY, metadata],
    ])
    this.#dataset = { ...dataset, metadata, storageState: this.state }
    return true
  }

  /** 删除附件时以 null 覆盖 Blob，避免异步删除失败留下无元数据的孤儿文件。 */
  async removeAttachment(eventId: string, attachmentId: string): Promise<boolean> {
    const dataset = await this.#ensureDataset()
    const details = await this.loadEventDetails(eventId)
    if (!details.attachments.some(({ id }) => id === attachmentId)) return false

    const attachments = details.attachments.filter(({ id }) => id !== attachmentId)
    const metadata = this.#createUpdatedMetadata(dataset.metadata, dataset.events.length)
    await this.#store.setMany([
      [this.#attachmentsKey(eventId), attachments],
      [this.#attachmentBlobKey(eventId, attachmentId), null],
      [METADATA_KEY, metadata],
    ])
    this.#dataset = { ...dataset, metadata, storageState: this.state }
    return true
  }

  /** 返回持久化 Blob；缺失 Key 或 null 墓碑统一解释为不存在。 */
  async loadAttachmentBlob(eventId: string, attachmentId: string): Promise<Blob | null> {
    const value = await this.#store.get<Blob | null>(this.#attachmentBlobKey(eventId, attachmentId))
    return value instanceof Blob ? value : null
  }

  /** 删除事件并级联清理区域引用、详情和所有附件 Blob；不存在时返回 false。 */
  async removeEvent(eventId: string): Promise<boolean> {
    const dataset = await this.#ensureDataset()
    if (!dataset.events.some(({ id }) => id === eventId)) return false

    const details = await this.loadEventDetails(eventId)
    const nextEvents = dataset.events.filter(({ id }) => id !== eventId)
    const shardIndex = getEventShardIndex(eventId)
    const shard = nextEvents.filter((event) => getEventShardIndex(event.id) === shardIndex)
    const regions = dataset.regions.map((region) => ({
      ...region,
      eventIds: region.eventIds?.filter((id) => id !== eventId) ?? null,
    }))
    const metadata = this.#createUpdatedMetadata(dataset.metadata, nextEvents.length, true)
    await this.#store.setMany([
      [getEventShardKey(shardIndex), shard],
      [REGIONS_KEY, regions],
      [METADATA_KEY, metadata],
      [this.#assigneeKey(eventId), null],
      [this.#activitiesKey(eventId), null],
      [this.#activitySequenceKey(eventId), null],
      [this.#attachmentsKey(eventId), null],
      ...details.attachments.map(
        ({ id }) => [this.#attachmentBlobKey(eventId, id), null] as const,
      ),
    ])
    this.#dataset = {
      ...dataset,
      metadata,
      events: nextEvents,
      regions,
      storageState: this.state,
    }
    return true
  }

  /** 按 ID 原子 upsert 导入事件；未出现在导入文件中的现有事件及详情保持不变。 */
  async importEvents(events: readonly InspectionEvent[]): Promise<GisEventImportResult> {
    const dataset = await this.#ensureDataset()
    const existingIds = new Set(dataset.events.map(({ id }) => id))
    const importedById = new Map<string, InspectionEvent>()
    for (const event of events) importedById.set(event.id, structuredClone(event))

    let addedCount = 0
    let overwrittenCount = 0
    for (const eventId of importedById.keys()) {
      if (existingIds.has(eventId)) overwrittenCount += 1
      else addedCount += 1
    }
    if (importedById.size === 0) return { addedCount, overwrittenCount }

    const nextEvents = dataset.events.map((event) => importedById.get(event.id) ?? event)
    for (const [eventId, event] of importedById) {
      if (!existingIds.has(eventId)) nextEvents.push(event)
    }
    const affectedShardIndexes = [...new Set([...importedById.keys()].map(getEventShardIndex))]
    const metadata = this.#createUpdatedMetadata(dataset.metadata, nextEvents.length, true)
    await this.#store.setMany([
      ...affectedShardIndexes.map(
        (shardIndex) =>
          [
            getEventShardKey(shardIndex),
            nextEvents.filter((event) => getEventShardIndex(event.id) === shardIndex),
          ] as const,
      ),
      [METADATA_KEY, metadata],
    ])
    const sortedEvents = mergeEventShards(partitionEventsByShard(nextEvents))
    this.#dataset = { ...dataset, metadata, events: sortedEvents, storageState: this.state }
    return { addedCount, overwrittenCount }
  }

  close(): void {
    this.#store.close()
  }

  async #ensureDataset(): Promise<PersistedGisDataset> {
    if (!this.#dataset) await this.loadOrInitialize()
    return this.#dataset!
  }

  #createUpdatedMetadata(
    metadata: GisDatasetMetadata,
    currentEventCount: number,
    eventCollectionChanged = false,
  ): GisDatasetMetadata {
    return {
      ...metadata,
      currentEventCount,
      datasetVersion: metadata.datasetVersion + (eventCollectionChanged ? 1 : 0),
      updatedAt: this.#now().toISOString(),
    }
  }

  async #createActivityMutation(
    eventId: string,
    type: EventActivityType,
    description: string,
  ): Promise<{ activity: EventActivity; entries: Array<readonly [string, unknown]> }> {
    const [storedSequence, storedActivities] = await Promise.all([
      this.#store.get<number | null>(this.#activitySequenceKey(eventId)),
      this.#store.get<EventActivity[] | null>(this.#activitiesKey(eventId)),
    ])
    const activities = Array.isArray(storedActivities) ? storedActivities : []
    // 序号 Key 是跨刷新真值；兼容旧数据缺少序号时，以现有活动数量作为安全下界。
    const nextSequence = Math.max(
      typeof storedSequence === 'number' ? storedSequence : 0,
      activities.length,
    ) + 1
    const activity: EventActivity = {
      id: `${eventId}-activity-${nextSequence}`,
      type,
      description,
      occurredAt: this.#now().toISOString(),
    }
    return {
      activity,
      entries: [
        [this.#activitiesKey(eventId), [...activities, activity]],
        [this.#activitySequenceKey(eventId), nextSequence],
      ],
    }
  }

  #assigneeKey(eventId: string): string {
    return `event:${eventId}:assignee`
  }

  #activitiesKey(eventId: string): string {
    return `event:${eventId}:activities`
  }

  #activitySequenceKey(eventId: string): string {
    return `event:${eventId}:activity-sequence`
  }

  #attachmentsKey(eventId: string): string {
    return `event:${eventId}:attachments`
  }

  #attachmentBlobKey(eventId: string, attachmentId: string): string {
    return `event:${eventId}:attachment:${attachmentId}:blob`
  }

  #analysisKey(analysisId: string): string {
    return `analysis:${analysisId}`
  }

  #isCurrentMetadata(metadata: GisDatasetMetadata): boolean {
    return (
      metadata.scale === this.#scale &&
      metadata.fixtureVersion === this.#fixtureVersion &&
      metadata.shardCount === GIS_EVENT_SHARD_COUNT
    )
  }

  async #restore(metadata: GisDatasetMetadata): Promise<PersistedGisDataset | null> {
    const shards = await Promise.all(
      Array.from({ length: GIS_EVENT_SHARD_COUNT }, (_, index) =>
        this.#store.get<InspectionEvent[]>(getEventShardKey(index)),
      ),
    )
    const regions = await this.#store.get<InspectionRegion[]>(REGIONS_KEY)
    if (shards.some((shard) => !Array.isArray(shard)) || !Array.isArray(regions)) return null

    const normalizedMetadata = { ...metadata, datasetVersion: metadata.datasetVersion ?? 1 }
    if (metadata.datasetVersion === undefined) await this.#store.set(METADATA_KEY, normalizedMetadata)
    return {
      metadata: normalizedMetadata,
      events: mergeEventShards(shards as InspectionEvent[][]),
      regions,
      storageState: this.state,
    }
  }

  async #initialize(): Promise<PersistedGisDataset> {
    // 先清空失效版本；后续 setMany 将 metadata 与全部 shard 同批提交，失败时不会留下完成标记。
    await this.#store.clear()
    const events = generateInspectionEvents(getDatasetSize(this.#scale))
    const shards = partitionEventsByShard(events)
    const timestamp = this.#now().toISOString()
    const metadata: GisDatasetMetadata = {
      scale: this.#scale,
      currentEventCount: events.length,
      fixtureVersion: this.#fixtureVersion,
      datasetVersion: 1,
      shardCount: GIS_EVENT_SHARD_COUNT,
      initializedAt: timestamp,
      updatedAt: timestamp,
    }
    const regions = structuredClone(mockInspectionRegions)
    await this.#store.setMany([
      [METADATA_KEY, metadata],
      [REGIONS_KEY, regions],
      ...shards.map((shard, index) => [getEventShardKey(index), shard] as const),
    ])
    return { metadata, events, regions, storageState: this.state }
  }
}
