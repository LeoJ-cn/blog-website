export { MapManager } from './map/MapManager'
export { LayerManager } from './map/LayerManager'
export { default as GisManagementDemo } from './components/GisManagementDemo.vue'
export { useGisStore } from './stores/gis'
export { generateInspectionEvents } from './mock/generate-events'
export { mockInspectionRegions } from './mock/regions'
export type { MapManagerOptions, MapStats, RenderMode } from './map/MapManager'
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
