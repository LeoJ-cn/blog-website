import { resolveLogicEditorAsset } from '../../icon-map';
import { IGroup, ShapeOptions } from '@antv/g6';
import _ from 'lodash';
import { AnchorBaseConfigWithPosition, AnchorTag, IG6, INodeConfig, IShapeOptions } from '../../../interface';
import { AnchorBaseConfig_DTS, AnchorTag_DTS, BlockNames_DTS } from '../../../service/interface';
import { getImgByType, getNodeTextSize } from '../../util';

export default (G6: IG6) => {
  const itemType = BlockNames_DTS.LOGIC_START_NODE;
  const nodeDefinition: IShapeOptions = {
    itemType: itemType,
    calcNodeHeight(cfg?: INodeConfig) {
      cfg.nodeWidth = 210;
      cfg.nodeHeight = 132;

      const anchors = _.get(cfg, 'data.anchors', []) as AnchorBaseConfig_DTS[];
      const lens = anchors.map((anchorCfg) => {
        const paramLabel = _.get(anchorCfg, 'data.label', '');
        return getNodeTextSize(paramLabel);
      });

      const max = _.max(lens);
      cfg.nodeWidth = max < 9 ? 210 : 210 + (max - 8) * 16;

      const all = this.getAnchorPoints(cfg);
      const len = all.length;
      if (len) {
        cfg.nodeHeight = 44 + (len + 1) * 30;
      }
    },
    assembleShape(cfg?: INodeConfig, group?: IGroup) {
      const offsetX = -cfg.nodeWidth / 2;
      const offsetY = -cfg.nodeHeight / 2;

      const anchors = _.get(cfg, 'data.anchors', []) as AnchorBaseConfig_DTS[];
      const lens = anchors.map((anchorCfg) => {
        const paramLabel = _.get(anchorCfg, 'data.label', '');
        return getNodeTextSize(paramLabel);
      });

      const max = _.max(lens);
      const textOffset = max < 9 ? 0 : (max - 8) * 16;

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
        name: 'title-container',
      });

      group.addShape('image', {
        attrs: {
          x: offsetX + 17,
          y: offsetY + 13,
          width: 20,
          height: 20,
          img: resolveLogicEditorAsset('../../img/start.svg'),
          cursor: 'pointer',
        },
        name: 'left-img',
      });

      group.addShape('text', {
        attrs: {
          x: offsetX + 48,
          y: offsetY + 22,
          fontSize: 14,
          lineHeight: 20,
          text: '开始',
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
          x: offsetX + 177 + textOffset,
          y: offsetY + 14,
          width: 16,
          height: 16,
          img: resolveLogicEditorAsset('../../img/help.svg'),
          cursor: 'pointer',
        },
        name: 'right-help',
      });

      const all = this.getAnchorPoints(cfg) as AnchorBaseConfigWithPosition[];
      _.forEach(all, (anchor: AnchorBaseConfigWithPosition) => {
        const config: AnchorBaseConfig_DTS = anchor[2];
        if (config.tag === AnchorTag_DTS.STATEMENT_OUTPUT) {
          // 渲染【开始】锚点
          group.addShape('text', {
            attrs: {
              x: offsetX + 175 + textOffset,
              y: offsetY + 75 + 30 * config.index,
              text: '开始',
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
              x: offsetX + 180 + textOffset,
              y: offsetY + 75 + 30 * config.index - 8,
              width: 16,
              height: 16,
              img: resolveLogicEditorAsset(`../../img/statement_anchor${cfg.data.anchors[0].connected ? '' : '_light'}.svg`),
              cursor: 'pointer',
            },
            anchorTag: AnchorTag.STATEMENT_INPUT,
            anchorIndex: 0,
            name: 'output-cursor-img',
          });
        }

        if (config.tag === AnchorTag_DTS.VAR_OUTPUT) {
          group.addShape('image', {
            attrs: {
              x: offsetX + 180 + textOffset,
              y: offsetY + 75 + 30 * config.index - 8,
              width: 14,
              height: 14,
              img: getImgByType(config.data.type, 'out', !!config.connected),
              cursor: 'pointer',
            },
            anchorTag: AnchorTag.VAR_OUTPUT,
            anchorIndex: config.index,
            name: 'param',
            param: config.data.name,
          });

          group.addShape('text', {
            attrs: {
              x: offsetX + 175 + textOffset,
              y: offsetY + 75 + 30 * config.index,
              text: config.data.label,
              fill: 'black',
              fontSize: 12,
              lineHeight: 20,
              opacity: 0.85,
              textBaseline: 'middle',
              textAlign: 'end',
              cursor: 'pointer',
            },
            name: 'param',
            param: config.data.name,
          });
        }
      });
      group.sort();
    },

    getAnchorPoints(cfg: INodeConfig): AnchorBaseConfigWithPosition[] {
      const nodeConfigData = cfg.data;
      const anchors = nodeConfigData.anchors;
      return _.map<AnchorBaseConfig_DTS, AnchorBaseConfigWithPosition>(anchors, (anchor: AnchorBaseConfig_DTS) => {
        if (anchor.tag === AnchorTag_DTS.STATEMENT_OUTPUT) {
          return [1, (44 + 30 * (anchor.index + 1)) / cfg.nodeHeight, anchor];
        }

        if (anchor.tag === AnchorTag_DTS.VAR_OUTPUT) {
          return [1, (44 + 30 * (anchor.index + 1)) / cfg.nodeHeight, anchor];
        }
      });
    },
  };
  G6.registerNode(itemType, nodeDefinition as ShapeOptions, BlockNames_DTS.LOGIC_BASE_NODE);
};
