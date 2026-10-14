// 运行时入口：地图编排、Vue 演示组件、业务 Store、Mock 服务与纯函数工具。
export { MapManager } from './map/MapManager'
export { LayerManager } from './map/LayerManager'
export { SpatialAnalysisController } from './analysis/spatial-analysis-controller'
export { LocalGisApi } from './api/local-gis-api'
export { default as GisManagementDemo } from './components/GisManagementDemo.vue'
export { useGisStore } from './stores/gis'
export { generateInspectionEvents } from './mock/generate-events'
export {
  DEFAULT_GIS_DATASET_SCALE,
  GIS_DATASET_SCALES,
  GIS_DATASET_SIZE_BY_SCALE,
  getDatasetSize,
  isGisDatasetScale,
} from './persistence/dataset-scale'
export { createMockViewportEventService } from './viewport/mock-viewport-event-service'
export { ViewportQueryController } from './viewport/viewport-query-controller'
export { mergeViewportQueryState, resetViewportDatasetState } from './viewport/viewport-state'
export { calculateWgs84ViewportBbox } from './map/viewport-bbox'
export { mockInspectionRegions } from './mock/regions'
export {
  parseInspectionEventsGeoJson,
  serializeInspectionEventsToGeoJson,
} from './services/export-events'
export {
  EARTH_MEAN_RADIUS_METERS,
  calculateHaversineDistanceMeters,
  calculateLineLengthMeters,
  calculatePolygonPerimeterMeters,
  calculateSphericalPolygonAreaSquareMeters,
  calculateEventRiskScore,
  createWgs84BufferPolygon,
  HIGH_RISK_SCORE_THRESHOLD,
  SpatialAnalysisService,
  validateAnalysisGeometry,
} from './services/spatial-analysis'
export type { SpatialAnalysisContext } from './services/spatial-analysis'
// 地图层公开协议：宿主只依赖稳定选项、统计、模式和业务 Layer ID。
export type { MapManagerOptions, MapStats, RenderMode } from './map/MapManager'
export type {
  SpatialAnalysisControllerState,
  SpatialAnalysisControllerStatus,
} from './analysis/spatial-analysis-controller'
export type { LocalGisApiOptions } from './api/local-gis-api'
export type {
  GisApi,
  GisApiState,
  GisEventImportResult,
  GisStorageState,
  InspectionEventEditableFields,
} from './api/types'
export type { EventSourceDiffStats } from './map/sources/sync-event-source'
export type { CoreLayerId } from './map/LayerManager'
export type { DrawGeometryType, MapMode } from './map/interactions/SpatialInteractionManager'
export type { GisDatasetScale } from './persistence/dataset-scale'
export type {
  GisDatasetMetadata,
  PersistedEventDetails,
  PersistedGisDataset,
  PersistedSpatialAnalysis,
  LoadedSpatialAnalysis,
  SpatialAnalysisSaveResult,
  SpatialAnalysisSummary,
} from './persistence/types'
// 业务领域协议：事件、轨迹和可序列化区域均不暴露 OpenLayers 运行时对象。
export type {
  EventLevel,
  EventActivity,
  EventActivityType,
  EventStatus,
  EventType,
  InspectionEvent,
  InspectionEventFilter,
} from './types/inspection-event'
export type { EventEvidenceMetadata } from './types/event-evidence'
export type { TrackPlaybackSpeed, TrackPlaybackStatus, TrackPoint } from './types/track'
export type { InspectionRegion, RegionGeometry, Wgs84Coordinate } from './types/region'
export type {
  AnalysisGeometry,
  GeometryValidationResult,
  SpatialAnalysisFailureReason,
  SpatialAnalysisInput,
  SpatialAnalysisKind,
  SpatialAnalysisResult,
  SpatialEventStatistics,
} from './types/spatial-analysis'
export type {
  InspectionEventGeoJson,
  InspectionEventGeoJsonFeature,
  InspectionEventGeoJsonImportResult,
} from './services/export-events'
// 视口查询协议：允许 Mock Service 被保持同一接口的远程 Adapter 替换。
export type {
  ViewportDatasetBuildStats,
  ViewportEventQuery,
  ViewportEventQueryResult,
  ViewportEventService,
  RestorableViewportEventService,
  ViewportQueryParams,
  ViewportQueryState,
  ViewportQueryStatus,
  Wgs84Bbox,
} from './viewport/types'
export type { MockViewportEventServiceOptions } from './viewport/mock-viewport-event-service'
export type { ViewportQueryControllerOptions } from './viewport/viewport-query-controller'
export type { ViewportBusinessState } from './viewport/viewport-state'
