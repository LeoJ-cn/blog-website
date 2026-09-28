import cloneDeep from 'lodash/cloneDeep'
import { ElButton, ElInput } from 'element-plus'
import { defineComponent, type PropType } from 'vue'
import type { Data } from '../../types/data'
import type { Method } from '../../types/method'
import { Parse } from '../compat/parse'
import { useLowCodeContext } from '../../compatibility/context'
import { GraphUtil } from '../graph/graph-util'
import { getDataType } from '../graph/util'
import type { INodeConfig, IVarNodeConfig } from '../interface'
import { StageMode } from '../interface'
import style from '../styles/logic-editor.module.scss'

export default defineComponent({
  name: 'VariableNodeConfig',
  props: {
    stageMode: { type: String as PropType<StageMode>, required: true },
    curSelectedNodeConfig: { type: Object as PropType<INodeConfig<IVarNodeConfig>>, required: true },
    methodList: { type: Array as PropType<Method[]>, default: () => [] },
    allDatas: { type: Array as PropType<Data[]>, default: () => [] },
  },
  emits: ['select-node'],
  data() {
    return { context: useLowCodeContext(), dataItem: null as Data | null, valueStr: '' }
  },
  watch: {
    curSelectedNodeConfig: {
      immediate: true,
      deep: true,
      handler(nodeConfig: INodeConfig<IVarNodeConfig>) {
        const data = this.allDatas.find((item) => item.id === nodeConfig.data?.varId)
        this.dataItem = data ? cloneDeep(data) : null
        // block_data 由旧 Blockly 宿主维护；无法反解时保持原值，避免迁移层破坏持久化数据。
        this.valueStr = JSON.stringify(this.dataItem?.value ?? nodeConfig.data?.anchors?.[0]?.data?.value, null, 2)
      },
    },
  },
  methods: {
    confirmBtnClick() {
      const anchor = this.curSelectedNodeConfig.data?.anchors?.[0]
      if (!anchor || !this.dataItem) return
      try {
        let defaultValue: unknown
        eval(`defaultValue = ${this.valueStr}`)
        if (anchor.data.type !== getDataType(defaultValue)) {
          this.context.feedback.error('类型不正确,请重新输入')
          return
        }
        anchor.data.value = defaultValue
        const source = this.context.data.find((item) => item.id === this.dataItem?.id)
        if (source) Object.assign(source, {
          ...this.dataItem,
          label: anchor.data.label,
          value: defaultValue,
          block_data: undefined,
          schema: Parse(defaultValue),
        })
        const graph = GraphUtil.getInstance().graph
        if (!graph?.findById(this.curSelectedNodeConfig.id)) throw new Error('node unavailable')
        graph.data(graph.save())
        graph.render()
        this.context.feedback.success('修改成功！')
        this.$emit('select-node', null)
      } catch {
        const source = this.context.data.find((item) => item.id === this.dataItem?.id)
        if (source) {
          anchor.data.label = source.label || ''
          anchor.data.value = source.value
        }
        this.context.feedback.error('请输入正确的JSON格式!')
      }
    },
  },
  render() {
    const anchor = this.curSelectedNodeConfig.data?.anchors?.[0]
    if (!anchor) return <div class={style['config-empty']}>该变量没有可配置锚点</div>
    return (
      <div class={style['node-config-panel']}>
        <div class={style['content-container']}>
          <h3>{this.dataItem?.label || '变量'}</h3>
          <label>变量名称</label>
          <ElInput modelValue={anchor.data.label} onInput={(value) => { anchor.data.label = String(value) }} />
          <label>变量值</label>
          <ElInput type="textarea" rows={12} modelValue={this.valueStr} onInput={(value) => { this.valueStr = String(value) }} />
        </div>
        <div class={style['config-actions']}>
          <ElButton onClick={() => this.$emit('select-node', null)}>取消</ElButton>
          <ElButton type="primary" onClick={this.confirmBtnClick}>确定</ElButton>
        </div>
      </div>
    )
  },
})
