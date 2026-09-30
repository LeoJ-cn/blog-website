import type { IG6GraphEvent, IGraph } from '@antv/g6';
import { IG6 } from '../../interface';
import { getEventItem } from './event-guard';

interface SelectNodeBehavior {
  graph: IGraph;
  shouldBegin: (e?: IG6GraphEvent) => boolean;
  _clearSelected: () => void;
}

export default (G6: IG6) => {
  G6.registerBehavior('select-node', {
    getDefaultCfg() {
      return {
        multiple: false,
      };
    },

    getEvents() {
      return {
        'node:click': 'onNodeClick',
        'node:dblclick': 'onDblClick',
        'canvas:click': 'onCanvasClick',
        'node:mouseenter': 'onNodeMouseEnter',
        'node:mousemove': 'onNodeMouseMove',
        'node:mouseleave': 'onNodeMouseLeave',
      };
    },
    shouldBegin(_e?: IG6GraphEvent) {
      return true;
    },

    onNodeClick(this: SelectNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      const item = getEventItem(e, '点击节点事件');
      // 先将所有当前是 click 状态的节点/edge 置为非 selected 状态
      this._clearSelected();
      item.toFront();
      // 获取被点击的节点元素对象, 设置当前节点的 click 状态为 selected
      item.setState('nodeState', 'selected');
      // 将点击事件发送给 graph 实例
      this.graph.emit('after-node-selected', e);
    },
    onDblClick(this: SelectNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      const item = getEventItem(e, '双击节点事件');
      // 先将所有当前是 click 状态的节点/edge 置为非 selected 状态
      this._clearSelected();
      item.toFront();
      // 获取被点击的节点元素对象, 设置当前节点的 click 状态为 true
      item.setState('nodeState', 'selected');
      // 将点击事件发送给 graph 实例
      this.graph.emit('after-node-dblclick', e);
    },
    onCanvasClick(this: SelectNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      this._clearSelected();
      this.graph.emit('on-canvas-click', e);
    },
    // hover node
    onNodeMouseEnter(this: SelectNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      const item = getEventItem(e, '节点移入事件');
      if (!item.hasState('nodeState:selected')) {
        item.setState('nodeState', 'hover');
      }
      this.graph.emit('on-node-mouseenter', e);
    },
    onNodeMouseMove(this: SelectNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      this.graph.emit('on-node-mousemove', e);
    },
    // 移出 node
    onNodeMouseLeave(this: SelectNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      const item = getEventItem(e, '节点移出事件');
      // hasState 判断当前元素是否存在某种状态
      if (!item.hasState('nodeState:selected')) {
        item.clearStates('nodeState:hover');
      }
      this.graph.emit('on-node-mouseleave', e);
    },
    // 清空已选
    _clearSelected(this: SelectNodeBehavior) {
      const selectedNodes = this.graph.findAllByState('node', 'nodeState:selected');
      selectedNodes.forEach(node => {
        node.clearStates(['nodeState:selected', 'nodeState:hover']);
      });
      const selectedEdges = this.graph.findAllByState('edge', 'edgeState:selected');
      selectedEdges.forEach(edge => {
        edge.clearStates(['edgeState:selected', 'edgeState:hover']);
      });
      this.graph.emit('after-node-selected');
    },
  });
};
