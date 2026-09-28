import { resolveLogicEditorAsset } from '../../icon-map';
import { IGroup, ShapeOptions } from '@antv/g6';
import { AnchorBaseConfigWithPosition, AnchorTag, IG6, INodeConfig, IShapeOptions } from '../../../interface';
import { BlockNames_DTS } from '../../../service/interface';

export default (G6: IG6) => {

  const itemType = BlockNames_DTS.LOGIC_NEXT_TICK_NODE;
  const nodeDefinition: IShapeOptions = {
    itemType: itemType,

    calcNodeHeight(cfg?: INodeConfig) {
      cfg.nodeWidth = 220;
      cfg.nodeHeight = 134;
    },

    assembleShape(cfg?: INodeConfig, group?: IGroup) {
      const offsetX = -cfg.nodeWidth / 2;
      const offsetY = -cfg.nodeHeight / 2;

      group.addShape('rect', {
        attrs: {
          x: offsetX + 1,
          y: offsetY + 1,
          width: cfg.nodeWidth - 2,
          height: 44,
          fill: '#F2F8FF',
          cursor: 'move',
          radius: [12, 12, 0, 0],
        },
        draggable: true,
      });

      group.addShape('image', {
        attrs: {
          x: offsetX + 17,
          y: offsetY + 13,
          width: 20,
          height: 20,
          img: resolveLogicEditorAsset('../../img/next-tick.svg'),
          cursor: 'pointer',
        },
      });

      group.addShape('text', {
        attrs: {
          x: offsetX + 48,
          y: offsetY + 22,
          fontSize: 14,
          lineHeight: 20,
          text: '下次渲染结束执行',
          fill: 'rgba(0,0,0,.85)',
          fontWeight: 'bolder',
          textBaseline: 'middle',
          textAlign: 'start',
          cursor: 'move',
        },
        draggable: true,
        name: 'title',
      });

      group.addShape('image', {
        attrs: {
          x: offsetX + 187,
          y: offsetY + 14,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset('../../img/help.svg'),
          cursor: 'pointer',
        },
        name: 'right-help',
      });

      //  逻辑输入
      group.addShape('text', {
        attrs: {
          x: offsetX + 40,
          y: offsetY + 72,
          text: '输入',
          fill: 'black',
          fontSize: 12,
          lineHeight: 20,
          opacity: 0.85,
          textBaseline: 'middle',
          textAlign: 'start',
          cursor: 'pointer',
        },
        name: 'title',
      });

      group.addShape('image', {
        attrs: {
          x: offsetX + 19,
          y: offsetY + 64,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset(`../../img/statement_anchor${cfg.data.anchors[0].connected ? '' : '_light'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.STATEMENT_INPUT,
        anchorIndex: 0,
        name: 'output-cursor-img',
      });

      // 逻辑输出
      group.addShape('text', {
        attrs: {
          x: offsetX + 185,
          y: offsetY + 72,
          text: '输出',
          fill: 'black',
          fontSize: 12,
          lineHeight: 20,
          opacity: 0.85,
          textBaseline: 'middle',
          textAlign: 'end',
          cursor: 'pointer',
        },
        name: 'title',
      });

      group.addShape('image', {
        attrs: {
          x: offsetX + 190,
          y: offsetY + 64,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset(`../../img/statement_anchor${cfg.data.anchors[1].connected ? '' : '_light'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.STATEMENT_OUTPUT,
        anchorIndex: 1,
        name: 'output-cursor-img',
      });

      // 返回值
      group.addShape('text', {
        attrs: {
          x: offsetX + 185,
          y: offsetY + 106,
          text: '子方法体',
          fill: 'black',
          fontSize: 12,
          lineHeight: 20,
          opacity: 0.85,
          textBaseline: 'middle',
          textAlign: 'end',
          cursor: 'pointer',
        },
        name: 'title',
      });
      group.addShape('image', {
        attrs: {
          x: offsetX + 193,
          y: offsetY + 98,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset(`../../img/params_undefined${cfg.data.anchors[2]?.connected ? '' : '_inactive'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.VAR_OUTPUT,
        anchorIndex: 2,
      });
      group.sort();
    },

    getAnchorPoints(cfg: INodeConfig): AnchorBaseConfigWithPosition[] {
      const nodeConfigData = cfg.data;
      const anchors = nodeConfigData.anchors;
      return [
        [0, 72 / cfg.nodeHeight, anchors[0]],
        [1, 72 / cfg.nodeHeight, anchors[1]],
        [1, 106 / cfg.nodeHeight, anchors[2]],
      ];
    },
  }

  G6.registerNode(itemType, nodeDefinition as ShapeOptions, BlockNames_DTS.LOGIC_BASE_NODE);
};
