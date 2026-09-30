import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import set from 'lodash/set'
import { ElCheckbox, ElInput, ElInputNumber, ElOption, ElSelect } from 'element-plus'
import { defineComponent, resolveDynamicComponent, type PropType } from 'vue'
import type { INode } from '@antv/g6'
import type { OperationComponentTree } from '../../types/edit-page'
import { GraphUtil } from '../graph/graph-util'
import { onBeforeItemDelete } from '../handler/event-service'
import type { INodeConfig } from '../interface'
import { ConstOrVariable_DTS } from '../service/interface'

function resolveBuiltInTag(tag?: string) {
  const normalized = (tag || '').toLowerCase()
  if (normalized.includes('input-number')) return ElInputNumber
  if (normalized.includes('checkbox')) return ElCheckbox
  if (normalized.includes('select')) return ElSelect
  if (normalized.includes('option')) return ElOption
  if (normalized.includes('input')) return ElInput
  return tag ? resolveDynamicComponent(tag) : 'div'
}

const LogicOperationItem = defineComponent({
  name: 'LogicOperationItem',
  props: {
    curNode: { type: Object as PropType<INodeConfig>, required: true },
    operationTree: { type: Array as PropType<OperationComponentTree[]>, default: () => [] },
    currentOperationTree: { type: Object as PropType<OperationComponentTree>, required: true },
    level: { type: Number, default: 1 },
  },
  methods: {
    getValue(component: OperationComponentTree) {
      const key = component.render_tree_node?.key?.trim()
      if (!key || !this.curNode.data) return undefined
      if (/^anchors\[\d+\]\.data\.\w+$/.test(key)) {
        const prefix = key.match(/^anchors\[\d+\]\.data/)?.[0]
        if (prefix && get(this.curNode.data, prefix)?.constOrVariable === ConstOrVariable_DTS.USE_VARIABLE) return undefined
      }
      return get(this.curNode.data, key)
    },
    updateComponentAttr(value: unknown, deleteKeys?: unknown) {
      const key = this.currentOperationTree.render_tree_node?.key?.trim()
      if (!key || !this.curNode.data) return
      const data = cloneDeep(this.curNode.data)
      set(data, key, value)

      // 旧逻辑中手工输入常量会切回常量模式，并移除此前接入该锚点的变量连线。
      if (/^anchors\[\d+\]\.data\.\w+$/.test(key)) {
        const prefix = key.match(/^anchors\[\d+\]/)?.[0]
        const anchor = prefix ? get(data, prefix) : undefined
        if (anchor) {
          anchor.connected = false
          if (anchor.data?.constOrVariable === ConstOrVariable_DTS.USE_VARIABLE) {
            anchor.data.constOrVariable = ConstOrVariable_DTS.USE_CONST
            const graph = GraphUtil.getInstance().graph
            const node = this.curNode.id ? graph?.findById(this.curNode.id) as INode | undefined : undefined
            const edge = node?.getEdges().find((item) => item.getTarget() === node && item.getModel().targetAnchor === anchor.index)
            if (edge && graph) {
              onBeforeItemDelete(edge)
              graph.removeItem(edge)
            }
          }
        }
      }
      if (Array.isArray(deleteKeys)) {
        deleteKeys.forEach((deleteKey) => {
          if (typeof deleteKey === 'string') delete (data as Record<string, unknown>)[deleteKey]
        })
      }
      this.curNode.data = data
    },
    runConfiguredHook(hook: unknown, value: unknown) {
      const hooks = Array.isArray(hook) ? hook : [hook]
      hooks.forEach((candidate) => {
        try {
          const handler = typeof candidate === 'string' ? eval(candidate) : candidate
          if (typeof handler === 'function') {
            handler(value, this.curNode, this.currentOperationTree, this.operationTree, this.updateComponentAttr)
          }
        } catch (error) {
          console.warn('[logic-editor] 动态配置事件执行失败', error)
        }
      })
    },
    isVisible(component: OperationComponentTree) {
      const expression = component.data?.$isShow
      if (typeof expression === 'boolean') return expression
      if (typeof expression !== 'string') return true
      try {
        const evaluated = eval(expression)
        return typeof evaluated === 'function'
          ? Boolean(evaluated(component, this.curNode, this.operationTree))
          : Boolean(evaluated)
      } catch {
        return false
      }
    },
  },
  render() {
    const component = this.currentOperationTree
    if (!this.isVisible(component)) return null
    if (component.data?.$beforeRender) {
      try {
        const beforeRender = typeof component.data.$beforeRender === 'string'
          ? eval(component.data.$beforeRender)
          : component.data.$beforeRender
        if (typeof beforeRender === 'function') beforeRender(component, this.curNode, this.operationTree)
      } catch { /* 兼容旧动态配置，单个钩子失败不阻断配置面板。 */ }
    }
    const Component = resolveBuiltInTag(component.tag) as any
    const value = this.getValue(component)
    const attrs = Object.fromEntries(Object.entries(component.data || {}).filter(([key]) => !key.startsWith('$')))
    const configuredEvents = component.data?.$on || {}
    const eventProps = Object.fromEntries(Object.entries(configuredEvents).map(([eventName, hook]) => {
      const vueEventName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`
      return [vueEventName, (eventValue: unknown) => this.runConfiguredHook(hook, eventValue)]
    }))
    const childChangeProps = {
      'onChild-change': (eventValue: unknown) => this.runConfiguredHook(configuredEvents.change, eventValue),
    }
    const children = Array.isArray(component.children)
      ? component.children.map((child) => <LogicOperationItem key={child.id || child.ins_id} curNode={this.curNode} operationTree={this.operationTree} currentOperationTree={child} level={this.level + 1} />)
      : component.children
    return (
      <Component
        {...attrs}
        {...eventProps}
        {...childChangeProps}
        class={component.data?.$class}
        title={component.data?.$tips}
        curNode={this.curNode}
        operationComponentTree={component}
        showInTemplate={false}
        modelValue={value === undefined ? attrs.value : value}
        onUpdate:modelValue={this.updateComponentAttr}
        onChange={this.updateComponentAttr}
      >{children}</Component>
    )
  },
})

export default LogicOperationItem
