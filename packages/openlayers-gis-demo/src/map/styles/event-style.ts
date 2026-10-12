import CircleStyle from 'ol/style/Circle.js' // OpenLayers 圆形点符号，用于绘制事件点位。
import Fill from 'ol/style/Fill.js' // OpenLayers 填充样式，控制点符号内部颜色。
import Stroke from 'ol/style/Stroke.js' // OpenLayers 描边样式，控制点符号边线颜色与宽度。
import Style from 'ol/style/Style.js' // OpenLayers 要素样式容器，组合图形的填充和描边配置。
import type { EventStatus } from '../../types/inspection-event'
import { EVENT_SELECTION_COLOR, EVENT_STATUS_VISUALS } from './event-visual'

// Style 函数会在渲染循环中高频调用，按处置状态复用实例以避免产生短生命周期对象。
const EVENT_STYLE_CACHE = new Map<EventStatus, Style>()

export const selectedEventStyle = new Style({
  // image 指定点要素的图像符号；CircleStyle.radius 单位为屏幕像素，不随地图缩放改变。
  image: new CircleStyle({
    radius: 13,
    // Stroke.color 接收 CSS 颜色，width 单位为屏幕像素。
    stroke: new Stroke({ color: EVENT_SELECTION_COLOR, width: 3 }),
  }),
  // zIndex 控制同一渲染批次的样式绘制顺序，数值越大越靠上。
  zIndex: 100,
})

export function getEventStyle(status: EventStatus): Style {
  const cachedStyle = EVENT_STYLE_CACHE.get(status)
  if (cachedStyle) return cachedStyle

  const style = new Style({
    // CircleStyle 作为点 Feature 的渲染图像；radius=6 表示 6px 半径。
    image: new CircleStyle({
      radius: 6,
      // Fill.color 控制内部颜色，Stroke 同时设置白色边线及 1.5px 宽度。
      fill: new Fill({ color: EVENT_STATUS_VISUALS[status].color }),
      stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
    }),
  })
  EVENT_STYLE_CACHE.set(status, style)
  return style
}
