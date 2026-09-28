import { resolveLogicEditorAsset } from '../../icon-map';
import { IGroup, ShapeOptions } from '@antv/g6';
import _ from 'lodash';
import { AnchorBaseConfigWithPosition, AnchorTag, IG6, INodeConfig, IShapeOptions } from '../../../interface';
import { AnchorBaseConfig_DTS, AnchorTag_DTS, BlockNames_DTS } from '../../../service/interface';
import { getImgByType } from '../../util';


export default (G6: IG6) => {
  const itemType = BlockNames_DTS.LOGIC_IFELSE_NODE;
  const nodeDefinition: IShapeOptions = {
    itemType: itemType,
    calcNodeHeight(cfg?: INodeConfig) {
      cfg.nodeWidth = 210;
      cfg.nodeHeight = 170;

      const all = this.getAnchorPoints(cfg);
      const len = all.length;
      if (len <= 5) {
        cfg.nodeHeight = 44 + 4 * 30;
      } else {
        cfg.nodeHeight = 44 + (Math.ceil(len / 2) + 1) * 30;
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
          img: resolveLogicEditorAsset('../../img/if-else.svg'),
          cursor: 'pointer',
        },
      });

      group.addShape('text', {
        attrs: {
          x: offsetX + 48,
          y: offsetY + 22,
          fontSize: 14,
          lineHeight: 20,
          text: '如果-否则',
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

      const all = this.getAnchorPoints(cfg) as AnchorBaseConfigWithPosition[];

      const statementInputAnchor = all.filter((anchor: AnchorBaseConfigWithPosition) => anchor[2].tag === AnchorTag_DTS.STATEMENT_INPUT);
      if (statementInputAnchor && statementInputAnchor.length > 0) {
        const config = statementInputAnchor[0][2];
        const { connected = false, tag, data: { type } } = config;
        const img = resolveLogicEditorAsset(`../../img/statement_anchor${connected ? '' : '_light'}.svg`);
        group.addShape('image', {
          attrs: {
            x: offsetX + 19,
            y: offsetY + 64,
            width: 16,
            height: 16,
            img,
            cursor: 'pointer',
          },
          anchorTag: AnchorTag.STATEMENT_INPUT,
          anchorIndex: 0,
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
        });
      }
      const statementOutputAnchor = all.filter((anchor: AnchorBaseConfigWithPosition) => anchor[2].tag === AnchorTag_DTS.STATEMENT_OUTPUT);
      if (statementOutputAnchor && statementOutputAnchor.length > 0) {
        const config = statementOutputAnchor[0][2];
        const { connected = false, tag, data: { type } } = config;
        const img = resolveLogicEditorAsset(`../../img/statement_anchor${connected ? '' : '_light'}.svg`);

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
        });
        group.addShape('image', {
          attrs: {
            x: offsetX + 180,
            y: offsetY + 64,
            width: 16,
            height: 16,
            img,
            cursor: 'pointer',
          },
          anchorTag: AnchorTag.STATEMENT_OUTPUT,
          anchorIndex: 1,
        });
      }

      const varInputAnchors = all.filter((anchor: AnchorBaseConfigWithPosition) => anchor[2].tag === AnchorTag_DTS.VAR_INPUT);
      const varOutputAnchors = all.filter((anchor: AnchorBaseConfigWithPosition, index: number) => anchor[2].tag === AnchorTag_DTS.STATEMENT_OUTPUT && index !== 1);

      // * 变量输入锚点
      if (varInputAnchors.length) {
        _.forEach(varInputAnchors, (anchor, idx) => {
          const { connected = false, tag, index, data: { type, label } } = anchor[2];
          const img = getImgByType(type, 'in', connected);
          group.addShape('text', {
            attrs: {
              x: offsetX + 40,
              y: offsetY + 106 + idx * 30,
              text: label,
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
              y: offsetY + 98 + 30 * idx,
              width: 16,
              height: 16,
              img,
              cursor: 'pointer',
            },
            anchorTag: AnchorTag_DTS.VAR_INPUT,
            anchorIndex: index,
          });
        });
      }

      // * 渲染变量输出锚点
      if (varOutputAnchors.length) {
        _.forEach(varOutputAnchors, (anchor, idx) => {
          const { connected = false, index, tag, data: { type, label } } = anchor[2];
          const img = resolveLogicEditorAsset(`../../img/statement_anchor${connected ? '' : '_light'}.svg`);
          group.addShape('text', {
            attrs: {
              x: offsetX + 175,
              y: offsetY + 106 + idx * 30,
              text: label,
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
              y: offsetY + 98 + idx * 30,
              width: 16,
              height: 16,
              img,
              cursor: 'pointer',
            },
            anchorTag: AnchorTag.STATEMENT_OUTPUT,
            anchorIndex: index,
          });
        });
      }

      group.sort();
    },

    getAnchorPoints(cfg: INodeConfig): AnchorBaseConfigWithPosition[] {
      const nodeConfigData = cfg.data;
      const anchors = nodeConfigData.anchors;

      const all = _.map<AnchorBaseConfig_DTS, AnchorBaseConfigWithPosition>(anchors, (anchor: AnchorBaseConfig_DTS) => {
        // 输入
        if (anchor.tag === AnchorTag_DTS.STATEMENT_INPUT && anchor.index === 0) {
          return [0, (44 + 30 * 1) / cfg.nodeHeight, anchor];
        }

        // 输出
        if (anchor.tag === AnchorTag_DTS.STATEMENT_OUTPUT && anchor.index === 1) {
          return [1, (44 + 30 * 1) / cfg.nodeHeight, anchor];
        }

        if (anchor.tag === AnchorTag_DTS.VAR_INPUT && anchor.index !== 0) {
          return [0, (44 + 30 * (anchor.index / 2 + 1)) / cfg.nodeHeight, anchor];
        }

        if (anchor.tag === AnchorTag_DTS.STATEMENT_OUTPUT && anchor.index !== 1) {
          if (anchor.index === anchors.length - 1) {
            return [1, (44 + 30 * (anchor.index / 2 + 1)) / cfg.nodeHeight, anchor];
          }
          return [1, (44 + 30 * (Math.ceil(anchor.index / 2))) / cfg.nodeHeight, anchor];
        }
      });
      return all.filter((v) => !_.isEmpty(v));
    },
  }
  G6.registerNode(itemType, nodeDefinition as ShapeOptions, BlockNames_DTS.LOGIC_BASE_NODE);
};
