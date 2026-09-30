import type { IElement, ShapeAttrs } from '@antv/g-base';
import type { INode, IShape } from '@antv/g6';
import { IIGroup, IModelConfig, IShapeOptions, assertNodeConfig } from '../../interface';
import { LOGIC_STATEMENT_EDGE } from './../shape/edges/logic-statement-edge';
import { LOGIC_VARIABLE_EDGE } from './../shape/edges/logic-variable-edge';

function setStyle(item: IElement, nodeStyle: ShapeAttrs): void {
  item.attr(nodeStyle);
}

function getItemStyle(type: 'node' | 'edge', group: IIGroup, state = 'hover') {
  const item = group.get('item');
  const attrs = group.getFirst().attr() as ShapeAttrs & { style: Record<string, ShapeAttrs> };
  const storedOriginStyle = item.get('originStyle') as ShapeAttrs & { 'edge-shape'?: ShapeAttrs };
  const originStyle = type === 'node' ? storedOriginStyle : storedOriginStyle['edge-shape'];
  const activeStyle = attrs.style[`${type}State:${state}`];
  const defaultStyle = attrs.style[`${type}State:default`];

  if (type === 'edge' && defaultStyle && !defaultStyle.lineWidth) {
    defaultStyle.lineWidth = 1;
  }

  return {
    activeStyle,
    defaultStyle,
    originStyle,
  };
}

type ItemStateHandler = (value: string | boolean, group: IIGroup) => void | false;

