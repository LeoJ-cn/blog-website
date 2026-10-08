import { ElButton, ElOption, ElSelect } from 'element-plus'
import { defineComponent, type PropType } from 'vue'
import { useLowCodeContext } from '../../compatibility/context'
import type { Method } from '../../types/method'
import { MethodType } from '../../types/method'
import { GraphUtil } from '../graph/graph-util'
import type { IMethodRef, INodeConfig } from '../interface'
import style from '../styles/logic-editor.module.scss'

const unsupportedMethodTypes = new Set([
  MethodType.eventMethod,
  MethodType.initMethod,
  MethodType.computedMethod,
  MethodType.watchMethod,
])

export default defineComponent({
  name: 'MethodRefNodeConfig',
  props: {
    curSelectedNodeConfig: { type: Object as PropType<INodeConfig<IMethodRef>>, required: true },
    methodList: { type: Array as PropType<Method[]>, default: () => [] },
  },
  emits: ['select-node'],
  data() {
    return {
      context: useLowCodeContext(),
      methodId: '',
    }
  },
  computed: {
    availableMethods(): Method[] {
      // 生命周期、计算属性、监听与事件方法不能作为普通函数引用传递。
      return this.methodList.filter((method) => (
        Boolean(method.id)
        && method.is_delete !== 1
        && !unsupportedMethodTypes.has(method.methodType as MethodType)
      ))
    },
  },
  watch: {
    curSelectedNodeConfig: {
      immediate: true,
      deep: true,
      handler(nodeConfig: INodeConfig<IMethodRef>) {
        this.methodId = nodeConfig.data?.methodId || ''
      },
    },
  },
  methods: {
    confirmBtnClick() {
      const method = this.availableMethods.find((item) => item.id === this.methodId)
      if (!method?.id) {
        this.context.feedback.error('请选择可引用的方法')
        return
      }

      try {
        const graph = GraphUtil.getInstance().graph
        if (!graph?.findById(this.curSelectedNodeConfig.id)) throw new Error('node unavailable')

        // methodId 是 processData 与页面方法表之间的稳定关联键，不能持久化展示名称。
        this.curSelectedNodeConfig.data.methodId = method.id
        graph.data(graph.save())
        graph.render()
        this.context.feedback.success('修改成功！')
        this.$emit('select-node', null)
      } catch {
        this.context.feedback.error('保存失败！')
      }
    },
  },
  render() {
    return (
      <div class={style.nodeConfigPanel}>
        <div class={style.contentContainer}>
          <h3>获取方法引用</h3>
          <label>目标方法</label>
          <ElSelect
            modelValue={this.methodId}
            placeholder="请选择方法"
            onChange={(value) => { this.methodId = String(value) }}
          >
            {this.availableMethods.map((method) => (
              <ElOption
                key={method.id}
                value={method.id as string}
                label={method.funcLabel || method.label || method.funcName}
              />
            ))}
          </ElSelect>
        </div>
        <div class={style.configActions}>
          <ElButton onClick={() => this.$emit('select-node', null)}>取消</ElButton>
          <ElButton type="primary" onClick={this.confirmBtnClick}>确定</ElButton>
        </div>
      </div>
    )
  },
})
