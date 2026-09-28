import { resolveLogicEditorAsset } from '../../icon-map';
import { IGroup, ShapeOptions } from '@antv/g6';
import { AnchorTag, IG6, IModelConfig, INodeConfig, IShapeOptions } from '../../../interface';
import { BlockNames_DTS, ConstOrVariable_DTS } from '../../../service/interface';

export default (G6: IG6) => {
  const itemType = BlockNames_DTS.LOGIC_ROUTER_NODE;
  const nodeDefinition: IShapeOptions = {
    itemType: itemType,
    calcNodeHeight(cfg?: INodeConfig) {
      cfg.nodeWidth = 210;
      cfg.nodeHeight = 170;
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
          img: resolveLogicEditorAsset('../../img/router.svg'),
          cursor: 'pointer',
        },
      });

      group.addShape('text', {
        attrs: {
          x: offsetX + 48,
          y: offsetY + 22,
          fontSize: 14,
          lineHeight: 20,
          text: '页面跳转',
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
          x: offsetX + 177,
          y: offsetY + 14,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset('../../img/help.svg'),
          cursor: 'pointer',
        },
        name: 'right-help',
      });

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
      });

      //  输出
      group.addShape('text', {
        attrs: {
          x: offsetX + 175,
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
          x: offsetX + 180,
          y: offsetY + 64,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset(`../../img/statement_anchor${cfg.data.anchors[1].connected ? '' : '_light'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.STATEMENT_OUTPUT,
        anchorIndex: 1,
      });

      const paramsText = group.addShape('text', {
        attrs: {
          x: offsetX + 40,
          y: offsetY + 106,
          text: 'param参数',
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
          x: offsetX + 40 + paramsText.getBBox().width + 6,
          y: offsetY + 103,
          width: 6,
          height: 6,
          opacity: cfg.data.anchors[2].data.constOrVariable === ConstOrVariable_DTS.USE_CONST ? 1 : 0,
          img: resolveLogicEditorAsset(`../../img/circle-sm.svg`),
          cursor: 'pointer',
        },
        anchorIndex: 2,
        name: 'badge',
      });
      group.addShape('image', {
        attrs: {
          x: offsetX + 19,
          y: offsetY + 98,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset(`../../img/params_object${cfg.data.anchors[2]?.connected ? '' : '_inactive'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.VAR_INPUT,
        anchorIndex: 2,
      });


      const queryText = group.addShape('text', {
        attrs: {
          x: offsetX + 40,
          y: offsetY + 140,
          text: 'query参数',
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
          x: offsetX + 40 + queryText.getBBox().width + 6,
          y: offsetY + 137,
          width: 6,
          height: 6,
          opacity: cfg.data.anchors[3].data.constOrVariable === ConstOrVariable_DTS.USE_CONST ? 1 : 0,
          img: resolveLogicEditorAsset(`../../img/circle-sm.svg`),
          cursor: 'pointer',
        },
        anchorIndex: 3,
        name: 'badge',
      });
      group.addShape('image', {
        attrs: {
          x: offsetX + 19,
          y: offsetY + 132,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset(`../../img/params_object${cfg.data.anchors[3]?.connected ? '' : '_inactive'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.VAR_INPUT,
        anchorIndex: 3,
      });

      group.sort();
    },

    getAnchorPoints(cfg: IModelConfig): any[] {
      const nodeConfigData = cfg.data;
      const anchors = nodeConfigData.anchors;
      return [
        [0, 72 / cfg.nodeHeight, anchors[0]],
        [1, 72 / cfg.nodeHeight, anchors[1]],
        [0, 107 / cfg.nodeHeight, anchors[2]],
        [0, 142 / cfg.nodeHeight, anchors[3]],
      ];
    },
  }
  G6.registerNode(itemType, nodeDefinition as ShapeOptions, BlockNames_DTS.LOGIC_BASE_NODE);
};
