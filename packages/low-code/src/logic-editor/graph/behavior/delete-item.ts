import { IG6 } from '../../interface';
import { Graph, type IG6GraphEvent, type Item } from '@antv/g6';

interface DeleteItemBehavior {
  graph: Graph;
  shouldBegin: (e?: IG6GraphEvent) => boolean;
}

export default (G6: IG6) => {
  G6.registerBehavior('delete-item', {
    getEvents() {
      return {
        'keydown': 'onKeydown',
      };
    },
    shouldBegin(_e?: IG6GraphEvent) {
      return true;
    },
    onKeydown(this: DeleteItemBehavior, e: IG6GraphEvent) {
      const graph = this.graph;
      // if (graph.cfg.canvas.cfg.el.getAttribute('isFocused') !== 'true') return;
      if (!this.shouldBegin(e)) return;
      /**
       * TODO: 暂且不删除
       * 删除节点时, 将与该节点连接的后代节点也删除
       */
      if (e.keyCode === 8 || e.keyCode === 46) {
        const nodes = graph.findAllByState('node', 'nodeState:selected');

        if (nodes && nodes.length) {
          const $node = nodes[0].getContainer().get('item') as Item;

          graph.emit('before-node-removed', {
            target: $node,
            callback(confirm: boolean) {
              if (confirm) {
                graph.remove($node);
                graph.set('after-node-selected', []);
                graph.emit('after-node-selected');
                graph.emit('after-node-removed', $node);
              }
            },
          });
        }

        // 删除选中的边
        const edges = graph.findAllByState('edge', 'edgeState:selected');

        if (edges && edges.length) {
          const $edge = edges[0].getContainer().get('item');

          graph.emit('before-edge-removed', {
            target: $edge,
            callback(confirm: boolean) {
              if (confirm) {
                graph.remove($edge);
                graph.set('after-edge-selected', []);
                // 提交事件
                graph.emit('after-edge-selected');
                graph.emit('after-edge-removed', $edge);
              }
            },
          });
        }
      }
    },
  });
};
