import type { IG6GraphEvent, IGraph } from '@antv/g6';
import { IG6 } from '../../interface';
import { getEventItem } from './event-guard';

interface ActiveEdgeBehavior {
  graph: IGraph;
  shouldBegin: (e?: IG6GraphEvent) => boolean;
  _clearSelected: () => void;
}

export default (G6: IG6) => {
  G6.registerBehavior('active-edge', {
    getDefaultCfg() {
      return {
        // editMode: false, // 当前的编辑状态
      };
    },
    getEvents() {
      return {
        'canvas:click': 'onCanvasClick',
        'edge:click': 'onEdgeClick',
        'edge:dblclick': 'ondblEdgeClick',
        'edge:mouseenter': 'onMouseEnter',
        'edge:mousemove': 'onMouseMove',
        'edge:mouseleave': 'onMouseLeave',
      };
    },
    shouldBegin(_e?: IG6GraphEvent) {
      return true;
    },
    onCanvasClick(this: ActiveEdgeBehavior) {
      this._clearSelected();
    },
    onEdgeClick(this: ActiveEdgeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      const item = getEventItem(e, '点击边事件');
      item.toFront();
      this._clearSelected();
      // 设置当前节点的 click 状态为 true
      item.setState('edgeState', 'selected');
      // this.graph.setItemState(e.item, 'edgeState', 'selected');
      // 将点击事件发送给 graph 实例
      this.graph.emit('after-edge-selected', e);
    },
    ondblEdgeClick(this: ActiveEdgeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      const item = getEventItem(e, '双击边事件');

      this._clearSelected();
      // 设置当前节点的 click 状态为 true
      item.setState('edgeState', 'selected');
      // 将点击事件发送给 graph 实例
      this.graph.emit('after-edge-dblclick', e);
    },
    // hover edge
    onMouseEnter(this: ActiveEdgeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      const item = getEventItem(e, '边移入事件');

      if (!item.hasState('edgeState:hover') && !item.hasState('edgeState:selected')) {
        item.setState('edgeState', 'hover');
      }
      this.graph.emit('on-edge-mouseenter', e);
    },
    onMouseMove(this: ActiveEdgeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;

      this.graph.emit('on-edge-mousemove', e);
    },
    // out edge
    onMouseLeave(this: ActiveEdgeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      const item = getEventItem(e, '边移出事件');

      if (!item.hasState('edgeState:selected')) {
        item.setState('edgeState', 'default');
      }
      this.graph.emit('on-edge-mouseleave', e);
    },
    // 清空已选
    _clearSelected(this: ActiveEdgeBehavior) {
      const selectedNodes = this.graph.findAllByState('node', 'nodeState:selected');

      selectedNodes.forEach(node => {
        node.clearStates('nodeState:selected');
      });

      const selectedEdges = this.graph.findAllByState('edge', 'edgeState:selected');

      selectedEdges.forEach(edge => {
        edge.clearStates('edgeState:selected');
      });
      this.graph.emit('after-edge-selected');
    },
  });
};
