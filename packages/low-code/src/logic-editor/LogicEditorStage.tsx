import G6, { type GraphData, type IGraph, type Item } from '@antv/g6'
import type { INode } from '@antv/g6-core/lib/interface/item'
import type { IG6GraphEvent } from '@antv/g6-core/lib/types'
import { ElBreadcrumb, ElBreadcrumbItem } from 'element-plus'
import { defineComponent, type PropType } from 'vue'
import type { Data } from '../types/data'
import type { Method } from '../types/method'
import { useLowCodeContext } from '../compatibility/context'
import { GraphUtil, type GraphEventMap } from './graph/graph-util'
import { LOGIC_STATEMENT_EDGE } from './graph/shape/edges/logic-statement-edge'
import { getMethodDetialGraphData, getMethodListGraph, getVariableGraph, isVariableNode } from './graph/util'
import {
  beforeAnchorShow,
  handleKeydown,
  onAfterEdgeSelected,
  onAfterNodeDblclick,
  onAfterNodeSelectedDrop,
  onBeforeEdgeAdd,
  onBeforeItemDelete,
  onCanvasClick,
  onCanvasMouseLeave,
  onCanvasWheelzoom,
  onDrop,
  onNodeDragend,
} from './handler/event-service'
import type { IFuncNodeConfig, INodeConfig, IVarNodeConfig, NodeConfigData } from './interface'
import { StageMode } from './interface'
import { BlockNames_DTS } from './service/interface'
import { LogicEditorService } from './service/logic-service'
import styles from './styles/graph.module.scss'
import style from './styles/logic-editor.module.scss'

