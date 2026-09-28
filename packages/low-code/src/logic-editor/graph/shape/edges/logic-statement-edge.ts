import { resolveLogicEditorAsset } from '../../icon-map';
import { IG6, IIGroup, INodeConfig } from '../../../interface';
import itemEvents from '../../behavior/item-event';

export const LOGIC_STATEMENT_EDGE = 'logic-statement-edge';

const offset = 100;

function getPath(start: any, end: any) {
  let cx1: any, cx2: any, cy1: any, cy2: any;
  if (start.x <= end.x) {
    const temp = (end.x - start.x) / 2;
    const delta = temp > offset ? temp : offset;
    cx1 = start.x + delta;
    cx2 = end.x - delta;
    cy1 = start.y;
    cy2 = end.y;
  }
  if (start.x > end.x) {
    cx1 = start.x + offset;
    cx2 = end.x - offset > 0 ? end.x - offset : 0;
    cy1 = start.y;
    cy2 = end.y;
  }
  const path = [
    ['M', start.x, start.y],
    ['C', cx1, cy1, cx2, cy2, end.x, end.y - 4],
    ['L', end.x, end.y],
  ];
  return path;
}

export default (G6: IG6) => {
  G6.registerEdge(
    LOGIC_STATEMENT_EDGE,
    {
      draw(cfg: INodeConfig, group: IIGroup) {
        let start: any, end: any;
        start = cfg.startPoint;
        end = cfg.endPoint;
        let path = getPath(start, end);

        const keyShape = group.addShape('path', {
          attrs: {
            id: 'edge',
            path: path,
            stroke: '#1890FF',
            lineAppendWidth: 10,
            ...cfg.style,
          },
          zIndex: 2,
        });
        return keyShape;
      },
      afterDraw(cfg: INodeConfig, group: IIGroup) {
        const shape = group.get('children')[0];
        shape.hide();

        const width = 10;
        const height = 10;
        const length = shape.getTotalLength();
        const step = 1;
        let last;

        function next(cur) {
          const p = shape.getPoint(cur / length);

          if (last && p) {
            const distance = Math.pow(Math.pow(last.x - p.x, 2) + Math.pow(last.y - p.y, 2), 0.5);
            if (distance > width) {
              let x = last.x - width / 2;
              let y = last.y - height / 2;

              const shape = group.addShape('image', {
                attrs: {
                  x,
                  y,
                  img: resolveLogicEditorAsset('../../img/rightarrow2.svg'),
                },
                name: 'tile-shape',
                zIndex: 1,
              });

              let r = Math.atan((p.y - last.y) / (p.x - last.x));

              if (p.x - last.x < 0) {
                r = Math.PI + r;
              }
              shape.rotateAtPoint(x + width / 2, y + height / 2, r);
              last = p;
            }
          } else {
            last = p;
          }

          if (cur > length) {
            return;
          }
          next(cur + step);
        }

        next(0);
      },
      setState(name, value, item) {
        const buildInEvents = [
          'edgeState',
          'edgeState:default',
          'edgeState:selected',
          'edgeState:hover',
        ];
        const group = item.getContainer();

        if (group.get('destroyed')) return;
        if (buildInEvents.includes(name)) {
          // 内部this绑定到了当前item实例
          itemEvents[name].call(this, value, group);
        } else if (this.stateApplying) {
          this.stateApplying.call(this, name, value, item);
        } else {
          console.warn(`warning: edge ${name} 事件回调未注册!`);
        }
      },
      update: null, // 发生变化时候,强制重新渲染
    },
    'cubic',
  );
};
