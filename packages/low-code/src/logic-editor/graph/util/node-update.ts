import { resolveLogicEditorAsset } from '../icon-map';
import G6, { type IShape, type Item, type ModelConfig, type ShapeOptions, type UpdateType } from '@antv/g6';
import _ from 'lodash';
import { getImgByType, getNodeTextSize, isEn } from '.';
import { AnchorBaseConfigWithPosition, AnchorTag, IIGroup, IModelConfig, INodeConfig, IShapeOptions, assertNodeConfig } from '../../interface';
import { AnchorTag_DTS, BlockNames_DTS, ConstOrVariable_DTS } from '../../service/interface';

export function nodeUpdate(cfg: ModelConfig, node: Item, updateType?: UpdateType): void {
  assertNodeConfig(cfg, '更新节点视图');
  const model = node.get('model');
  const { attrs } = node.get('keyShape');
  const group = node.get('group');
  const item = group.get('children')[0];
  item.attr({ ...attrs, ...model.style });
  // 锚点被链接后需要变成实心
  const children = group.get('children') as IShape[];
  const renderedAnchorTags: string[] = [
    AnchorTag.STATEMENT_OUTPUT,
    AnchorTag.STATEMENT_INPUT,
    AnchorTag.VAR_INPUT,
    AnchorTag.VAR_OUTPUT,
  ];
  const anchorImgs = children.filter((item) =>
    renderedAnchorTags.includes(item.get('anchorTag') as string),
  );

  anchorImgs.forEach((imgShape) => {
    const anchorIndex = imgShape.get('anchorIndex');
    if (cfg.data.anchors[anchorIndex]) {
      const {
        connected = false,
        tag,
        data: { type },
      } = cfg.data.anchors[anchorIndex];

      if ([AnchorTag_DTS.STATEMENT_OUTPUT, AnchorTag_DTS.STATEMENT_INPUT].includes(tag)) {
        imgShape.attr({
          img: resolveLogicEditorAsset(`../img/statement_anchor${connected ? '' : '_light'}.svg`),
        });
      } else {
        imgShape.attr({
          img: getImgByType(String(type ?? ''), AnchorTag_DTS.VAR_INPUT === tag ? 'in' : 'out', connected),
        });
      }
    } else {
      console.warn('找不到该锚点!');
    }
  });

  const badges = children.filter((item) => item.get('name') === 'badge');
  badges.forEach((badge) => {
    const anchorIndex = badge.get('anchorIndex');
    if (cfg.data.anchors[anchorIndex]) {
      const {
        data: { constOrVariable = ConstOrVariable_DTS.USE_CONST },
      } = cfg.data.anchors[anchorIndex];
      badge.attr('opacity', constOrVariable === ConstOrVariable_DTS.USE_CONST ? 1 : 0);
    }
  });
}


