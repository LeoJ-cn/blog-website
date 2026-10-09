import VectorLayer from 'ol/layer/Vector.js'
import type VectorSource from 'ol/source/Vector.js'
import type { EventFeature } from '../sources/create-event-source'
import { getEventStyle } from '../styles/event-style'
import type { EventFeatureProperties } from '../types/event-feature'

export function createEventLayer(source: VectorSource<EventFeature>) {
  return new VectorLayer<VectorSource<EventFeature>>({
    properties: { layerId: 'event' },
    source,
    style: (feature) => {
      const status = feature.get('status') as EventFeatureProperties['status'] | undefined
      return getEventStyle(status ?? 'PENDING')
    },
    zIndex: 10,
  })
}
