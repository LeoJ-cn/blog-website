import type { ModelConfig, ShapeOptions } from '@antv/g6'
import { resolveLogicEditorAsset } from '../../icon-map'
import { AnchorTag, type AnchorBaseConfigWithPosition, type IG6, type IIGroup, type IModelConfig, INodeConfig, type IShapeOptions } from '../../../interface'
import { BlockNames_DTS } from '../../../service/interface'

export default (G6: IG6) => {
  const itemType = BlockNames_DTS.LOGIC_LIFECYCLE_NODE
  const nodeDefinition: IShapeOptions = {
    itemType,
    calcNodeHeight(cfg: INodeConfig) {
      if (!cfg) return
      cfg.nodeWidth = 210
      cfg.nodeHeight = 44 + Math.max(cfg.data?.anchors?.length || 0, 1) * 30 + 15
    },
    assembleShape(cfg: IModelConfig, group: IIGroup) {
      if (!cfg || !group) return
      cfg.nodeWidth = cfg.nodeWidth || 210
      cfg.nodeHeight = cfg.nodeHeight || 149
      const offsetX = -cfg.nodeWidth / 2
      const offsetY = -cfg.nodeHeight / 2
      const anchors = cfg.data?.anchors || []

      group.addShape('rect', {
        attrs: {
          x: offsetX + 1, y: offsetY + 1, width: cfg.nodeWidth - 2, height: 44,
          fill: '#F2F8FF', cursor: 'move', radius: [12, 12, 0, 0],
        },
        draggable: true,
      })
      group.addShape('image', {
        attrs: {
          x: offsetX + 17, y: offsetY + 13, width: 20, height: 20,
          img: resolveLogicEditorAsset('../../img/lifecycle.svg'), cursor: 'pointer',
        },
      })
      group.addShape('text', {
        attrs: {
          x: offsetX + 48, y: offsetY + 22, fontSize: 14, text: '生命周期',
          fill: 'rgba(0,0,0,.85)', fontWeight: 'bolder', textBaseline: 'middle', textAlign: 'start',
        },
        draggable: true,
      })
      group.addShape('image', {
        attrs: {
          x: offsetX + 177, y: offsetY + 14, width: 16, height: 16,
          img: resolveLogicEditorAsset('../../img/help.svg'), cursor: 'pointer',
        },
        name: 'right-help',
      })
      anchors.forEach((anchor, index) => {
        group.addShape('text', {
          attrs: {
            x: offsetX + 170, y: offsetY + 67 + index * 30, fontSize: 12,
            text: anchor.data.label, fill: 'rgba(0,0,0,.85)', textBaseline: 'middle', textAlign: 'end',
          },
        })
        group.addShape('image', {
          attrs: {
            x: offsetX + 180, y: offsetY + 59 + index * 30, width: 16, height: 16,
            img: resolveLogicEditorAsset(`../../img/statement_anchor${anchor.connected ? '' : '_light'}.svg`),
            cursor: 'pointer',
          },
          name: anchor.data.value,
          anchorTag: AnchorTag.STATEMENT_OUTPUT,
          anchorIndex: index,
        })
      })
      group.sort()
    },
    getAnchorPoints(cfg?: ModelConfig): AnchorBaseConfigWithPosition[] {
      if (!cfg) return []
      const nodeConfig = cfg as INodeConfig
      const height = nodeConfig.nodeHeight || 149
      return (nodeConfig.data?.anchors || []).map((anchor, index) => [1, (67 + index * 30) / height, anchor])
    },
  }
  G6.registerNode(itemType, nodeDefinition as ShapeOptions, BlockNames_DTS.LOGIC_BASE_NODE)
}
