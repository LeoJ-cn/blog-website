import { ElCollapse, ElCollapseItem, ElInput, ElRadioButton, ElRadioGroup } from 'element-plus'
import { defineComponent, type PropType } from 'vue'
import type { Data } from '../types/data'
import type { Method } from '../types/method'
import { useLowCodeContext } from '../compatibility/context'
import {
  baseCategory,
  exceptionCategory,
  logicCategory,
  loopCategory,
  numberCategory,
  operationCategory,
  routerCategory,
  variableCategory,
} from './const'
import { data2NodeConfig, getImgByType, method2NodeConfig } from './graph/util'
import type { LogicCategory, LogicCategoryItem } from './interface'
import { StageMode } from './interface'
import { BlockNames_DTS } from './service/interface'
import style from './styles/logic-editor.module.scss'
import LogicServiceListManage from './LogicServiceListManage'

export default defineComponent({
  name: 'LogicEditorLeftBar',
  props: {
    stageMode: { type: String as PropType<StageMode>, required: true },
    methodList: { type: Array as PropType<Method[]>, default: () => [] },
    allDatas: { type: Array as PropType<Data[]>, default: () => [] },
  },
  data() {
    return {
      context: useLowCodeContext(),
      topCurTab: 'methodLib' as 'methodLib' | 'apiLib',
      curSearchKey: '',
      openPanels: [] as string[],
      remoteCategories: [] as LogicCategory[],
    }
  },
  watch: {
    stageMode() {
      // 切换舞台时回到节点库，并刷新展开项，避免 API 页签或旧分类残留到其他舞台。
      this.topCurTab = 'methodLib'
      this.curSearchKey = ''
      this.$nextTick(() => {
        this.openPanels = this.categories.map((category) => category.uuid || category.name)
      })
    },
  },
  computed: {
    categories(): LogicCategory[] {
      if (this.stageMode === StageMode.VARIABLE_LIST) return [variableCategory]

      if (this.stageMode === StageMode.METHOD_LIST) {
        const createMethodNode = baseCategory.children.find(
          (node) => node.type === BlockNames_DTS.LOGIC_FUNC_NODE,
        )
        return createMethodNode
          ? [{ name: 'custom-methods', label: '自定义方法节点', children: [createMethodNode] }]
          : []
      }

      // 开始、结束由方法详情图自动创建；生命周期只属于方法列表，详情节点库不重复暴露。
      const unavailableDetailTypes = new Set<BlockNames_DTS | string>([
        BlockNames_DTS.LOGIC_START_NODE,
        BlockNames_DTS.LOGIC_END_NODE,
        BlockNames_DTS.LOGIC_LIFECYCLE_NODE,
      ])
      const remoteCategories = this.remoteCategories
        .map((category) => ({
          ...category,
          children: (category.children || []).filter(
            (node) => !unavailableDetailTypes.has(node.type),
          ),
        }))
        .filter((category) => category.children.length)
      const builtIn = [exceptionCategory, operationCategory, logicCategory, routerCategory, loopCategory, numberCategory]
      const methodChildren = this.methodList.map((method) => ({
        type: BlockNames_DTS.LOGIC_FUNC_NODE,
        label: method.funcLabel || method.funcName,
        name: method.funcName,
        meta: method2NodeConfig(method),
      }))
      const dataChildren = this.allDatas.map((data) => ({
        type: `logic-${data.type}-node`,
        label: data.label || data.name,
        name: data.name,
        meta: data2NodeConfig(data),
      }))
      return [
        ...remoteCategories,
        ...builtIn,
        { name: 'created-method', label: `我的方法（${methodChildren.length}）`, children: methodChildren },
        { name: 'created-data', label: `我的变量（${dataChildren.length}）`, children: dataChildren },
      ]
    },
    filteredCategories(): LogicCategory[] {
      const key = this.curSearchKey.trim().toLowerCase()
      if (!key) return this.categories
      return this.categories
        .map((category) => ({
          ...category,
          children: (category.children || []).filter((node) => `${node.label}${node.name || ''}`.toLowerCase().includes(key)),
        }))
        .filter((category) => category.children?.length)
    },
  },
  async mounted() {
    this.remoteCategories = await this.context.controller.getCategories() as LogicCategory[]
    this.openPanels = this.categories.map((category) => category.uuid || category.name)
  },
  methods: {
    onNodeDragStart(event: DragEvent, node: LogicCategoryItem) {
      if (!event.dataTransfer) return
      // 未携带 meta 表示新建节点，不能序列化成 `{}`，否则配置服务会误判为复制已有节点。
      const model = node.meta === undefined
        ? undefined
        : typeof node.meta === 'string'
          ? node.meta
          : JSON.stringify(node.meta)
      event.dataTransfer.setData('dragComponent', JSON.stringify({ type: node.type, model }))
    },
    renderCategoryItem(nodes: LogicCategoryItem[]) {
      return nodes.map((node) => (
        <div
          class={style.logicListItem}
          draggable
          data-type={node.type}
          data-model={JSON.stringify(node.meta)}
          onDragstart={(event) => this.onNodeDragStart(event, node)}
        >
          {node.img && <img class={style.icon} src={this.stageMode === StageMode.VARIABLE_LIST ? getImgByType(node.type.split('-')[1] || 'undefined') : node.img} alt="" />}
          <span>{this.context.getLocale() === 'zh-CN' ? node.label : node.name || node.label}</span>
        </div>
      ))
    },
  },
  render() {
    return (
      <aside class={style.leftBar}>
        <ElRadioGroup modelValue={this.topCurTab} onChange={(value) => { this.topCurTab = value as 'methodLib' | 'apiLib' }}>
          <ElRadioButton value="methodLib">节点库</ElRadioButton>
          {this.stageMode === StageMode.METHOD_DETAIL && <ElRadioButton value="apiLib">API 库</ElRadioButton>}
        </ElRadioGroup>
        <ElInput modelValue={this.curSearchKey} onInput={(value) => { this.curSearchKey = String(value) }} placeholder="搜索节点" clearable />
        {this.topCurTab === 'methodLib' ? (
          <ElCollapse modelValue={this.openPanels} onChange={(value) => { this.openPanels = value as string[] }}>
            {this.filteredCategories.map((category) => (
              <ElCollapseItem name={category.uuid || category.name} title={this.context.getLocale() === 'zh-CN' ? category.label : category.name}>
                {this.renderCategoryItem(category.children || [])}
              </ElCollapseItem>
            ))}
          </ElCollapse>
        ) : <LogicServiceListManage />}
      </aside>
    )
  },
})
