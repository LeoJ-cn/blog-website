import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import Fill from 'ol/style/Fill.js'
import RegularShape from 'ol/style/RegularShape.js'
import Stroke from 'ol/style/Stroke.js'
import Style from 'ol/style/Style.js'

export function createEventDraftLayer() {
  const outerFill = new Fill({ color: 'rgba(250, 204, 21, 0.45)' })
  const outerStroke = new Stroke({ color: 'rgba(234, 179, 8, 0.9)', width: 2 })
  // 高亮黄色突出“尚未保存”的临时位置，六边形轮廓用于区别圆形业务状态点。
  const eventDraftStyle = [
    new Style({
      image: new RegularShape({
        points: 6,
        radius: 14,
        angle: Math.PI / 6,
        fill: outerFill,
        stroke: outerStroke,
      }),
    }),
    new Style({
      image: new RegularShape({
        points: 6,
        radius: 6,
        angle: Math.PI / 6,
        fill: new Fill({ color: '#facc15' }),
        stroke: new Stroke({ color: '#713f12', width: 2 }),
      }),
    }),
  ]
  // 临时选点始终复用一个 Feature；空 Geometry 表示当前没有待保存位置。
  const draftFeature = new Feature<Point>()
  const source = new VectorSource({ features: [draftFeature], wrapX: false })
  const layer = new VectorLayer({
    properties: { layerId: 'eventDraft' },
    source,
    style: eventDraftStyle,
    // 高于选中高亮，确保表单中的待保存位置拥有最明确的视觉反馈。
    zIndex: 50,
  })
  let animationFrameId: number | null = null
  let animationStartedAt = 0

  function animate(timestamp: number) {
    // 一个呼吸周期为 1100 毫秒，透明度使用正弦曲线平滑往返，避免高频闪烁造成干扰。
    const progress = ((timestamp - animationStartedAt) % 1100) / 1100
    const strength = (Math.sin(progress * Math.PI * 2 - Math.PI / 2) + 1) / 2
    outerFill.setColor(`rgba(250, 204, 21, ${0.2 + strength * 0.5})`)
    outerStroke.setColor(`rgba(234, 179, 8, ${0.5 + strength * 0.5})`)
    layer.changed()
    animationFrameId = requestAnimationFrame(animate)
  }

  function startPulse() {
    if (animationFrameId !== null) return
    // 尊重操作系统的减少动态效果偏好，此时保留静态高对比六边形。
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    animationStartedAt = performance.now()
    animationFrameId = requestAnimationFrame(animate)
  }

  function stopPulse() {
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
    animationFrameId = null
    outerFill.setColor('rgba(250, 204, 21, 0.45)')
    outerStroke.setColor('rgba(234, 179, 8, 0.9)')
    layer.changed()
  }

  return { layer, source, draftFeature, startPulse, stopPulse }
}
