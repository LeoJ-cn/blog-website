import { resolveLogicEditorAsset } from '../../icon-map';
import { IGroup, ShapeOptions } from '@antv/g6';
import { AnchorBaseConfigWithPosition, AnchorTag, IG6, INodeConfig, IShapeOptions } from '../../../interface';
import { BlockNames_DTS, ConstOrVariable_DTS } from '../../../service/interface';


export default (G6: IG6) => {

  const itemType = BlockNames_DTS.LOGIC_NET_NODE;
  const nodeDefinition: IShapeOptions = {
    itemType: itemType,
    calcNodeHeight(cfg?: INodeConfig) {
      cfg.nodeWidth = 210;
      cfg.nodeHeight = 234;
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
          img: resolveLogicEditorAsset('../../img/net.svg'),
          cursor: 'pointer',
        },
      });

      group.addShape('text', {
        attrs: {
          x: offsetX + 48,
          y: offsetY + 22,
          fontSize: 14,
          lineHeight: 20,
          text: '网络请求',
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

      // 请求地址
      const requestUrlText = group.addShape('text', {
        attrs: {
          x: offsetX + 40,
          y: offsetY + 106,
          text: '请求地址',
          fill: 'black',
          fontSize: 12,
          lineHeight: 20,
          opacity: 0.85,
          textBaseline: 'middle',
          textAlign: 'start',
          cursor: 'pointer',
        },
        name: 'request-url',
      });
      group.addShape('image', {
        attrs: {
          x: offsetX + 40 + requestUrlText.getBBox().width + 6,
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
          img: resolveLogicEditorAsset(`../../img/params_string${cfg.data.anchors[2]?.connected ? '' : '_inactive'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.VAR_INPUT,
        anchorIndex: 2,
      });

      // 数据返回
      group.addShape('text', {
        attrs: {
          x: offsetX + 175,
          y: offsetY + 106,
          text: '返回数据',
          fill: 'black',
          fontSize: 12,
          lineHeight: 20,
          opacity: 0.85,
          textBaseline: 'middle',
          textAlign: 'end',
          cursor: 'pointer',
        },
      });
      group.addShape('image', {
        attrs: {
          x: offsetX + 180,
          y: offsetY + 98,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset(`../../img/return_object${cfg.data.anchors[3]?.connected ? '' : '_inactive'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.VAR_OUTPUT,
        anchorIndex: 3,
      });

      // 请求参数
      const requestParamsText = group.addShape('text', {
        attrs: {
          x: offsetX + 40,
          y: offsetY + 140,
          text: '请求参数',
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
          x: offsetX + 40 + requestParamsText.getBBox().width + 6,
          y: offsetY + 137,
          width: 6,
          height: 6,
          opacity: cfg.data.anchors[4].data.constOrVariable === ConstOrVariable_DTS.USE_CONST ? 1 : 0,
          img: resolveLogicEditorAsset(`../../img/circle-sm.svg`),
          cursor: 'pointer',
        },
        anchorIndex: 4,
        name: 'badge',
      });
      group.addShape('image', {
        attrs: {
          x: offsetX + 19,
          y: offsetY + 132,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset(`../../img/params_object${cfg.data.anchors[4]?.connected ? '' : '_inactive'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.VAR_INPUT,
        anchorIndex: 4,
      });

      // 请求头
      const requestHeaderText = group.addShape('text', {
        attrs: {
          x: offsetX + 40,
          y: offsetY + 174,
          text: '请求头',
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
          x: offsetX + 40 + requestHeaderText.getBBox().width + 6,
          y: offsetY + 171,
          width: 6,
          height: 6,
          opacity: cfg.data.anchors[5].data.constOrVariable === ConstOrVariable_DTS.USE_CONST ? 1 : 0,
          img: resolveLogicEditorAsset(`../../img/circle-sm.svg`),
          cursor: 'pointer',
        },
        anchorIndex: 5,
        name: 'badge',
      });
      group.addShape('image', {
        attrs: {
          x: offsetX + 19,
          y: offsetY + 166,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset(`../../img/params_object${cfg.data.anchors[5]?.connected ? '' : '_inactive'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.VAR_INPUT,
        anchorIndex: 5,
      });

      // 请求栈
      const requestStackText = group.addShape('text', {
        attrs: {
          x: offsetX + 40,
          y: offsetY + 208,
          text: '请求栈',
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
          x: offsetX + 40 + requestStackText.getBBox().width + 6,
          y: offsetY + 205,
          width: 6,
          height: 6,
          opacity: cfg.data.anchors[6].data.constOrVariable === ConstOrVariable_DTS.USE_CONST ? 1 : 0,
          img: resolveLogicEditorAsset(`../../img/circle-sm.svg`),
          cursor: 'pointer',
        },
        anchorIndex: 6,
        name: 'badge',
      });
      group.addShape('image', {
        attrs: {
          x: offsetX + 19,
          y: offsetY + 200,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset(`../../img/params_object${cfg.data.anchors[6]?.connected ? '' : '_inactive'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.VAR_INPUT,
        anchorIndex: 6,
      });

      group.sort();
    },

    getAnchorPoints(cfg: INodeConfig): AnchorBaseConfigWithPosition[] {
      const nodeConfigData = cfg.data;
      const anchors = nodeConfigData.anchors;
      return [
        [0, 72 / cfg.nodeHeight, anchors[0]],
        [1, 72 / cfg.nodeHeight, anchors[1]],
        [0, 105 / cfg.nodeHeight, anchors[2]],
        [1, 105 / cfg.nodeHeight, anchors[3]],
        [0, 140 / cfg.nodeHeight, anchors[4]],
        [0, 174 / cfg.nodeHeight, anchors[5]],
        [0, 208 / cfg.nodeHeight, anchors[6]],
      ];
    },
  }

  G6.registerNode(itemType, nodeDefinition as ShapeOptions, BlockNames_DTS.LOGIC_BASE_NODE);
};
