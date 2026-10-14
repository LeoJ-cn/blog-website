import Feature from 'ol/Feature.js'
import Circle from 'ol/geom/Circle.js'
import LineString from 'ol/geom/LineString.js'
import Point from 'ol/geom/Point.js'
import Polygon from 'ol/geom/Polygon.js'
import { fromLonLat } from 'ol/proj.js'
import type VectorSource from 'ol/source/Vector.js'
import type { InspectionEvent } from '../types/inspection-event'
import type { AnalysisGeometry, SpatialAnalysisResult } from '../types/spatial-analysis'

function createGeometry(geometry: AnalysisGeometry) {
  if (geometry.type === 'Point') return new Point(fromLonLat([...geometry.coordinates]))
  if (geometry.type === 'LineString') return new LineString(geometry.coordinates.map((coordinate) => fromLonLat([...coordinate])))
  if (geometry.type === 'Polygon') return new Polygon(geometry.rings.map((ring) => ring.map((coordinate) => fromLonLat([...coordinate]))))
  const center = fromLonLat([...geometry.center])
  const projectionScale = Math.max(Math.cos((geometry.center[1] * Math.PI) / 180), 0.01)
  return new Circle(center, geometry.radiusMeters / projectionScale)
}

/** 统一改写三个分析 Source，确保分析表达不修改原始事件 Feature。 */
export class AnalysisLayerManager {
  constructor(
    private readonly inputSource: VectorSource,
    private readonly resultSource: VectorSource,
    private readonly highlightSource: VectorSource,
  ) {}

  showInput(geometry: AnalysisGeometry): void {
    this.inputSource.clear()
    this.inputSource.addFeature(new Feature({ geometry: createGeometry(geometry) }))
  }

  showResult(result: SpatialAnalysisResult): void {
    this.resultSource.clear()
    const geometries: AnalysisGeometry[] = []
    if ('geometry' in result) geometries.push(result.geometry)
    if (result.kind === 'REGION_COMPARISON') geometries.push(result.geometryA, result.geometryB)
    this.resultSource.addFeatures(geometries.map((geometry) => new Feature({ geometry: createGeometry(geometry) })))
  }

  setHighlightEvents(events: readonly InspectionEvent[]): void {
    this.highlightSource.clear()
    this.highlightSource.addFeatures(events.slice(0, 2_000).map((event) => new Feature({ geometry: new Point(fromLonLat([event.lng, event.lat])) })))
  }

  clear(): void {
    this.inputSource.clear()
    this.resultSource.clear()
    this.highlightSource.clear()
  }
}
