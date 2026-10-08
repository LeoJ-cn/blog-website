import TileLayer from 'ol/layer/Tile.js'
import OSM from 'ol/source/OSM.js'

export function createBaseLayer() {
  return new TileLayer({
    properties: { layerId: 'base' },
    source: new OSM({ crossOrigin: 'anonymous' }),
    zIndex: 0,
  })
}
