import { resolveLogicEditorAsset } from '../../icon-map';
import { IGroup, IShape, ShapeOptions } from '@antv/g6';
import _ from 'lodash';
import {
  AnchorBaseConfigWithPosition,
  AnchorTag,
  IFuncNodeConfig,
  IG6,
  IIGroup,
  IModelConfig,
  INodeConfig,
  IShapeOptions
} from '../../../interface';
import { AnchorBaseConfig_DTS, AnchorTag_DTS, BlockNames_DTS } from '../../../service/interface';
import { getImgByType, getNodeTextSize } from '../../util';

export default (G6: IG6) => {
  const itemType = BlockNames_DTS.LOGIC_FUNC_NODE;
  const nodeDefinition: IShapeOptions<IFuncNodeConfig> = {
    itemType: itemType,
    calcNodeHeight(cfg: INodeConfig<IFuncNodeConfig>) {
      cfg.nodeWidth = 210;
      cfg.nodeHeight = 132;
      // 计算宽度
      const funcLabel = cfg.data.funcLabel ?? '';
      const fontLength = getNodeTextSize(funcLabel);
      cfg.nodeWidth = fontLength < 9 ? 210 : 210 + (fontLength - 8) * 16;

      // 计算高度
      // 高宽已在上方完成初始化，此处满足锚点计算所需的完整模型约束。
      const all = this.getAnchorPoints?.(cfg as IModelConfig<IFuncNodeConfig>) ?? [];
      const varInputAnchors = all.filter(
        (anchor: AnchorBaseConfigWithPosition) => anchor[2].tag === AnchorTag_DTS.VAR_INPUT,
      );
      const len = varInputAnchors.length + 2;
      if (len <= 3) {
        cfg.nodeHeight = 44 + 3 * 30;
      } else {
        cfg.nodeHeight = 44 + len * 30;
      }
    },

    drawShape(cfg: IModelConfig<IFuncNodeConfig>, group: IIGroup) {
      this.calcNodeHeight?.(cfg);
      const attrs = this.getShapeStyle?.(cfg) ?? {};
      const keyShape = group.addShape('rect', {
        className: `${this.shapeType}-shape`,
        name: `${this.shapeType}-shape`,
        xShapeNode: true, // 自定义节点标识
        draggable: true,
        attrs,
      });
      this.assembleShape?.(cfg, group);
      group.$getItem = (className) => {
        return (group.get('children') as IShape[]).find((item) => item.get('className') === className);
      };

      this.initAnchor?.(cfg, group);
      return keyShape;
    },

    assembleShape(cfg: IModelConfig<IFuncNodeConfig>, group: IGroup) {
      const offsetX = -cfg.nodeWidth / 2;
      const offsetY = -cfg.nodeHeight / 2;

      const funcName = _.get(cfg, 'data.funcLabel', '') as string;
      const fontLength = getNodeTextSize(funcName);
      const textOffset = fontLength < 9 ? 0 : (fontLength - 8) * 16;

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
          img: resolveLogicEditorAsset('../../img/func.svg'),
          cursor: 'pointer',
        },
      });

      group.addShape('text', {
        attrs: {
          x: offsetX + 48,
          y: offsetY + 22,
          fontSize: 14,
          lineHeight: 20,
          text: funcName,
          fill: 'rgba(0,0,0,.85)',
          fontWeight: 'bolder',
          textBaseline: 'middle',
          textAlign: 'start',
          name: 'funcNameShape',
        },
        draggable: true,
      });

      group.addShape('image', {
        attrs: {
          x: offsetX + 177 + textOffset,
          y: offsetY + 14,
          width: 20,
          height: 20,
          img: resolveLogicEditorAsset('../../img/detail.svg'),
          cursor: 'pointer',
        },
        name: 'funcDetail',
      });

      /** 渲染视图锚点 **/

      const all = this.getAnchorPoints?.(cfg) ?? [];

      // 输入
      const statementInputAnchor = all.filter(
        (anchor: AnchorBaseConfigWithPosition) => anchor[2].tag === AnchorTag_DTS.STATEMENT_INPUT,
      );
      if (statementInputAnchor && statementInputAnchor.length > 0) {
        const config = statementInputAnchor[0][2];
        if (config) {
          // * 语句输入锚点
          const {
            index,
            tag,
            nodeId,
            connected,
            data: { type, label },
          } = config;
          const img = resolveLogicEditorAsset(`../../img/statement_anchor${connected ? '' : '_light'}.svg`);
          group.addShape('image', {
            attrs: {
              x: offsetX + 19,
              y: offsetY + 44 + 30 * 1 - 8,
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
              y: offsetY + 44 + 30 * 1,
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
      }
      // 输出
      const statementOutputAnchor = all.filter(
        (anchor: AnchorBaseConfigWithPosition) => anchor[2].tag === AnchorTag_DTS.STATEMENT_OUTPUT,
      );
      if (statementOutputAnchor && statementOutputAnchor.length > 0) {
        const config = statementInputAnchor[0][2];
        if (config) {
          const {
            index,
            tag,
            nodeId,
            connected,
            data: { type, label },
          } = config;
          const img = resolveLogicEditorAsset(`../../img/statement_anchor${connected ? '' : '_light'}.svg`);
          group.addShape('text', {
            attrs: {
              x: offsetX + 176 + textOffset,
              y: offsetY + 44 + 30 * 1,
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
              x: offsetX + 180 + textOffset,
              y: offsetY + 44 + 30 * 1 - 8,
              width: 16,
              height: 16,
              img,
              cursor: 'pointer',
            },
            anchorTag: AnchorTag.STATEMENT_OUTPUT,
            anchorIndex: 1,
          });
        }
      }
      // 返回值
      const varOutputAnchor = all.filter(
        (anchor: AnchorBaseConfigWithPosition) => anchor[2].tag === AnchorTag_DTS.VAR_OUTPUT,
      );
      if (varOutputAnchor[0] && varOutputAnchor[0][2]) {
        const config = varOutputAnchor[0][2];
        const {
          index,
          connected,
          data: { type, label },
        } = config;
        group.addShape('image', {
          attrs: {
            x: offsetX + 180 + textOffset,
            y: offsetY + 44 + 30 * 2 - 8,
            width: 16,
            height: 16,
            img: getImgByType(String(type ?? ''), 'out', !!connected),
            cursor: 'pointer',
          },
          anchorTag: AnchorTag.VAR_OUTPUT,
          anchorIndex: index,
          name: 'return',
        });
        group.addShape('text', {
          attrs: {
            x: offsetX + 175 + textOffset,
            y: offsetY + 44 + 30 * 2,
            text: label,
            fill: 'black',
            fontSize: 12,
            lineHeight: 20,
            opacity: 0.85,
            textBaseline: 'middle',
            textAlign: 'end',
            cursor: 'pointer',
          },
          name: 'return',
        });
      }
      const returnVal = _.find(all, (anchor) => anchor[2].tag === AnchorTag_DTS.VAR_OUTPUT);

      // 入参
      const varInputAnchors = all.filter(
        (anchor: AnchorBaseConfigWithPosition) => anchor[2].tag === AnchorTag_DTS.VAR_INPUT,
      );
      if (varInputAnchors && varInputAnchors.length > 0) {
        _.forEach(varInputAnchors, (anchor) => {
          const config = anchor[2];
          if (config) {
            const {
              connected,
              index,
              data: { type, label, name },
            } = config;
            group.addShape('image', {
              attrs: {
                x: offsetX + 20,
                y: offsetY + 44 + 30 * (returnVal ? index - 1 : index) - 8,
                width: 14,
                height: 14,
                img: getImgByType(String(type ?? ''), 'in', !!connected),
                cursor: 'pointer',
                anchor_index: index,
              },
              anchorTag: AnchorTag.VAR_INPUT,
              anchorIndex: index,
              name: 'param',
              key: name,
            });

            const parameterLabel = label ?? '';
            const text = getNodeTextSize(parameterLabel) > 9 ? parameterLabel.substring(0, 6) + '...' : parameterLabel;
            group.addShape('text', {
              attrs: {
                x: offsetX + 40,
                y: offsetY + 44 + 30 * (returnVal ? index - 1 : index),
                text,
                fill: 'black',
                fontSize: 12,
                lineHeight: 20,
                opacity: 0.85,
                textBaseline: 'middle',
                textAlign: 'start',
                cursor: 'pointer',
                anchor_index: index,
              },
              name: 'param',
              key: name,
            });
          }
        });
      }
      group.sort();
    },

    getAnchorPoints(cfg: IModelConfig<IFuncNodeConfig>): AnchorBaseConfigWithPosition[] {
      // index
      // 0 输入
      // 1: 输出
      // 2: 返回值
      const nodeConfigData = cfg.data;
      const anchors = nodeConfigData.anchors;

      const returnVal = _.find(anchors, (anchor) => anchor.tag === AnchorTag_DTS.VAR_OUTPUT);
      const all = anchors.map((anchor: AnchorBaseConfig_DTS): AnchorBaseConfigWithPosition | undefined => {
        // 输入
        if (anchor.tag === AnchorTag_DTS.STATEMENT_INPUT && anchor.index === 0) {
          return [0, (44 + 30 * 1) / cfg.nodeHeight, anchor];
        }
        // 输出
        if (anchor.tag === AnchorTag_DTS.STATEMENT_OUTPUT && anchor.index === 1) {
          return [1, (44 + 30 * 1) / cfg.nodeHeight, anchor];
        }

        // 返回值
        if (anchor.tag === AnchorTag_DTS.VAR_OUTPUT && anchor.index === 2) {
          return [1, (44 + 30 * anchor.index) / cfg.nodeHeight, anchor];
        }

        // 入参
        if (anchor.tag === AnchorTag_DTS.VAR_INPUT) {
          // > bugfix: 有没有返回值,有返回值和没有返回值位置不一样
          return [0, (44 + 30 * (anchor.index - (returnVal ? 1 : 0))) / cfg.nodeHeight, anchor];
        }
      });

      const hasEmpty = _.find(all, (anchor) => _.isEmpty(anchor));
      if (hasEmpty) {
        console.warn('存在空的锚点配置，请检查！');
      }

      return all.filter((anchor): anchor is AnchorBaseConfigWithPosition => anchor !== undefined);
    },
  };
  G6.registerNode(itemType, nodeDefinition as ShapeOptions, BlockNames_DTS.LOGIC_BASE_NODE);
};
