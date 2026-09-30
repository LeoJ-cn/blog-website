import { resolveLogicEditorAsset } from '../../icon-map';
import type { IGroup, INode, Item, ModelConfig, ShapeOptions, UpdateType } from '@antv/g6';
import { AnchorTag, IG6, IModelConfig, INodeConfig } from '../../../interface';
import { AnchorBaseConfig_DTS, BlockNames_DTS, ConstOrVariable_DTS } from '../../../service/interface';
import { IShapeOptions } from './../../../interface/index';
import { getImgByType } from '../../util';
import { nodeUpdate } from '../../util/node-update';
import _ from 'lodash';
import { Data, DataType } from '../../../../types/data';
import { Parse } from '../../../compat/parse';
import dataMixin from '../../../compat/data';

export default (G6: IG6) => {
  const itemType = BlockNames_DTS.LOGIC_ARRAY_FOREACH_NODE;
  const nodeDefinition: IShapeOptions = {
    itemType: itemType,

    calcNodeHeight(cfg: INodeConfig) {
      cfg.nodeWidth = 210;
      cfg.nodeHeight = 200;
    },

    assembleShape(cfg: IModelConfig, group: IGroup) {
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
          img: resolveLogicEditorAsset('../../img/loop.svg'),
          cursor: 'pointer',
        },
      });

      group.addShape('text', {
        attrs: {
          x: offsetX + 48,
          y: offsetY + 22,
          fontSize: 14,
          lineHeight: 20,
          text: '数组循环',
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
        name: 'output-cursor-img',
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
        name: 'output-cursor-img',
        anchorTag: AnchorTag.STATEMENT_OUTPUT,
        anchorIndex: 1,
      });

      const arrayText = group.addShape('text', {
        attrs: {
          x: offsetX + 40,
          y: offsetY + 106,
          text: '数组',
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
          x: offsetX + 40 + arrayText.getBBox().width + 6,
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
          img: resolveLogicEditorAsset(`../../img/params_array${cfg.data.anchors[2]?.connected ? '' : '_inactive'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.VAR_INPUT,
        anchorIndex: 2,
      });

      group.addShape('text', {
        attrs: {
          x: offsetX + 175,
          y: offsetY + 106,
          text: '循环体',
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
          y: offsetY + 98,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset(`../../img/statement_anchor${cfg.data.anchors[3].connected ? '' : '_light'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.STATEMENT_OUTPUT,
        anchorIndex: 3,
      });

      group.addShape('text', {
        attrs: {
          x: offsetX + 175,
          y: offsetY + 140,
          text: '索引',
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
          y: offsetY + 132,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset(`../../img/return_number${cfg.data.anchors[4]?.connected ? '' : '_inactive'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.VAR_OUTPUT,
        anchorIndex: 4,
      });

      group.addShape('text', {
        attrs: {
          x: offsetX + 175,
          y: offsetY + 174,
          text: '项',
          fill: 'black',
          fontSize: 12,
          lineHeight: 20,
          opacity: 0.85,
          textBaseline: 'middle',
          textAlign: 'end',
          cursor: 'pointer',
        },
        name: 'item',
      });
      group.addShape('image', {
        attrs: {
          x: offsetX + 180,
          y: offsetY + 166,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset(`../../img/return_undefined${cfg.data.anchors[5]?.connected ? '' : '_inactive'}.svg`),
          cursor: 'pointer',
        },
        anchorTag: AnchorTag.VAR_OUTPUT,
        anchorIndex: 5,
        name: 'item',
      });
      group.sort();
    },

    update(cfg: ModelConfig, item: Item, updateType?: UpdateType) {
      if (item.getType() !== 'node') throw new Error('数组循环只能更新节点元素');
      const node = item as INode;
      const model = node.get<INodeConfig>('model');
      const inputAnchor = model.data.anchors && (model.data.anchors[2] as AnchorBaseConfig_DTS);
      const itemAnchor = model.data.anchors && (model.data.anchors[5] as AnchorBaseConfig_DTS);
      if (!inputAnchor || !itemAnchor) {
        return;
      }
      if (inputAnchor.data.constOrVariable === ConstOrVariable_DTS.USE_CONST) {
        let defaultValue: unknown[] = [];
        eval(`defaultValue = ${inputAnchor.data.value}`);
        const value = defaultValue && defaultValue[0];
        itemAnchor.data = {
          ...itemAnchor.data,
          label: 'item',
          name: 'item',
          value: value,
          type: _.isArray(value) ? DataType.Array : (typeof value as DataType),
          schema: Parse(value),
        };
      } else {
        const edge = node.getEdges().find((i) => i.getModel().target === model.id && i.getModel().targetAnchor === 2);
        if (!edge) {
          return;
        }
        const edgeModel = edge.getModel();
        const sourceModel = edge.getSource().get<INodeConfig>('model');
        const sourceAnchor = sourceModel.data.anchors.find((i) => i.index === edgeModel.sourceAnchor);
        if (sourceAnchor?.data.schema?.type === DataType.Array && sourceAnchor.data.schema.items) {
          let value = dataMixin.getDefaultValueJSONFromSchema(sourceAnchor.data.schema);
          itemAnchor.data = {
            ...itemAnchor.data,
            label: 'item',
            name: 'item',
            value: value && value[0],
            type: sourceAnchor.data.schema.items.type,
            schema: sourceAnchor.data.schema.items,
          };
        }
      }
      nodeUpdate(cfg, node, updateType);
    },

    getAnchorPoints(cfg: IModelConfig): any[] {
      const nodeConfigData = cfg.data;
      const anchors = nodeConfigData.anchors;
      return [
        [0, 72 / cfg.nodeHeight, anchors[0]],
        [1, 72 / cfg.nodeHeight, anchors[1]],
        [0, 107 / cfg.nodeHeight, anchors[2]],
        [1, 107 / cfg.nodeHeight, anchors[3]],
        [1, 142 / cfg.nodeHeight, anchors[4]],
        [1, 177 / cfg.nodeHeight, anchors[5]],
      ];
    },
  };

  G6.registerNode(itemType, nodeDefinition as ShapeOptions, BlockNames_DTS.LOGIC_BASE_NODE);
};
