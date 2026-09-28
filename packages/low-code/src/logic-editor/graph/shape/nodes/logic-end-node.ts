import { resolveLogicEditorAsset } from '../../icon-map';
import { IGroup, ShapeOptions } from '@antv/g6';
import _ from 'lodash';
import {
  AnchorBaseConfigWithPosition, AnchorTag, IG6, INodeConfig,
  IShapeOptions
} from '../../../interface';
import { AnchorBaseConfig_DTS, AnchorTag_DTS, BlockNames_DTS } from '../../../service/interface';
import { getImgByType } from '../../util';

export default (G6: IG6) => {
  const itemType = BlockNames_DTS.LOGIC_END_NODE;
  const nodeDefinition: IShapeOptions = {
    itemType,

    calcNodeHeight(cfg?: INodeConfig) {
      cfg.nodeWidth = 210;
      cfg.nodeHeight = 122;
      const all = this.getAnchorPoints(cfg);
      const len = all.length;
      if (len) {
        cfg.nodeHeight = 44 + (len + 1) * 30;
      }
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
          img: resolveLogicEditorAsset('../../img/end.svg'),
          cursor: 'move', // move
        },
        draggable: true,
      });

      group.addShape('text', {
        attrs: {
          x: offsetX + 48,
          y: offsetY + 22,
          fontSize: 14,
          lineHeight: 20,
          text: '结束',
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
          cursor: 'move',
        },
        name: 'right-help',
        draggable: true,
      });

      const all = this.getAnchorPoints(cfg) as AnchorBaseConfigWithPosition[];
      _.forEach(all, (anchor: AnchorBaseConfigWithPosition) => {
        const config: AnchorBaseConfig_DTS = anchor[2];
        const { connected = false } = config;
        if (config.tag === AnchorTag_DTS.STATEMENT_INPUT) { // 渲染【结束】锚点
          group.addShape('text', {
            attrs: {
              x: offsetX + 40,
              y: offsetY + 75 + 30 * config.index,
              text: '结束',
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
              x: offsetX + 20,
              y: offsetY + 75 + 30 * config.index - 8,
              width: 16,
              height: 16,
              img: resolveLogicEditorAsset(`../../img/statement_anchor${connected ? '' : '_light'}.svg`),
              cursor: 'pointer',
            },
            anchorTag: AnchorTag.STATEMENT_INPUT,
            anchorIndex: 0,
            name: 'output-cursor-img',
          });
        }

        if (config.tag === AnchorTag_DTS.VAR_INPUT) {
          group.addShape('image', {
            attrs: {
              x: offsetX + 20,
              y: offsetY + 75 + 30 * config.index - 8,
              width: 14,
              height: 14,
              img: getImgByType(config.data.type, 'out', config.connected || false),
              cursor: 'pointer',
            },
            anchorTag: AnchorTag.VAR_INPUT,
            anchorIndex: config.index,
            name: 'return',
          });

          group.addShape('text', {
            attrs: {
              x: offsetX + 40,
              y: offsetY + 75 + 30 * config.index,
              text: config.data.label,
              fill: 'black',
              fontSize: 12,
              lineHeight: 20,
              opacity: 0.85,
              textBaseline: 'middle',
              textAlign: 'start',
              cursor: 'pointer',
            },
            name: 'return',
          });
        }
      });

      group.sort();
    },

    getAnchorPoints(cfg: INodeConfig): any[] {
      const nodeConfigData = cfg.data;
      const anchors = nodeConfigData.anchors;

      return _.map<AnchorBaseConfig_DTS, AnchorBaseConfigWithPosition>(anchors, (anchor: AnchorBaseConfig_DTS) => {
        if (anchor.tag === AnchorTag_DTS.STATEMENT_INPUT) {
          return [0, (44 + 30 * (anchor.index + 1)) / cfg.nodeHeight, anchor];
        }

        if (anchor.tag === AnchorTag_DTS.VAR_INPUT) {
          return [0, (44 + 30 * (anchor.index + 1)) / cfg.nodeHeight, anchor];
        }
      });
    },
  };
  G6.registerNode(itemType, nodeDefinition as ShapeOptions, BlockNames_DTS.LOGIC_BASE_NODE);

};
