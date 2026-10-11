import TileLayer from 'ol/layer/Tile.js'
import OSM from 'ol/source/OSM.js'

export function createBaseLayer() {
  return new TileLayer({
    properties: { layerId: 'base' },
    // 独立 className 让宿主仅调整本 GIS 底图的视觉，不影响其他 OpenLayers 页面。
    className: 'gis-dark-base-layer',
    source: new OSM({ crossOrigin: 'anonymous' }),
    zIndex: 0,
  })
}
