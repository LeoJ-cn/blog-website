import { getTopLeft, getWidth } from 'ol/extent.js'
import LayerGroup from 'ol/layer/Group.js'
import TileLayer from 'ol/layer/Tile.js'
import { get as getProjection } from 'ol/proj.js'
import WMTS from 'ol/source/WMTS.js'
import WMTSTileGrid from 'ol/tilegrid/WMTS.js'

const TIANDITU_SUBDOMAIN_COUNT = 8
const TIANDITU_MAX_ZOOM = 18
const TILE_SIZE = 256
const WEB_MERCATOR_CODE = 'EPSG:3857'
const WEB_MERCATOR_MATRIX_SET = 'w'
const TIANDITU_TILE_GRID = createTiandituTileGrid()

export interface CreateBaseLayerOptions {
  /** 天地图浏览器端应用 Token；空值时保留空底图组，由宿主展示配置提示。 */
  token: string
  /** 任一底图瓦片加载失败时只通知一次，回调不得包含或输出 Token。 */
  onLoadError?: () => void
}

type TiandituLayerCode = 'vec' | 'cva'

/**
 * 创建天地图墨卡托矢量底图与中文注记图层组。
 * `_w` 服务使用 Web Mercator，与当前 OpenLayers View 和业务坐标转换链路一致。
 */
export function createBaseLayer(options: CreateBaseLayerOptions): LayerGroup {
  const token = options.token.trim()
  const layers = token
    ? [
        createTiandituTileLayer('vec', token, 0, options.onLoadError),
        createTiandituTileLayer('cva', token, 1, options.onLoadError),
      ]
    : []

  return new LayerGroup({
    properties: { layerId: 'base' },
    layers,
    zIndex: 0,
  })
}

function createTiandituTileLayer(
  layerCode: TiandituLayerCode,
  token: string,
  zIndex: number,
  onLoadError?: () => void,
): TileLayer<WMTS> {
  const source = new WMTS({
    attributions: '国家地理信息公共服务平台 天地图',
    crossOrigin: 'anonymous',
    format: 'tiles',
    layer: layerCode,
    matrixSet: WEB_MERCATOR_MATRIX_SET,
    projection: WEB_MERCATOR_CODE,
    requestEncoding: 'KVP',
    style: 'default',
    tileGrid: TIANDITU_TILE_GRID,
    urls: Array.from({ length: TIANDITU_SUBDOMAIN_COUNT }, (_, index) =>
      createTiandituEndpoint(index, layerCode, token),
    ),
    version: '1.0.0',
    wrapX: true,
  })
  let loadErrorReported = false
  source.on('tileloaderror', () => {
    if (loadErrorReported) return
    loadErrorReported = true
    onLoadError?.()
  })

  return new TileLayer({
    className: `gis-tianditu-${layerCode}-layer`,
    source,
    zIndex,
  })
}

function createTiandituEndpoint(
  subdomain: number,
  layerCode: TiandituLayerCode,
  token: string,
): string {
  // WMTS Source 会根据 TileGrid 追加 GetTile 参数，此处仅提供服务端点与鉴权信息。
  return `https://t${subdomain}.tianditu.gov.cn/${layerCode}_w/wmts?tk=${encodeURIComponent(token)}`
}

function createTiandituTileGrid(): WMTSTileGrid {
  const projection = getProjection(WEB_MERCATOR_CODE)
  const extent = projection?.getExtent()
  if (!extent) {
    throw new Error('OpenLayers 缺少 EPSG:3857 投影范围，无法创建天地图 WMTS 瓦片矩阵')
  }

  const baseResolution = getWidth(extent) / TILE_SIZE
  const zoomLevels = Array.from({ length: TIANDITU_MAX_ZOOM + 1 }, (_, zoom) => zoom)

  // 天地图 `_w` 矩阵集采用 EPSG:3857：左上角为原点，矩阵编号为 0～18，瓦片尺寸为 256px。
  return new WMTSTileGrid({
    extent,
    matrixIds: zoomLevels.map(String),
    origin: getTopLeft(extent),
    resolutions: zoomLevels.map((zoom) => baseResolution / 2 ** zoom),
    tileSize: TILE_SIZE,
  })
}