const events: Record<string, ItemStateHandler> = {
  /**
   * @description 锚点事件
   * 显示/隐藏锚点
   */
  anchorShow(value: string | boolean, group: IIGroup) {
    // 锚点全局开关
    // changeData 时由于实例没销毁, 这里需要处理异常
    if (group.get('children')) {
      const { anchorControls } = group.getFirst().cfg.attrs;
      if (anchorControls && anchorControls.hide) return false;
    }

    if (value) {
      group.showAnchor(group);
    } else {
      group.clearAnchor(group);
    }
  },

  /**
   * @description 锚点激活事件
   */
  anchorActived(value: string | boolean, group: IIGroup) {
    const _this = this as IShapeOptions;
    // 锚点全局开关
    if (group.get('children')) {
      const { anchorControls } = group.getFirst().cfg.attrs;
      if (anchorControls && anchorControls.hide) {
        return false;
      }
    }

    if (value) {
      const node = group.get('item') as INode;
      const nodeCfg = node.getModel();
      assertNodeConfig(nodeCfg, '激活节点锚点');
      if (nodeCfg.nodeWidth === undefined || nodeCfg.nodeHeight === undefined) {
        throw new Error(`节点 ${nodeCfg.id} 尚未完成尺寸计算`);
      }
      group.showAnchor(group);
      const anchorPoints = _this.getAnchorPoints?.(nodeCfg as IModelConfig) ?? [];
      anchorPoints.forEach((p, i) => {
        const bbox = group.getFirst().getBBox();
        // 激活元素
        const hotspot = group.addShape('circle', {
          zIndex: 0,
          attrs: {
            x: bbox.minX + bbox.width * p[0],
            y: bbox.minY + bbox.height * p[1],
            r: 0,
            opacity: 0.5,
            fill: '#1890ff',
            // ...anchorHotsoptStyles,
          },
          nodeId: group.get('item').get('id'),
          className: 'node-anchor-bg',
          draggable: true,
          isAnchor: true,
          index: i,
        });

        // 锚点动画
        hotspot.animate({ r: 11 }, {
          duration: 200,
        });

        group.sort(); // 将group中的元素按照 zIndex 从大到小排序
        group.anchorShapes.push(hotspot);
      });

      group.anchorShapes.filter(item => {
        if (item.get('className') === 'node-anchor') {
          item.toFront();
        }
        if (item.get('className') === 'node-anchor-group') {
          item.attr({
            r: 13,
          });
          item.toFront();
        }
      });
    } else {
      group.clearAnchor(group);
    }
  },

  /**
   * @description 边多状态事件
   */
  nodeState(value: string | boolean, group: IIGroup) {
    const _this = this as IShapeOptions;
    if (value === false) {
      // 清除所有状态
      events['nodeState:default'].call(_this, true, group);
    } else {
      events[`nodeState:${value}`] && events[`nodeState:${value}`].call(_this, value, group);
    }
  },

  /**
   * @description 节点恢复默认状态事件
   */
  'nodeState:default'(value: string | boolean, group: IIGroup) {
    const _this = this as IShapeOptions;

    if (value) {
      const node = group.getChildByIndex(0);
      const { defaultStyle } = getItemStyle.call(_this, 'node', group);
      if (!defaultStyle) return;
      setStyle(node, defaultStyle);
    }
  },

  /**
   * @description 节点selected事件
   */
  'nodeState:selected'(value: string | boolean, group: IIGroup) {
    const _this = this as IShapeOptions;
    const node = group.getChildByIndex(0);
    const { activeStyle, defaultStyle } = getItemStyle.call(_this, 'node', group, 'selected');
    if (!activeStyle) return;
    if (value) {
      setStyle(node, activeStyle);
    } else {
      setStyle(node, defaultStyle);
    }
  },

  /**
   * @description 节点hover事件
   */
  'nodeState:hover'(value: string | boolean, group: IIGroup) {
    const _this = this as IShapeOptions;
    const node = group.getChildByIndex(0);
    const { activeStyle, defaultStyle } = getItemStyle.call(_this, 'node', group, 'hover');

    if (!activeStyle) return;
    if (value) {
      setStyle(node, activeStyle);
    } else {
      setStyle(node, defaultStyle);
    }
  },

  /**
   * @description 边多状态事件
   */
  edgeState(value: string | boolean, group: IIGroup) {
    if (value === false) {
      events['edgeState:default'].call(this, true, group);
    } else {
      events[`edgeState:${value}`] && events[`edgeState:${value}`].call(this, value, group);
    }
  },

  /**
 * @description 边恢复默认状态事件
 */
  'edgeState:default'(value: string | boolean, group: IIGroup) {
    const item = group.get('item');
    const model = item.getModel();
    const { type } = model;

    if (type === LOGIC_STATEMENT_EDGE) {
      if (value) {
        const edge = group.getChildByIndex(0);
        edge.hide();
      }
    } else if (type === LOGIC_VARIABLE_EDGE) {
      const children = group.get('children') as IShape[];
      const pathShapeBg = children.find((path) => path.get('name') === 'path-shape-bg');
      const pathShape = children.find((path) => path.get('name') === 'path-shape');

      if (value && pathShape && pathShapeBg) {
        pathShape.attr({
          lineWidth: 2,
        });
        pathShapeBg.hide();
      }
    }

  },


  /**
   * @description edge hover事件
   */
  'edgeState:hover'(value: string | boolean, group: IIGroup) {
    const path = group.getChildByIndex(0);
    const item = group.get('item');
    const model = item.getModel();
    const { type } = model;

    if (type === LOGIC_STATEMENT_EDGE) {
      if (value) {
        path.show();
      } else {
        path.hide();
      }
    } else if (type === LOGIC_VARIABLE_EDGE) {
      const children = group.get('children') as IShape[];
      const pathShapeBg = children.find((path) => path.get('name') === 'path-shape-bg');
      const pathShape = children.find((path) => path.get('name') === 'path-shape');
      if (!pathShape || !pathShapeBg) return;

      if (value) {
        pathShape.attr({
          lineWidth: 3,
        });
        pathShapeBg.show();
      } else {
        pathShape.attr({
          lineWidth: 2,
        });
        pathShapeBg.hide();
      }
    }
  },

  /**
  * @description edge 选中事件
  */
  'edgeState:selected'(value: string | boolean, group: IIGroup) {
    const path = group.getChildByIndex(0);
    const item = group.get('item');
    const model = item.getModel();
    const { type } = model;

    if (type === LOGIC_STATEMENT_EDGE) {
      if (value) {
        path.show();
      } else {
        path.hide();
      }
    } else if (type === LOGIC_VARIABLE_EDGE) {
      const children = group.get('children') as IShape[];
      const pathShapeBg = children.find((path) => path.get('name') === 'path-shape-bg');
      const pathShape = children.find((path) => path.get('name') === 'path-shape');
      if (!pathShape || !pathShapeBg) return;

      if (value) {
        pathShape.attr({
          lineWidth: 3,
        });
        pathShapeBg.show();
      } else {
        pathShape.attr({
          lineWidth: 2,
        });
        pathShapeBg.hide();
      }
    }
  },
};

export default events;
