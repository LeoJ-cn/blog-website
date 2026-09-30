import type { IG6GraphEvent, IGraph } from '@antv/g6';
import { IG6 } from '../../interface';
import { getEventItem } from './event-guard';

interface HoverNodeBehavior {
  graph: IGraph;
  shouldBegin: (e?: IG6GraphEvent) => boolean;
}

export default (G6: IG6) => {
  G6.registerBehavior('hover-node', {
    getEvents() {
      return {
        'node:mouseenter': 'onNodeEnter',
        'node:mouseleave': 'onNodeLeave',
      };
    },
    shouldBegin(_e?: IG6GraphEvent) {
      return true;
    },
    onNodeEnter(this: HoverNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      // 显示当前节点的锚点
      this.graph.emit('before-anchor-show', e);
      // e.item.setState('anchorShow', true); // 二值状态
    },
    onNodeLeave(this: HoverNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      // 将锚点再次隐藏
      getEventItem(e, '节点移出事件').setState('anchorShow', false); // 二值状态
    },
  });
};
