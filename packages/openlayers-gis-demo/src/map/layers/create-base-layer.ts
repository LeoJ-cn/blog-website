import { getTopLeft, getWidth } from 'ol/extent.js' // 读取投影范围的左上角原点与水平跨度，用于构造瓦片矩阵。
import LayerGroup from 'ol/layer/Group.js' // OpenLayers 图层组，将底图和中文注记作为一个基础图层管理。
import TileLayer from 'ol/layer/Tile.js' // OpenLayers 瓦片图层，负责渲染 WMTS 返回的图片瓦片。
import { get as getProjection } from 'ol/proj.js' // 按 EPSG 编码获取 OpenLayers 已注册的投影定义。
import WMTS from 'ol/source/WMTS.js' // OpenLayers WMTS 数据源，根据视口和瓦片矩阵生成 GetTile 请求。
import WMTSTileGrid from 'ol/tilegrid/WMTS.js' // OpenLayers WMTS 瓦片网格，描述各级矩阵编号、分辨率和原点。

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

  // LayerGroup 将 layers 作为一个整体参与显隐和层级管理；properties 保存业务 ID，zIndex=0 固定在底层。
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
  // WMTS 配置描述 GetTile 协议：layer/matrixSet/style 对应服务能力文档中的同名标识。
  const source = new WMTS({
    // attributions 显示数据版权；crossOrigin=anonymous 允许无凭据跨域加载并保持 Canvas 可导出。
    attributions: '国家地理信息公共服务平台 天地图',
    crossOrigin: 'anonymous',
    // format 是服务声明的瓦片格式；layer 在 vec 矢量底图与 cva 中文注记之间切换。
    format: 'tiles',
    layer: layerCode,
    // matrixSet=w 与 projection=EPSG:3857 必须和 TileGrid、View 使用同一坐标体系。
    matrixSet: WEB_MERCATOR_MATRIX_SET,
    projection: WEB_MERCATOR_CODE,
    // KVP 让 Source 把 WMTS 参数拼入查询串；style 使用服务端默认样式标识。
    requestEncoding: 'KVP',
    style: 'default',
    // tileGrid 提供矩阵编号和分辨率；urls 提供 t0～t7 负载均衡端点。
    tileGrid: TIANDITU_TILE_GRID,
    urls: Array.from({ length: TIANDITU_SUBDOMAIN_COUNT }, (_, index) =>
      createTiandituEndpoint(index, layerCode, token),
    ),
    // version 指定 WMTS 规范版本；wrapX=true 允许底图在日期变更线外横向连续重复。
    version: '1.0.0',
    wrapX: true,
  })
  let loadErrorReported = false
  // on(eventType, listener) 订阅瓦片失败事件并返回监听句柄；此处生命周期跟随 Source，无需单独解绑。
  source.on('tileloaderror', () => {
    if (loadErrorReported) return
    loadErrorReported = true
    onLoadError?.()
  })

  // TileLayer.className 写入渲染容器 CSS 类；source 提供瓦片；zIndex 决定 vec 与 cva 的上下顺序。
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
  // getProjection(code) 查询已注册投影；getExtent() 返回 [minX, minY, maxX, maxY] 有效范围。
  const projection = getProjection(WEB_MERCATOR_CODE)
  const extent = projection?.getExtent()
  if (!extent) {
    throw new Error('OpenLayers 缺少 EPSG:3857 投影范围，无法创建天地图 WMTS 瓦片矩阵')
  }

  // getWidth(extent) 返回投影范围宽度；除以 256px 得到 0 级每像素覆盖的投影单位。
  const baseResolution = getWidth(extent) / TILE_SIZE
  const zoomLevels = Array.from({ length: TIANDITU_MAX_ZOOM + 1 }, (_, zoom) => zoom)

  // 天地图 `_w` 矩阵集采用 EPSG:3857：左上角为原点，矩阵编号为 0～18，瓦片尺寸为 256px。
  return new WMTSTileGrid({
    // extent 限制矩阵覆盖范围；matrixIds 按缩放索引对应服务端 TileMatrix 编号。
    extent,
    matrixIds: zoomLevels.map(String),
    // origin 是左上角切片起点；resolutions 是每级每像素覆盖的投影单位；tileSize 单位为像素。
    origin: getTopLeft(extent),
    resolutions: zoomLevels.map((zoom) => baseResolution / 2 ** zoom),
    tileSize: TILE_SIZE,
  })
}
