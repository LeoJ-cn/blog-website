import { AnchorTag, IG6 } from '../../interface';

export default (G6: IG6) => {
  G6.registerBehavior('drag-shadow-node', {
    getDefaultCfg() {
      return {
        isGragging: false,
        sourceAnchorIndex: 0,
        // 记录当前拖拽模式(拖拽目标可能是节点也可能是锚点)
        dragTarget: 'node',
        dragStartNode: {},
        distance: [], // 鼠标距离节点中心位置的距离
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
    shouldBegin(e) {
      return true;
    },
    // 鼠标按下显示锚点光圈
    onMousedown(e) {
      if (!this.shouldBegin(e)) return;
      this._clearSelected(e);
      if (e.target.cfg.isAnchor) {
        // 拖拽锚点
        this.dragTarget = 'anchor';
        this.dragStartNode = {
          ...e.item._cfg,
          anchorIndex: e.target.cfg.index,
          anchorData: e.target.cfg.anchorData, // 把当前点击的锚点也挂载上去
        };
        const nodes = this.graph.findAll('node', node => node);

        nodes.forEach(node => {
          node.setState('anchorActived', true);
        });

        // > feat: 语句锚点,已经被连接的锚点不能再被连接
        if ([AnchorTag.STATEMENT_OUTPUT, AnchorTag.STATEMENT_INPUT].includes(e.target.cfg?.anchorData?.tag)) {
          const index = e.target.cfg.anchorData.index;
          const edges = this.graph.getEdges();
          const exist = edges.find((edge) => (edge._cfg.model.source === e.target.cfg.nodeId) && (edge._cfg.model.sourceAnchor === index));
          if (exist) {
            if (!this.shouldBegin(e)) return;
            this.isGragging = false;
            const nodes = this.graph.findAll('node', node => node);
            nodes.forEach(node => {
              node.clearStates('anchorActived');
            });
            return;
          }
        }
      }
      this.graph.emit('on-node-mousedown', e);
    },
    onMouseup(e) {
      if (!this.shouldBegin(e)) return;
      if (this.dragTarget === 'anchor') {
        const nodes = this.graph.findAll('node', node => node);

        nodes.forEach(node => {
          node.clearStates('anchorActived');
        });
      }
      this.graph.emit('on-node-mouseup', e);
    },
    // 拖拽开始
    onDragStart(e) {
      if (!this.shouldBegin(e)) return;
      const group = e.item.getContainer();

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
        e.item.toFront();
        this.dragTarget = 'node';
        this._nodeOnDragStart(e, group);
      }
      this.graph.emit('on-node-dragstart', e);
    },
    // 拖拽中
    onDrag(e) {
      if (!this.shouldBegin(e)) return;
      if (this.isGragging) {
        const group = e.item.getContainer();

        if (this.dragTarget === 'node' && group.getFirst().cfg.xShapeNode) {
          this._nodeOnDrag(e, e.item.getContainer());
        }
        this.graph.emit('on-node-drag', e);
      }
    },
    // 拖拽结束
    onDragEnd(e) {
      if (!this.shouldBegin(e)) return;
      const group = e.item.getContainer();

      this.isGragging = false;
      if (this.dragTarget === 'anchor') {
        const nodes = this.graph.findAll('node', node => node);

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
    onDrop(e) {
      if (!this.shouldBegin(e)) return;
      // e.item 当前拖拽节点 | e.target 当前释放节点
      if (
        this.dragStartNode.id &&
        e.target.cfg.isAnchor &&
        this.dragStartNode.id !== e.target.cfg.nodeId
      ) {
        const sourceNode = this.dragStartNode.group.get('item');
        const targetNode = e.item.getContainer().get('item');
        const { singleEdge } = sourceNode.getModel(); // 同个source和同个target只能有1条线
        const targetAnchorIndex = e.target.get('index');
        const edges = sourceNode.getOutEdges();

        const hasLinked = edges.find(edge => {
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
    _dragNodeModeCheck() {
      const currentMode = this.graph.get('modes')[this.graph.getCurrentMode()];

      if (currentMode.includes('drag-node')) {
        return true;
      }
      return false;
    },

    /**
     * @description 节点拖拽开始事件
     */
    _nodeOnDragStart(e, group) {
      this._dragNodeModeCheck();
      this._addShadowNode(e, group);
    },

    /**
     * @description 添加虚拟节点
     */
    _addShadowNode(e, group) {
      const item = group.get('item');
      const model = item.get('model');
      const { width, height, centerX, centerY } = item.getBBox();

      let attrs = {
        fillOpacity: 0.1,
        fill: '#1890FF',
        stroke: '#1890FF',
        cursor: 'move',
        lineDash: [4, 4],
        width,
        height,
        x: model.x,
        y: model.y,
      } as any;

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
    _nodeOnDrag(e, group) {
      // 记录鼠标拖拽时与图形中心点坐标的距离
      const item = group.get('item');
      const pathAttrs = group.getFirst();
      const { width, height, centerX, centerY } = item.getBBox();
      const shadowNode = pathAttrs.cfg.xShapeNode
        ? group.$getItem('shadow-node')
        : null;

      shadowNode.attr({
        x: e.x - centerX - this.distance[0],
        y: e.y - centerY - this.distance[1],
      });
      shadowNode.toFront();
    },

    /**
     * @description 节点拖拽结束事件
     */
    _nodeOnDragEnd(e, group) {
      const { graph } = this;
      const model = e.item.getModel();

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
          graph.updateItem(e.item, pos);
        }
      }
    },
    // 清空已选的边
    _clearSelected(e) {
      const selectedEdges = this.graph.findAllByState(
        'edge',
        'edgeState:selected',
      );

      selectedEdges.forEach(edge => {
        edge.clearStates(['edgeState:selected', 'edgeState:hover']);
      });
    },
  });
};