export function registerNode(config: INodeConfig): void {

  const {
    type,
    nodeWidth,
    nodeHeight,
    label,
    name,
    img,
    operations,
    // data: {
    //   anchors,
    // },
  } = config;
  console.log('%c [ node-update.ts ---> config ]: ', 'color: orange;', config);

  const nodeDefinition: IShapeOptions = {
    itemType: type,

    calcNodeHeight(cfg: INodeConfig) {
      // 节点默认的初始宽高
      cfg.nodeWidth = nodeWidth ?? 210;
      cfg.nodeHeight = nodeHeight ?? 134;

      const anchors = this.getAnchorPoints?.(cfg as IModelConfig) ?? [];
      const len = anchors.length;

      // 计算宽度
      // 根据节点的标题去动态计算宽度
      const title = (isEn() ? name : label) ?? '';
      const titleSize = getNodeTextSize(title);
      cfg.nodeWidth = titleSize < 9 ? 210 : 210 + (titleSize - 8) * 16;

      // 计算高度
      if (len <= 3) {
        cfg.nodeHeight = 44 + 3 * 30;
      } else {
        cfg.nodeHeight = 44 + (len - 1) * 30;
      }
    },

    /**
     * 渲染视图
     * @param cfg
     * @param group
     */
    assembleShape(cfg: IModelConfig, group: IIGroup) {
      const currentNodeWidth = cfg.nodeWidth ?? nodeWidth ?? 210;
      const currentNodeHeight = cfg.nodeHeight ?? nodeHeight ?? 134;
      cfg.nodeWidth = currentNodeWidth;
      cfg.nodeHeight = currentNodeHeight;
      const offsetX = -currentNodeWidth / 2;
      const offsetY = -currentNodeHeight / 2;

      // 整个块的宽度变大,右侧竖列的文本图片需要跟着右移
      const title = (isEn() ? name : label) ?? '';
      const titleSize = getNodeTextSize(title);
      // 偏移
      const offset = titleSize < 9 ? 0 : (titleSize - 8) * 16;

      // Topbar
      // 标题背景框
      group.addShape('rect', {
        attrs: {
          x: offsetX + 1,
          y: offsetY + 1,
          width: currentNodeWidth - 2,
          height: 44,
          fill: '#F2F8FF',
          cursor: 'move',
          radius: [12, 12, 0, 0],
        },
        name: 'title-container',
        draggable: true,
      });

      // 节点的icon
      // group.addShape('image', {
      //   attrs: {
      //     x: offsetX + 17,
      //     y: offsetY + 13,
      //     width: 20,
      //     height: 20,
      //     img: resolveLogicEditorAsset(img),
      //     cursor: 'pointer',
      //   },
      //   name: 'left-img',
      // });

      // 节点的标题
      group.addShape('text', {
        attrs: {
          x: offsetX + 48,
          y: offsetY + 22,
          fontSize: 14,
          lineHeight: 20,
          text: isEn() ? name : label,
          fill: 'rgba(0,0,0,.85)',
          fontWeight: 'bolder',
          textBaseline: 'middle',
          textAlign: 'start',
          cursor: 'move',
        },
        draggable: true,
        name: 'title',
      });

      // 节点的操作按钮
      const operation = operations?.[0];
      if (operation === 'help') {
        group.addShape('image', {
          attrs: {
            x: offsetX + 177 + offset,
            y: offsetY + 14,
            width: 16,
            height: 16,
            img: resolveLogicEditorAsset('../img/help.svg'),
            cursor: 'pointer',
          },
          name: 'op-help',
        });
      }

      // 动态获取锚点
      const anchorConfigs = this.getAnchorPoints?.(cfg) ?? [];

      const statementInputAnchor = anchorConfigs.find((anchor) => anchor[2].tag === AnchorTag_DTS.STATEMENT_INPUT);

      if (statementInputAnchor) {
        const { index, connected, data: { label, name } } = statementInputAnchor[2];
        // 逻辑流程的输入
        group.addShape('text', {
          attrs: {
            x: offsetX + 40,
            y: offsetY + 72,
            text: isEn() ? name : label,
            fill: 'black',
            fontSize: 12,
            lineHeight: 20,
            opacity: 0.85,
            textBaseline: 'middle',
            textAlign: 'start',
            cursor: 'pointer',
          },
          name: 'statement-input-title',
        });

        group.addShape('image', {
          attrs: {
            x: offsetX + 19,
            y: offsetY + 64,
            width: 16,
            height: 16,
            img: resolveLogicEditorAsset(`../img/statement_anchor${connected ? '' : '_light'}.svg`),
            cursor: 'pointer',
          },
          anchorTag: AnchorTag.STATEMENT_INPUT,
          anchorIndex: index,
          name: 'statement-input-img',
        });
      }

      // 流程输出
      const statementOutputAnchor = anchorConfigs.find((anchor) => anchor[2].tag === AnchorTag_DTS.STATEMENT_OUTPUT);

      if (statementOutputAnchor) {
        const { index, connected, data: { label, name } } = statementOutputAnchor[2];

        group.addShape('text', {
          attrs: {
            x: offsetX + 175 + offset,
            y: offsetY + 72,
            text: isEn() ? name : label,
            fill: 'black',
            fontSize: 12,
            lineHeight: 20,
            opacity: 0.85,
            textBaseline: 'middle',
            textAlign: 'end',
            cursor: 'pointer',
          },
          name: 'statement-output-title',
        });

        group.addShape('image', {
          attrs: {
            x: offsetX + 180 + offset,
            y: offsetY + 64,
            width: 16,
            height: 16,
            img: resolveLogicEditorAsset(`../img/statement_anchor${connected ? '' : '_light'}.svg`),
            cursor: 'pointer',
          },
          anchorTag: AnchorTag.STATEMENT_OUTPUT,
          anchorIndex: index,
          name: 'statement-output-img',
        });
      }

      // 参数输入
      const variableInputAnchors = anchorConfigs.filter((anchor) => anchor[2].tag === AnchorTag_DTS.VAR_INPUT);

      if (variableInputAnchors && variableInputAnchors.length) {
        _.forEach(variableInputAnchors, (anchor, order) => {
          const { index, connected, data: { label, name, constOrVariable } } = anchor[2];

          group.addShape('image', {
            attrs: {
              x: offsetX + 20,
              y: offsetY + 66 + order * 30,
              width: 14,
              height: 14,
              img: getImgByType(type, 'in', !!connected),
              cursor: 'pointer',
              anchor_index: index,
            },
            anchorTag: AnchorTag.VAR_INPUT,
            anchorIndex: index,
            name: 'variable-input-img',
          });

          const text = (isEn() ? name : label) ?? '';
          const textEllipsis = getNodeTextSize(text) > 9 ? text.substring(0, 6) + '...' : text;

          const variableInputText = group.addShape('text', {
            attrs: {
              x: offsetX + 40,
              y: offsetY + 74 + order * 30,
              text: textEllipsis,
              fill: 'black',
              fontSize: 12,
              lineHeight: 20,
              opacity: 0.85,
              textBaseline: 'middle',
              textAlign: 'start',
              cursor: 'pointer',
              anchor_index: index,
            },
            name: 'variable-input-text',
          });

          // 使用常量显示的小圆点
          group.addShape('image', {
            attrs: {
              x: offsetX + 40 + variableInputText.getBBox().width + 6,
              y: offsetY + 66 + order * 30,
              width: 6,
              height: 6,
              opacity: constOrVariable === ConstOrVariable_DTS.USE_CONST ? 1 : 0,
              img: resolveLogicEditorAsset(`../img/circle-sm.svg`),
              cursor: 'pointer',
            },
            anchorIndex: index,
            name: 'badge',
          });

        });
      }

      // 参数输出
      const variableOutputAnchors = anchorConfigs.filter((anchor) => anchor[2].tag === AnchorTag_DTS.VAR_OUTPUT);

      if (variableOutputAnchors && variableOutputAnchors.length) {
        _.forEach(variableOutputAnchors, (anchor, order) => {
          const { index, connected, data: { label, name } } = anchor[2];

          group.addShape('image', {
            attrs: {
              x: offsetX + 180 + offset,
              y: offsetY + 66 + order * 30,
              width: 14,
              height: 14,
              img: getImgByType(type, 'out', !!connected),
              cursor: 'pointer',
              anchor_index: index,
            },
            anchorTag: AnchorTag.VAR_OUTPUT,
            anchorIndex: index,
            name: 'variable-output-img',
          });

          const text = (isEn() ? name : label) ?? '';
          const textEllipsis = getNodeTextSize(text) > 9 ? text.substring(0, 6) + '...' : text;

          group.addShape('text', {
            attrs: {
              x: offsetX + 176 + offset,
              y: offsetY + 74 + order * 30,
              text: textEllipsis,
              fill: 'black',
              fontSize: 12,
              lineHeight: 20,
              opacity: 0.85,
              textBaseline: 'middle',
              textAlign: 'end',
              cursor: 'pointer',
              anchor_index: index,
            },
            name: 'variable-output-text',
          });
        });
      }

      group.sort();
    },

    /**
     * 配置锚点
     * @param cfg
     * @returns
     */
    getAnchorPoints(cfg: IModelConfig): AnchorBaseConfigWithPosition[] {
      assertNodeConfig(cfg, '计算动态节点锚点');
      // 这部分的逻辑根据后台返回的数据配置(getConfig)
      const nodeConfigData = cfg.data;
      const anchors = nodeConfigData.anchors;
      if (!anchors[0] || !anchors[1] || !anchors[2]) {
        throw new Error(`动态节点 ${cfg.id} 至少需要三个锚点`);
      }

      const currentNodeHeight = cfg.nodeHeight ?? nodeHeight ?? 134;
      return [
        [0, 72 / currentNodeHeight, anchors[0]],
        [1, 72 / currentNodeHeight, anchors[1]],
        [0, 107 / currentNodeHeight, anchors[2]],
      ];
    },
  };

  G6.registerNode(type, nodeDefinition as ShapeOptions, BlockNames_DTS.LOGIC_BASE_NODE);
}
