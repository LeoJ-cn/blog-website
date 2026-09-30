import type { ShapeAttrs } from '@antv/g-base';
import type { IG6GraphEvent, IGraph, INode, Item } from '@antv/g6';
import { AnchorTag, IG6, IIGroup } from '../../interface';
import { getEventItem } from './event-guard';

interface DragStartNode {
  id?: string;
  group?: IIGroup;
  anchorIndex?: number;
  anchorData?: unknown;
}

interface DragShadowNodeBehavior {
  graph: IGraph;
  isGragging: boolean;
  sourceAnchorIndex: number;
  dragTarget: 'node' | 'anchor';
  dragStartNode: DragStartNode;
  distance: [number, number];
  origin: { x: number; y: number };
  shouldBegin: (e?: IG6GraphEvent) => boolean;
  _clearSelected: (e: IG6GraphEvent) => void;
  _dragNodeModeCheck: () => boolean;
  _nodeOnDragStart: (e: IG6GraphEvent, group: IIGroup) => void;
  _addShadowNode: (e: IG6GraphEvent, group: IIGroup) => void;
  _nodeOnDrag: (e: IG6GraphEvent, group: IIGroup) => void;
  _nodeOnDragEnd: (e: IG6GraphEvent, group: IIGroup) => void;
}

export default (G6: IG6) => {
  G6.registerBehavior('drag-shadow-node', {
    getDefaultCfg() {
      return {
        isGragging: false,
        sourceAnchorIndex: 0,
        // 记录当前拖拽模式(拖拽目标可能是节点也可能是锚点)
        dragTarget: 'node',
        dragStartNode: {},
        distance: [0, 0], // 鼠标距离节点中心位置的距离
      };
    },
    getEvents() {
      return {
        'node:mousedown': 'onMousedown',
        'node:mouseup': 'onMouseup',
        'node:dragstart': 'onDragStart',
        'node:drag': 'onDrag',
        'node:dragend': 'onDragEnd',
        'node:drop': 'onDrop',
      };
    },
    shouldBegin(_e?: IG6GraphEvent) {
      return true;
    },
    // 鼠标按下显示锚点光圈
    onMousedown(this: DragShadowNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      this._clearSelected(e);
      const item = getEventItem(e, '节点按下事件');
      if (e.target.cfg.isAnchor) {
        // 拖拽锚点
        this.dragTarget = 'anchor';
        this.dragStartNode = {
          id: item.getID(),
          group: item.getContainer() as IIGroup,
          anchorIndex: e.target.cfg.index,
          anchorData: e.target.cfg.anchorData, // 把当前点击的锚点也挂载上去
        };
        const nodes = this.graph.findAll('node', (node: Item) => Boolean(node));

        nodes.forEach(node => {
          node.setState('anchorActived', true);
        });

        // > feat: 语句锚点,已经被连接的锚点不能再被连接
        if ([AnchorTag.STATEMENT_OUTPUT, AnchorTag.STATEMENT_INPUT].includes(e.target.cfg?.anchorData?.tag)) {
          const index = e.target.cfg.anchorData.index;
          const edges = this.graph.getEdges();
          const exist = edges.find((edge) => {
            const edgeModel = edge.getModel();
            return edgeModel.source === e.target.cfg.nodeId && edgeModel.sourceAnchor === index;
          });
          if (exist) {
            if (!this.shouldBegin(e)) return;
            this.isGragging = false;
            const nodes = this.graph.findAll('node', (node: Item) => Boolean(node));
            nodes.forEach(node => {
              node.clearStates('anchorActived');
            });
            return;
          }
        }
      }
      this.graph.emit('on-node-mousedown', e);
    },
    onMouseup(this: DragShadowNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      if (this.dragTarget === 'anchor') {
        const nodes = this.graph.findAll('node', (node: Item) => Boolean(node));

        nodes.forEach(node => {
          node.clearStates('anchorActived');
        });
      }
      this.graph.emit('on-node-mouseup', e);
    },
    // 拖拽开始
    onDragStart(this: DragShadowNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      const item = getEventItem(e, '节点拖拽开始事件');
      const group = item.getContainer() as IIGroup;

      this.isGragging = true;
      this.origin = {
        x: e.x,
        y: e.y,
      };
      if (e.target.get('isAnchor')) {
        // 拖拽锚点, 记录当前点击的锚点 index
        this.sourceAnchorIndex = e.target.get('index');
      } else if (group.getFirst().cfg.xShapeNode) {
        // 拖拽自定义节点
        item.toFront();
        this.dragTarget = 'node';
        this._nodeOnDragStart(e, group);
      }
      this.graph.emit('on-node-dragstart', e);
    },
    // 拖拽中
    onDrag(this: DragShadowNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      if (this.isGragging) {
        const item = getEventItem(e, '节点拖拽事件');
        const group = item.getContainer() as IIGroup;

        if (this.dragTarget === 'node' && group.getFirst().cfg.xShapeNode) {
          this._nodeOnDrag(e, group);
        }
        this.graph.emit('on-node-drag', e);
      }
    },
    // 拖拽结束
    onDragEnd(this: DragShadowNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      const item = getEventItem(e, '节点拖拽结束事件');
      const group = item.getContainer() as IIGroup;

      this.isGragging = false;
      if (this.dragTarget === 'anchor') {
        const nodes = this.graph.findAll('node', (node: Item) => Boolean(node));

        nodes.forEach(node => {
          node.clearStates('anchorActived');
        });
      } else if (
        this.dragTarget === 'node' &&
        group.getFirst().cfg.xShapeNode
      ) {
        this._nodeOnDragEnd(e, group);
      }
      this.graph.emit('on-node-dragend', e);
    },
    // 锚点拖拽结束添加边
    onDrop(this: DragShadowNodeBehavior, e: IG6GraphEvent) {
      if (!this.shouldBegin(e)) return;
      const item = getEventItem(e, '节点释放事件');
      // e.item 当前拖拽节点 | e.target 当前释放节点
      if (
        this.dragStartNode.id &&
        e.target.cfg.isAnchor &&
        this.dragStartNode.id !== e.target.cfg.nodeId
      ) {
        if (!this.dragStartNode.group) throw new Error('锚点拖拽缺少来源节点容器');
        const sourceNode = this.dragStartNode.group.get('item') as INode;
        const targetNode = item.getContainer().get('item') as INode;
        const { singleEdge } = sourceNode.getModel(); // 同个source和同个target只能有1条线
        const targetAnchorIndex = e.target.get('index');
        const edges = sourceNode.getOutEdges();

        const hasLinked = edges.find((edge: Item) => {
          // sourceAnchorIndex === targetAnchorIndex, edge.source.id === source.id, edget.target.id === target.id
          if (
            (edge.get('source').get('id') === sourceNode.get('id') &&
              edge.get('target').get('id') === e.target.cfg.nodeId &&
              edge.get('sourceAnchorIndex') === this.sourceAnchorIndex &&
              edge.get('targetAnchorIndex') === targetAnchorIndex) ||
            (singleEdge &&
              edge.get('target').get('id') === e.target.cfg.nodeId)
          ) {
            return true;
          }
        });

        if (!hasLinked) {
          this.graph.emit('before-edge-add', {
            source: sourceNode,
            target: targetNode,
            sourceAnchor: this.dragStartNode.anchorIndex,
            targetAnchor: targetAnchorIndex,
          });
        }
      }
      this.graph.emit('on-node-drop', e);
    },

    /**
     * @description 判断当前画布模式是否启用了内置的 drag-node, 因为有冲突
     */
    _dragNodeModeCheck(this: DragShadowNodeBehavior) {
      const modes = this.graph.get('modes') as Record<string, Array<string | object>>;
      const currentMode = modes[this.graph.getCurrentMode()] ?? [];

      if (currentMode.includes('drag-node')) {
        return true;
      }
      return false;
    },

    /**
     * @description 节点拖拽开始事件
     */
    _nodeOnDragStart(this: DragShadowNodeBehavior, e: IG6GraphEvent, group: IIGroup) {
      this._dragNodeModeCheck();
      this._addShadowNode(e, group);
    },

    /**
     * @description 添加虚拟节点
     */
    _addShadowNode(this: DragShadowNodeBehavior, e: IG6GraphEvent, group: IIGroup) {
      const item = group.get('item');
      const model = item.get('model');
      const { width, height, centerX, centerY } = item.getBBox();

      const attrs: ShapeAttrs = {
        fillOpacity: 0.1,
        fill: '#1890FF',
        stroke: '#1890FF',
        cursor: 'move',
        lineDash: [4, 4],
        width,
        height,
        x: model.x,
        y: model.y,
      };

      this.distance = [
        e.x - centerX + width / 2,
        e.y - centerY + height / 2,
      ];

      const shadowNode = group.addShape('rect', {
        className: 'shadow-node',
        attrs,
      });

      shadowNode.toFront();
    },

    /**
     * @description 节点拖拽事件
     */
    _nodeOnDrag(this: DragShadowNodeBehavior, e: IG6GraphEvent, group: IIGroup) {
      // 记录鼠标拖拽时与图形中心点坐标的距离
      const item = group.get('item');
      const pathAttrs = group.getFirst();
      const { width, height, centerX, centerY } = item.getBBox();
      const shadowNode = pathAttrs.cfg.xShapeNode
        ? group.$getItem('shadow-node')
        : null;
      if (!shadowNode) throw new Error('节点拖拽过程中缺少影子节点');

      shadowNode.attr({
        x: e.x - centerX - this.distance[0],
        y: e.y - centerY - this.distance[1],
      });
      shadowNode.toFront();
    },

    /**
     * @description 节点拖拽结束事件
     */
    _nodeOnDragEnd(this: DragShadowNodeBehavior, e: IG6GraphEvent, group: IIGroup) {
      const { graph } = this;
      const item = getEventItem(e, '节点拖拽结束事件');
      const model = item.getModel();
      if (model.x === undefined || model.y === undefined) {
        throw new Error(`节点 ${item.getID()} 缺少拖拽前坐标`);
      }

      const shadowNode = group.getFirst().cfg.xShapeNode
        ? group.$getItem('shadow-node')
        : null;

      if (shadowNode) {
        const x = e.x - this.origin.x + model.x;
        const y = e.y - this.origin.y + model.y;
        const pos = {
          x,
          y,
        };

        shadowNode.remove();

        if (!this._dragNodeModeCheck()) {
          // 如果当前模式中没有使用内置的 drag-node 则让画布更新节点位置
          graph.updateItem(item, pos);
        }
      }
    },
    // 清空已选的边
    _clearSelected(this: DragShadowNodeBehavior, _e: IG6GraphEvent) {
      const selectedEdges = this.graph.findAllByState(
        'edge',
        'edgeState:selected',
      );

      selectedEdges.forEach((edge: Item) => {
        edge.clearStates(['edgeState:selected', 'edgeState:hover']);
      });
    },
  });
};
