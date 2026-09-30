import G6, { type GraphData, type IG6GraphEvent, type IGraph, type INode, type Item } from '@antv/g6'
import { ElBreadcrumb, ElBreadcrumbItem } from 'element-plus'
import { defineComponent, type PropType } from 'vue'
import type { Data } from '../types/data'
import type { Method } from '../types/method'
import type { LogicEditorLifecycleBinding, LogicEditorSavePayload } from '../types/logic-editor'
import { useLowCodeContext } from '../compatibility/context'
import methodMixin from './compat/method'
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
import { NodeConfigServicesFactory } from './handler/config-builder/node-config-services-factory'
import styles from './styles/graph.module.scss'
import style from './styles/logic-editor.module.scss'

export default defineComponent({
  name: 'LogicEditorStage',
  props: {
    modelValue: { type: Object as PropType<GraphData>, required: true },
    methodList: { type: Array as PropType<Method[]>, default: () => [] },
    stageMode: { type: String as PropType<StageMode>, required: true },
    allDatas: { type: Array as PropType<Data[]>, default: () => [] },
    visible: { type: Boolean, required: true },
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
      graphEvents: [] as GraphEventMap[],
      lifecycleVersion: 0,
    }
  },
  watch: {
    visible(value: boolean) {
      void this.onVisible(value)
    },
    stageMode(targetMode: StageMode, currentMode: StageMode) {
      if (GraphUtil.getInstance().graph) {
        GraphUtil.getInstance().storeCurMode(targetMode)
        this.updateGraphData(targetMode, currentMode)
      }
    },
    modelValue: {
      deep: true,
      handler(value: GraphData) {
        if (this.stageMode !== StageMode.METHOD_DETAIL) return

        this.graphData = value
        if (this.curEditMethod?.id) this.methodDetailGraphList[this.curEditMethod.id] = value
        if (!this.graph) return

        // 外部 v-model 更新时必须同步 G6；只替换组件字段会造成画布仍显示旧数据。
        this.graph.clear()
        this.graph.data(value)
        this.graph.render()
      },
    },
  },
  mounted() {
    this.watchCurPageUuid('initial')
    if (this.visible) void this.onVisible(true)
  },
  beforeUnmount() {
    void this.onVisible(false)
  },
  methods: {
    watchCurPageUuid(uuid: string) {
      if (!uuid) return
      this.graphData = { nodes: [], edges: [] }
      this.variableGraph = null
      this.methodListGraph = null
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
          handleMenuClick(target: HTMLElement, item: Item) {
            // 删除流程包含异步确认，不能依赖 click 冒泡到 body 后再由 G6 隐藏菜单。
            const menu = target.closest<HTMLElement>('.g6-component-contextmenu')
            if (menu) menu.style.visibility = 'hidden'
            stage.deleteNode(item as INode)
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
      this.graphEvents = events
      GraphUtil.getInstance().registerEvents(events)
    },
    async deleteNode(item: INode) {
      if (!this.graph) return
      const model = item.get<INodeConfig>('model')
      const cannotDelete = [
        BlockNames_DTS.LOGIC_LIFECYCLE_NODE,
        BlockNames_DTS.LOGIC_START_NODE,
        BlockNames_DTS.LOGIC_END_NODE,
      ]
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
      } else if (item.getType() === 'node') {
        // 对象属性展开节点依附于父节点；删除父节点时递归清理，避免留下悬空详情节点和边。
        const removeVariableDetails = (node: INode, nodeModel: INodeConfig) => {
          node.getEdges()
            .filter((edge) => edge.getModel().source === nodeModel.id)
            .map((edge) => this.graph?.findById(edge.getModel().target as string))
            .filter((child): child is INode => Boolean(child))
            .forEach((child) => {
              const childModel = child.get<INodeConfig>('model')
              if (childModel.type !== BlockNames_DTS.LOGIC_VARIABLE_DETIAL_NODE) return
              removeVariableDetails(child, childModel)
              this.graph?.removeItem(child)
            })
        }
        removeVariableDetails(item, model)
      }
      this.graph.removeItem(item)
      if (this.stageMode === StageMode.METHOD_DETAIL) this.persistCurrentMethodGraph()
      this.curSelectedNodeConfig = null
      this.curSelectedNode = null
      this.context.feedback.success('删除成功！')
    },
    async save(): Promise<LogicEditorSavePayload> {
      if (!this.graph) throw new Error('逻辑编辑器画布尚未初始化')
      this.storeAllGraphData(this.stageMode)
      const sourceMethod = (this.curEditMethod?.id
        ? this.context.methods.find((method) => method.id === this.curEditMethod?.id)
        : undefined) || this.methodList[0]
      if (!sourceMethod?.id) throw new Error('没有可保存的稳定方法 ID')

      const graphData = sourceMethod.graphData
        ? JSON.parse(sourceMethod.graphData) as GraphData
        : getMethodDetialGraphData(sourceMethod)
      const result = new LogicEditorService(graphData, sourceMethod.id)
      if (result.translateErrorList.length) {
        throw new Error(`流程图存在 ${result.translateErrorList.length} 条非法连线，请修正后再保存`)
      }

      // 每个方法必须独立翻译；methodId 是生命周期绑定与 processData 之间的稳定关联键。
      const processDataByMethod = this.methodList.map((method) => {
        if (!method.id) throw new Error(`方法“${method.funcLabel || method.funcName}”缺少稳定 ID`)
        const methodGraphData = this.methodDetailGraphList[method.id]
          || (method.graphData ? JSON.parse(method.graphData) as GraphData : getMethodDetialGraphData(method))
        const methodResult = method.id === sourceMethod.id
          ? result
          : new LogicEditorService(methodGraphData, method.id)
        if (methodResult.translateErrorList.length) {
          throw new Error(
            `方法“${method.funcLabel || method.funcName}”存在 ${methodResult.translateErrorList.length} 条非法连线，请修正后再保存`,
          )
        }
        return {
          methodId: method.id,
          methodName: method.funcLabel || method.funcName,
          processData: methodResult.processData,
        }
      })

      sourceMethod.graphData = JSON.stringify(graphData)
      sourceMethod.blockData = result.blockly
      if (this.curEditMethod?.id === sourceMethod.id) Object.assign(this.curEditMethod, sourceMethod)
      this.methodDetailGraphList[sourceMethod.id] = graphData
      this.$emit('update:modelValue', graphData)
      return {
        graphData,
        processData: result.processData,
        blockData: result.blockly,
        processDataByMethod,
        lifecycleBindings: this.getLifecycleBindings(),
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
    persistCurrentMethodGraph(graphData?: GraphData) {
      const currentMethod = this.curEditMethod
      const methodId = currentMethod?.id
      if (!methodId) throw new Error('当前编辑方法缺少稳定 ID，无法保存图数据')

      const currentGraph = graphData || this.graph?.save() as GraphData || { nodes: [], edges: [] }
      const serializedGraph = JSON.stringify(currentGraph)
      this.methodDetailGraphList[methodId] = currentGraph
      currentMethod.graphData = serializedGraph
      methodMixin.changeMethodById(methodId, { graphData: serializedGraph })
      this.$emit('update:modelValue', currentGraph)
      return currentGraph
    },
    persistLifeCycleBindings(graphData: GraphData) {
      const nodes = graphData.nodes || []
      const edges = graphData.edges || []
      const lifecycleNode = nodes.find((node) => node.type === BlockNames_DTS.LOGIC_LIFECYCLE_NODE) as INodeConfig | undefined
      if (!lifecycleNode) return

      const bindings = {
        ...(this.context.store.get<Record<string, string[]>>('ui_bind_lifecircle') || {}),
      }
      lifecycleNode.data?.anchors.forEach((anchor) => {
        const methodIds: string[] = []
        let edge = edges.find((item) => item.source === lifecycleNode.id && item.sourceAnchor === anchor.index)
        const visited = new Set<string>()
        while (edge?.target && !visited.has(String(edge.target))) {
          visited.add(String(edge.target))
          const target = nodes.find((node) => node.id === edge?.target) as INodeConfig<IFuncNodeConfig> | undefined
          const methodId = target?.data?.funcId
          if (!target || !methodId) break
          methodIds.push(methodId)
          edge = edges.find((item) => item.type === LOGIC_STATEMENT_EDGE && item.source === target.id)
        }
        const key = `${String(anchor.data.value)}_method_ids`
        if (methodIds.length) bindings[key] = methodIds
        else delete bindings[key]
      })
      this.context.store.set('ui_bind_lifecircle', bindings)
    },
    getLifecycleBindings(): LogicEditorLifecycleBinding[] {
      const lifecycleNode = this.methodListGraph?.nodes?.find(
        (node) => node.type === BlockNames_DTS.LOGIC_LIFECYCLE_NODE,
      ) as INodeConfig | undefined
      if (!lifecycleNode) return []

      const bindings = this.context.store.get<Record<string, string[]>>('ui_bind_lifecircle') || {}
      return (lifecycleNode.data?.anchors || []).flatMap((anchor) => {
        const lifecycle = String(anchor.data.value || '')
        const methodIds = bindings[`${lifecycle}_method_ids`] || []
        if (!lifecycle || !methodIds.length) return []
        return [{ lifecycle, label: String(anchor.data.label || lifecycle), methodIds: [...methodIds] }]
      })
    },
    storeAllGraphData(curMode: StageMode) {
      if (!this.graph) return
      const current = this.graph.save() as GraphData
      if (curMode === StageMode.METHOD_LIST) {
        this.methodListGraph = current
        this.persistLifeCycleBindings(current)
      }
      else if (curMode === StageMode.METHOD_DETAIL && this.curEditMethod?.id) {
        this.persistCurrentMethodGraph(current)
      } else if (curMode === StageMode.VARIABLE_LIST) this.variableGraph = current
      GraphUtil.getInstance().storeGraphData({
        [StageMode.METHOD_LIST]: this.methodListGraph as GraphData | null,
        [StageMode.METHOD_DETAIL]: this.methodDetailGraphList as Record<string, GraphData>,
        [StageMode.VARIABLE_LIST]: this.variableGraph as GraphData | null,
      })
    },
    async onVisible(value: boolean) {
      const lifecycleVersion = ++this.lifecycleVersion
      if (value) {
        if (this.graph) return
        await this.$nextTick()
        const logicNodes = await this.context.controller.getLogicNodes()
        if (!this.visible || lifecycleVersion !== this.lifecycleVersion) return
        NodeConfigServicesFactory.injectLogicNodeRecords(logicNodes)
        this.graph = GraphUtil.getInstance().initGraph({ container: 'logicEditorContainer', plugins: this.getPlugins() })
        this.graph.setMinZoom(0.5)
        this.graph.setMaxZoom(2)
        this.initGraphEvent()
        const current = GraphUtil.getInstance().getStoredStageMode()
        this.updateGraphData(current || StageMode.METHOD_LIST, current ?? undefined)
      } else if (this.graph) {
        this.storeAllGraphData(this.stageMode)
        if (this.graphEvents.length) GraphUtil.getInstance().unRegisterEvents(this.graphEvents)
        this.graphEvents = []
        this.context.dispatcher.unlisten('@idg/gui/logic/save', this.save)
        this.context.dispatcher.unlisten('@idg/gui/logic/layout', this.layout)
        this.context.dispatcher.unlisten('@idg/gui/logic/delete', this.deleteNode as (...args: any[]) => void)
        GraphUtil.getInstance().destoryGraph()
        this.graph = null
        onCanvasClick(this as any)
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
      else if (targetMode === StageMode.METHOD_LIST) {
        const lifecycleBindings = this.context.store.get<Record<string, string[]>>('ui_bind_lifecircle') || {}
        this.graphData = this.methodListGraph || getMethodListGraph(this.methodList, lifecycleBindings)
        this.methodListGraph = this.graphData
      }
      else if (targetMode === StageMode.METHOD_DETAIL && this.curEditMethod) {
        this.graphData = getMethodDetialGraphData(this.curEditMethod)
        if (this.curEditMethod.id) this.methodDetailGraphList[this.curEditMethod.id] = this.graphData as GraphData
      } else if (targetMode === StageMode.VARIABLE_LIST) {
        this.graphData = this.variableGraph?.nodes?.length
          ? this.variableGraph as GraphData
          : getVariableGraph(this.allDatas)
        this.variableGraph = this.graphData as GraphData
      }
      this.graph.clear()
      this.graph.data(this.graphData as GraphData)
      this.graph.render()
      // 对外 v-model 只代表方法详情图；方法列表图和变量图不得覆盖宿主业务状态。
      if (targetMode === StageMode.METHOD_DETAIL) this.$emit('update:modelValue', this.graphData)
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
