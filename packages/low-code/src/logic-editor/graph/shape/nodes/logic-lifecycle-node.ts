import { resolveLogicEditorAsset } from '../../icon-map';
import { filter, forEach } from 'lodash';
import { IGroup, Item, ShapeOptions, UpdateType } from '@antv/g6';
import { IG6, IShapeOptions } from '../../../interface';
import { AnchorTag, INodeConfig } from '../../../interface/index';
import { BlockNames_DTS } from '../../../service/interface';

export default (G6: IG6) => {
  const itemType = BlockNames_DTS.LOGIC_LIFECYCLE_NODE;
  const nodeDefinition: IShapeOptions = {
    itemType: itemType,
    calcNodeHeight(cfg?: INodeConfig) {
      cfg.nodeWidth = 210;
      cfg.nodeHeight = 162;
    },

    assembleShape(cfg?: INodeConfig, group?: IGroup) {
      const offsetX = -cfg.nodeWidth / 2;
      const offsetY = -cfg.nodeHeight / 2;

      const all = this.getAnchorPoints(cfg);

      all.forEach((anchorInf, index) => {
        const anchor = anchorInf[2];
        group.addShape('text', {
          attrs: {
            x: offsetX + 170,
            y: offsetY + 72 + index * 30,
            fontSize: 12,
            lineHeight: 20,
            text: anchor.data.label,
            fill: 'rgba(0,0,0,.85)',
            textBaseline: 'middle',
            textAlign: 'end',
          },
          draggable: true,
        });

        group.addShape('image', {
          attrs: {
            x: offsetX + 180,
            y: offsetY + 64 + index * 30,
            width: 16,
            height: 16,
            img: resolveLogicEditorAsset(`../../img/statement_anchor${anchor.connected ? '' : '_light'}.svg`),
            cursor: 'pointer',
          },
          name: anchor.data.value,
          anchorTag: AnchorTag.STATEMENT_OUTPUT,
          anchorIndex: index,
        });
      });

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
          img: resolveLogicEditorAsset('../../img/lifecycle.svg'),
          cursor: 'pointer',
        },
      });

      group.addShape('text', {
        attrs: {
          x: offsetX + 48,
          y: offsetY + 22,
          fontSize: 14,
          lineHeight: 20,
          text: '生命周期',
          fill: 'rgba(0,0,0,.85)',
          fontWeight: 'bolder',
          textBaseline: 'middle',
          textAlign: 'start',
        },
        draggable: true,
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
      group.sort();
    },

    getAnchorPoints(cfg: INodeConfig): any[] {
      const nodeConfigData = cfg.data;
      const anchors = nodeConfigData.anchors;

      return anchors.map((anchor, index) => {
        return [1, (72 + index * 30) / cfg.nodeHeight, anchor];
      });
    },
  };
  G6.registerNode(itemType, nodeDefinition as ShapeOptions, BlockNames_DTS.LOGIC_BASE_NODE);
};
