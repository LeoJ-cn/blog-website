import { IG6 } from '../../interface';
import type { IG6GraphEvent, IGraph } from '@antv/g6';

interface CanvasEventBehavior {
  graph: IGraph;
}

export default (G6: IG6) => {
  G6.registerBehavior('canvas-event', {
    getDefaultCfg() {
      return {};
    },
    shouldBegin(_e?: IG6GraphEvent) {
      return true;
    },
    getEvents() {
      return {
        'canvas:mousemove': 'onCanvasMouseMove',
        'canvas:mousedown': 'onCanvasMouseDown',
        'canvas:mouseup': 'onCanvasMouseUp',
        'canvas:dragend': 'onCanvasDragEnd',
      };
    },
    onCanvasMouseMove(e: IG6GraphEvent) {
      e.target.get('el').style.cursor = 'grab';
    },
    onCanvasMouseDown(e: IG6GraphEvent) {
      e.target.get('el').style.cursor = 'grabbing';
    },
    onCanvasMouseUp(e: IG6GraphEvent) {
      e.target.get('el').style.cursor = 'grab';
    },
    onCanvasDragEnd(this: CanvasEventBehavior, e: IG6GraphEvent) {
      e.target.get('el').style.cursor = 'grab';
      this.graph.emit('on-canvas-dragend', e);
    },
  });
};
