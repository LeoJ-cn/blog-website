import VectorLayer from 'ol/layer/Vector.js' // OpenLayers 矢量图层，绘制用户创建的空间区域。
import VectorSource from 'ol/source/Vector.js' // OpenLayers 矢量数据源，保存区域 Feature 并支持交互修改。
import Fill from 'ol/style/Fill.js' // OpenLayers 填充样式，控制区域内部的半透明颜色。
import Stroke from 'ol/style/Stroke.js' // OpenLayers 描边样式，控制区域边界颜色与宽度。
import Style from 'ol/style/Style.js' // OpenLayers 要素样式容器，组合区域填充与边界样式。

/** 创建供 Draw/Modify 共用的区域 Source 与虚线面图层。 */
export function createRegionLayer() {
  // wrapX=false 禁止用户绘制区域在世界地图横向副本中重复出现。
  const source = new VectorSource({ wrapX: false })
  // VectorLayer 监听 source 变化并使用固定样式绘制区域 Feature。
  const layer = new VectorLayer({
    // properties 保存业务图层标识；source 提供 Draw/Modify 与渲染共享的数据。
    properties: { layerId: 'region' },
    source,
    // Style.fill 控制面填充，Style.stroke 控制边界线。
    style: new Style({
      fill: new Fill({ color: '#38bdf826' }),
      // lineDash 按 [实线像素长度, 间隔像素长度] 排列，突出可编辑区域边界。
      stroke: new Stroke({ color: '#38bdf8', width: 2, lineDash: [8, 5] }),
    }),
    // zIndex=20 使区域位于事件层之上、选择高亮层之下。
    zIndex: 20,
  })
  return { layer, source }
}
