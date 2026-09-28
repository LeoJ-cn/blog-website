import { ElButton } from 'element-plus'
import { defineComponent, type PropType } from 'vue'
import type { OperationComponentTree } from '../../types/edit-page'
import { useLowCodeContext } from '../../compatibility/context'
import methodMixin from '../compat/method'
import { GraphUtil } from '../graph/graph-util'
import type { INodeConfig } from '../interface'
import style from '../styles/logic-editor.module.scss'
import LogicOperationItem from './LogicOperationItem'

export default defineComponent({
  name: 'LogicOperationEditor',
  props: {
    curNode: { type: Object as PropType<INodeConfig>, required: true },
    operationTree: { type: Array as PropType<OperationComponentTree[]>, default: () => [] },
  },
  emits: ['select-node'],
  data() {
    return { context: useLowCodeContext() }
  },
  methods: {
    confirmBtnClick() {
      const graph = GraphUtil.getInstance().graph
      const method = methodMixin.getCurMethod()
      if (graph && method) {
        method.graphData = JSON.stringify(graph.save())
        methodMixin.changeMethodById(method.id || '', method)
      }
      const targetNode = graph?.findById(this.curNode.id)
      if (!graph || !targetNode) {
        this.context.feedback.error('修改失败！')
        return
      }
      targetNode.update(targetNode.getModel())
      graph.data(graph.save())
      graph.render()
      this.context.feedback.success('修改成功！')
      this.$emit('select-node', null)
    },
  },
  render() {
    return (
      <div class={style.nodeConfigPanel}>
        <div class={style.contentContainer}>
          {this.operationTree.map((component) => (
            <LogicOperationItem
              key={component.id || component.ins_id}
              curNode={this.curNode}
              operationTree={this.operationTree}
              currentOperationTree={component}
            />
          ))}
        </div>
        <div class={style.configActions}>
          <ElButton onClick={() => this.$emit('select-node', null)}>取消</ElButton>
          <ElButton type="primary" onClick={this.confirmBtnClick}>确定</ElButton>
        </div>
      </div>
    )
  },
})
