export { MapManager } from './map/MapManager'
export { LayerManager } from './map/LayerManager'
export { default as GisManagementDemo } from './components/GisManagementDemo.vue'
export { useGisStore } from './stores/gis'
export { generateInspectionEvents } from './mock/generate-events'
export { createMockViewportEventService } from './viewport/mock-viewport-event-service'
export { ViewportQueryController } from './viewport/viewport-query-controller'
export { calculateWgs84ViewportBbox } from './map/viewport-bbox'
export { mockInspectionRegions } from './mock/regions'
export {
  parseInspectionEventsGeoJson,
  serializeInspectionEventsToGeoJson,
} from './services/export-events'
export type { MapManagerOptions, MapStats, RenderMode } from './map/MapManager'
export type { EventSourceDiffStats } from './map/sources/sync-event-source'
export type { CoreLayerId } from './map/LayerManager'
export type { DrawGeometryType, MapMode } from './map/interactions/SpatialInteractionManager'
export type {
  EventLevel,
  EventActivity,
  EventActivityType,
  EventStatus,
  EventType,
  InspectionEvent,
  InspectionEventFilter,
} from './types/inspection-event'
export type { TrackPlaybackSpeed, TrackPlaybackStatus, TrackPoint } from './types/track'
export type { InspectionRegion, RegionGeometry, Wgs84Coordinate } from './types/region'
export type {
  InspectionEventGeoJson,
  InspectionEventGeoJsonFeature,
  InspectionEventGeoJsonImportResult,
} from './services/export-events'
export type {
  ViewportDatasetBuildStats,
  ViewportEventQuery,
  ViewportEventQueryResult,
  ViewportEventService,
  ViewportQueryParams,
  ViewportQueryState,
  ViewportQueryStatus,
  Wgs84Bbox,
} from './viewport/types'
export type { MockViewportEventServiceOptions } from './viewport/mock-viewport-event-service'
export type { ViewportQueryControllerOptions } from './viewport/viewport-query-controller'