export default defineComponent({
  name: 'LogicEditorStage',
  props: {
    modelValue: { type: Object as PropType<GraphData>, required: true },
    methodList: { type: Array as PropType<Method[]>, default: () => [] },
    stageMode: { type: String as PropType<StageMode>, required: true },
    allDatas: { type: Array as PropType<Data[]>, default: () => [] },
  },
  emits: ['update:modelValue', 'select-node', 'change-graph'],
  data() {
    return {
      graph: null as IGraph | null,
      mode: 'drag-shadow-node',
      methodListGraph: null as GraphData | null,
      methodDetailGraphList: {} as Record<string, GraphData>,
      variableGraph: null as GraphData | null,
      graphData: { nodes: [], edges: [] } as GraphData,
      curEditMethod: null as Method | null,
      curSelectedNodeConfig: null as INodeConfig | null,
      curSelectedNode: null as Item | null,
      context: useLowCodeContext(),
    }
  },
  watch: {
    stageMode(targetMode: StageMode, currentMode: StageMode) {
      if (GraphUtil.getInstance().graph) {
        GraphUtil.getInstance().storeCurMode(targetMode)
        this.updateGraphData(targetMode, currentMode)
      }
    },
    modelValue: {
      deep: true,
      handler(value: GraphData) {
        if (this.stageMode === StageMode.METHOD_DETAIL) this.graphData = value
      },
    },
  },
  mounted() {
    this.watchCurPageUuid('initial')
    this.onVisible(true)
  },
  beforeUnmount() {
    this.onVisible(false)
  },
  methods: {
    watchCurPageUuid(uuid: string) {
      if (!uuid) return
      this.graphData = { nodes: [], edges: [] }
      this.variableGraph = { nodes: [], edges: [] }
      this.methodListGraph = { nodes: [], edges: [] }
      this.methodDetailGraphList = {}
    },
    getPlugins() {
      const stage = this
      return [
        new G6.Menu({
          offsetX: 5,
          offsetY: 5,
          trigger: 'contextmenu',
          itemTypes: ['node', 'edge'],
          getContent: () => '<div style="width:80px;height:24px;line-height:24px;cursor:pointer;background:#fff">删除节点</div>',
          handleMenuClick(target: HTMLElement, item: INode) {
            // 删除流程包含异步确认，不能依赖 click 冒泡到 body 后再由 G6 隐藏菜单。
            const menu = target.closest<HTMLElement>('.g6-component-contextmenu')
            if (menu) menu.style.visibility = 'hidden'
            stage.deleteNode(item)
          },
        }),
        new G6.Minimap({ size: [200, 150], container: 'minimapContainer' }),
        new G6.Grid({}),
      ]
    },
    initGraphEvent() {
      this.context.dispatcher.listen('@idg/gui/logic/save', this.save)
      this.context.dispatcher.listen('@idg/gui/logic/layout', this.layout)
      this.context.dispatcher.listen('@idg/gui/logic/delete', this.deleteNode as (...args: any[]) => void)
      const events: GraphEventMap[] = [
        { eventName: 'drop', callback: (event: IG6GraphEvent) => onDrop(this as any, event) },
        { eventName: 'after-node-selected', callback: (event: IG6GraphEvent) => onAfterNodeSelectedDrop(this as any, event) },
        { eventName: 'on-canvas-click', callback: () => onCanvasClick(this as any) },
        { eventName: 'canvas:mouseleave', callback: (event: IG6GraphEvent) => onCanvasMouseLeave(this as any, event) },
        { eventName: 'on-node-dragend', callback: (event: IG6GraphEvent) => onNodeDragend(this as any, event) },
        { eventName: 'after-edge-selected', callback: (event: IG6GraphEvent) => onAfterEdgeSelected(this as any, event) },
        { eventName: 'before-edge-add', callback: (data: any) => onBeforeEdgeAdd(this as any, data) },
        { eventName: 'after-node-dblclick', callback: (event: IG6GraphEvent) => onAfterNodeDblclick(this as any, event) },
        { eventName: 'wheel', callback: (event: IG6GraphEvent) => onCanvasWheelzoom(this as any, event) },
        { eventName: 'keydown', callback: (event: IG6GraphEvent) => handleKeydown(this as any, event) },
        { eventName: 'before-anchor-show', callback: (event: IG6GraphEvent) => beforeAnchorShow(this as any, event) },
      ]
      GraphUtil.getInstance().registerEvents(events)
    },
    async deleteNode(item: INode) {
      if (!this.graph) return
      const model = item.get<INodeConfig>('model')
      const cannotDelete = [BlockNames_DTS.LOGIC_START_NODE, BlockNames_DTS.LOGIC_END_NODE]
      if (cannotDelete.includes(model.type as BlockNames_DTS)) {
        this.context.feedback.warning('当前节点不可以删除！')
        return
      }
      if (this.curSelectedNodeConfig?.id === model.id) this.$emit('select-node', null)
      onBeforeItemDelete(item)
      if (this.stageMode !== StageMode.METHOD_DETAIL && model.type !== LOGIC_STATEMENT_EDGE) {
        if (!(await this.context.feedback.confirm('确认删除吗'))) return
        if (isVariableNode(model.type as BlockNames_DTS)) {
          const id = (model.data as NodeConfigData<IVarNodeConfig>).varId
          const index = this.context.data.findIndex((data) => data.id === id)
          if (index >= 0) this.context.data.splice(index, 1)
        } else if (model.type === BlockNames_DTS.LOGIC_FUNC_NODE) {
          const id = (model.data as NodeConfigData<IFuncNodeConfig>).funcId
          const index = this.context.methods.findIndex((method) => method.id === id)
          if (index >= 0) this.context.methods.splice(index, 1)
        }
      }
      this.graph.removeItem(item)
      this.curSelectedNodeConfig = null
      this.curSelectedNode = null
      this.context.feedback.success('删除成功！')
    },
    async save() {
      if (!this.graph) return
      this.storeAllGraphData(this.stageMode)
      this.$emit('update:modelValue', this.graph.save())
      try {
        await this.updateBlockly()
        this.context.feedback.success('方法更新成功')
      } catch (error) {
        this.context.feedback.error(String(error))
      }
    },
    layout() {
      this.graph?.updateLayout({
        type: 'dagre', rankdir: 'LR', align: 'UL', controlPoints: true,
        ranksepFunc: () => 150,
        nodesepFunc: () => (this.stageMode !== StageMode.VARIABLE_LIST ? 50 : 25),
      })
    },
    async updateBlockly() {
      const update = (method: Method) => {
        if (!method.graphData) return
        method.blockData = new LogicEditorService(JSON.parse(method.graphData), method.id || '').blockly
      }
      if (this.stageMode === StageMode.METHOD_DETAIL && this.curEditMethod) update(this.curEditMethod)
      else this.methodList.forEach(update)
    },
    onMethdListClick() {
      this.curSelectedNodeConfig = null
      this.$emit('select-node', null)
      this.$emit('change-graph', StageMode.METHOD_LIST)
    },
    storeAllGraphData(curMode: StageMode) {
      if (!this.graph) return
      const current = this.graph.save()
      if (curMode === StageMode.METHOD_LIST) this.methodListGraph = current
      else if (curMode === StageMode.METHOD_DETAIL && this.curEditMethod?.id) {
        this.methodDetailGraphList[this.curEditMethod.id] = current
        this.curEditMethod.graphData = JSON.stringify(current)
      } else if (curMode === StageMode.VARIABLE_LIST) this.variableGraph = current
      GraphUtil.getInstance().storeGraphData({
        [StageMode.METHOD_LIST]: this.methodListGraph,
        [StageMode.METHOD_DETAIL]: this.methodDetailGraphList,
        [StageMode.VARIABLE_LIST]: this.variableGraph,
      })
    },
    async onVisible(value: boolean) {
      if (value) {
        await this.$nextTick()
        await this.context.controller.getLogicNodes()
        this.graph = GraphUtil.getInstance().initGraph({ container: 'logicEditorContainer', plugins: this.getPlugins() })
        this.graph.setMinZoom(0.5)
        this.graph.setMaxZoom(2)
        this.initGraphEvent()
        const current = GraphUtil.getInstance().getStoredStageMode()
        this.updateGraphData(current || StageMode.METHOD_LIST, current)
      } else if (this.graph) {
        this.storeAllGraphData(this.stageMode)
        GraphUtil.getInstance().destoryGraph()
        this.graph = null
        onCanvasClick(this as any)
        this.context.dispatcher.unlisten('@idg/gui/logic/save', this.save)
        this.context.dispatcher.unlisten('@idg/gui/logic/layout', this.layout)
      }
    },
    updateGraphData(targetMode: StageMode, currentMode?: StageMode) {
      if (!this.graph) return
      if (currentMode && targetMode !== currentMode) this.storeAllGraphData(currentMode)
      let cache: GraphData | undefined
      if (targetMode === StageMode.METHOD_DETAIL && this.curEditMethod?.id) {
        cache = this.methodDetailGraphList[this.curEditMethod.id]
      }
      if (cache?.nodes?.length && this.curEditMethod) this.graphData = getMethodDetialGraphData(this.curEditMethod, cache)
      else if (targetMode === StageMode.METHOD_LIST) this.graphData = this.methodListGraph = getMethodListGraph(this.methodList)
      else if (targetMode === StageMode.METHOD_DETAIL && this.curEditMethod) {
        this.graphData = getMethodDetialGraphData(this.curEditMethod)
        if (this.curEditMethod.id) this.methodDetailGraphList[this.curEditMethod.id] = this.graphData
      } else if (targetMode === StageMode.VARIABLE_LIST) this.graphData = this.variableGraph = getVariableGraph(this.allDatas)
      this.graph.clear()
      this.graph.data(this.graphData)
      this.graph.render()
      this.$emit('update:modelValue', this.graphData)
    },
  },
  render() {
    return (
      <div class={style.stage}>
        <div class={styles.logicEditor}>
          <div id="logicEditorContainer" class={styles.editor} />
          {(this.stageMode === StageMode.METHOD_LIST || this.stageMode === StageMode.METHOD_DETAIL) && (
            <ElBreadcrumb class={styles.breadcrumb}>
              <ElBreadcrumbItem><button type="button" onClick={this.onMethdListClick}>方法列表</button></ElBreadcrumbItem>
              {this.stageMode === StageMode.METHOD_DETAIL && this.curEditMethod && <ElBreadcrumbItem>{this.curEditMethod.funcLabel}</ElBreadcrumbItem>}
            </ElBreadcrumb>
          )}
          <div id="minimapContainer" class={styles.minimap} />
        </div>
      </div>
    )
  },
})
