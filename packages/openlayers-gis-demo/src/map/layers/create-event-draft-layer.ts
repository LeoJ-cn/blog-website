import Feature from 'ol/Feature.js' // OpenLayers 要素容器，用于承载临时选点几何与状态。
import Point from 'ol/geom/Point.js' // OpenLayers 点几何，保存事件草稿的投影坐标。
import VectorLayer from 'ol/layer/Vector.js' // OpenLayers 矢量图层，将草稿标记绘制在地图上层。
import VectorSource from 'ol/source/Vector.js' // OpenLayers 矢量数据源，仅保存当前草稿要素。
import Fill from 'ol/style/Fill.js' // OpenLayers 填充样式，控制草稿标记内部颜色。
import RegularShape from 'ol/style/RegularShape.js' // OpenLayers 规则形状符号，用于绘制可旋转的菱形草稿标记。
import Stroke from 'ol/style/Stroke.js' // OpenLayers 描边样式，控制草稿标记边线和脉冲轮廓。
import Style from 'ol/style/Style.js' // OpenLayers 要素样式容器，组合草稿标记的图形样式。

/** 创建单要素草稿图层及呼吸动画控制器；调用方销毁前必须 stopPulse。 */
export function createEventDraftLayer() {
  // Fill.color 与 Stroke.color 接收 CSS 颜色；Stroke.width 单位为屏幕像素。
  const outerFill = new Fill({ color: 'rgba(250, 204, 21, 0.45)' })
  const outerStroke = new Stroke({ color: 'rgba(234, 179, 8, 0.9)', width: 2 })
  // 高亮黄色突出“尚未保存”的临时位置，六边形轮廓用于区别圆形业务状态点。
  const eventDraftStyle = [
    new Style({
      // RegularShape.points=6 创建六边形；radius 为像素半径；angle 以弧度旋转图形。
      image: new RegularShape({
        points: 6,
        radius: 14,
        angle: Math.PI / 6,
        fill: outerFill,
        stroke: outerStroke,
      }),
    }),
    new Style({
      // 第二个 Style 叠加较小实体六边形，Style 数组会按声明顺序共同绘制。
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
  // features 注册唯一草稿要素；wrapX=false 禁止在横向世界副本中重复显示。
  const source = new VectorSource({ features: [draftFeature], wrapX: false })
  // VectorLayer.properties 保存业务 ID；style 接受 Style 数组；zIndex 控制图层叠放顺序。
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
    // setColor 原地更新样式颜色；changed() 标记 Layer 已变化并请求 OpenLayers 重新渲染。
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
    // 停止动画后恢复默认颜色，并通过 changed() 主动刷新最后一帧。
    outerFill.setColor('rgba(250, 204, 21, 0.45)')
    outerStroke.setColor('rgba(234, 179, 8, 0.9)')
    layer.changed()
  }

  return { layer, source, draftFeature, startPulse, stopPulse }
}
