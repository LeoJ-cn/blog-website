import CircleStyle from 'ol/style/Circle.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import Style from 'ol/style/Style.js'
import type { EventStatus } from '../../types/inspection-event'
import { EVENT_SELECTION_COLOR, EVENT_STATUS_VISUALS } from './event-visual'

// Style 函数会在渲染循环中高频调用，按处置状态复用实例以避免产生短生命周期对象。
const EVENT_STYLE_CACHE = new Map<EventStatus, Style>()

export const selectedEventStyle = new Style({
  image: new CircleStyle({
    radius: 13,
    stroke: new Stroke({ color: EVENT_SELECTION_COLOR, width: 3 }),
  }),
  zIndex: 100,
})

export function getEventStyle(status: EventStatus): Style {
  const cachedStyle = EVENT_STYLE_CACHE.get(status)
  if (cachedStyle) return cachedStyle

  const style = new Style({
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: EVENT_STATUS_VISUALS[status].color }),
      stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
    }),
  })
  EVENT_STYLE_CACHE.set(status, style)
  return style
}
