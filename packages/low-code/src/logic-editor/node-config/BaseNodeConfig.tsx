import { ElButton } from 'element-plus'
import { defineComponent, type PropType } from 'vue'
import type { Data } from '../../types/data'
import type { Method } from '../../types/method'
import { useLowCodeContext } from '../../compatibility/context'
import { GraphUtil } from '../graph/graph-util'
import type { INodeConfig } from '../interface'
import { StageMode } from '../interface'
import style from '../styles/logic-editor.module.scss'

export default defineComponent({
  name: 'BaseNodeConfig',
  props: {
    stageMode: { type: String as PropType<StageMode>, required: true },
    curSelectedNodeConfig: { type: Object as PropType<INodeConfig>, required: true },
    methodList: { type: Array as PropType<Method[]>, default: () => [] },
    allDatas: { type: Array as PropType<Data[]>, default: () => [] },
  },
  emits: ['select-node'],
  data() {
    return { context: useLowCodeContext() }
  },
  methods: {
    saveAndUpdate() {
      const graph = GraphUtil.getInstance().graph
      const targetNode = graph?.findById(this.curSelectedNodeConfig.id)
      if (!graph || !targetNode) {
        this.context.feedback.error('修改失败！')
        return false
      }

      targetNode.update(targetNode.getModel())
      graph.data(graph.save())
      graph.render()
      this.context.feedback.success('修改成功！')
      this.$emit('select-node', null)
      return true
    },
  },
  render() {
    return (
      <div class={style['node-config-panel']}>
        <div class={style['content-container']}>{this.$slots.default?.()}</div>
        <div class={style['config-actions']}>
          <ElButton onClick={() => this.$emit('select-node', null)}>取消</ElButton>
          <ElButton type="primary" onClick={() => this.$emit('confirm')}>确定</ElButton>
        </div>
      </div>
    )
  },
})
