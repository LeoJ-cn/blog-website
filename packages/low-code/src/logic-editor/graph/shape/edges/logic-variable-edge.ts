import { IG6, IIGroup, INodeConfig } from '../../../interface';
import itemEvents from '../../behavior/item-event';
import { getBgColorByColor } from '../../util';

export const LOGIC_VARIABLE_EDGE = 'logic-variable-edge';
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
    LOGIC_VARIABLE_EDGE,
    {
      draw(cfg: INodeConfig, group: IIGroup) {
        let start: any, end: any;
        start = cfg.startPoint;
        end = cfg.endPoint;

        const mainColor = cfg.style.stroke;
        const bgColor = getBgColorByColor(mainColor);
        let path = getPath(start, end);

        // 主色
        const keyShape = group.addShape('path', {
          attrs: {
            path: path,
            lineAppendWidth: 10,
            ...cfg.style,
            stroke: mainColor,
            lineWidth: 2,
          },
          zIndex: 1,
          name: 'path-shape',
        });
        // 背景色
        const pathShapeBg = group.addShape('path', {
          attrs: {
            path: path,
            lineAppendWidth: 10,
            ...cfg.style,
            stroke: bgColor,
            lineWidth: 7,
          },
          zIndex: 0,
          name: 'path-shape-bg',
        });

        pathShapeBg.hide();
        group.sort();

        return keyShape;
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

