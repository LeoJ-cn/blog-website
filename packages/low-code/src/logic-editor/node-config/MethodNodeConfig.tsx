import cloneDeep from 'lodash/cloneDeep'
import { ElButton, ElInput, ElOption, ElSelect } from 'element-plus'
import { defineComponent, type PropType } from 'vue'
import type { Data } from '../../types/data'
import { DataType } from '../../types/data'
import type { Method } from '../../types/method'
import { Parse } from '../compat/parse'
import { useLowCodeContext } from '../../compatibility/context'
import methodMixin from '../compat/method'
import { GraphUtil } from '../graph/graph-util'
import { getCustomMethodDataConfig } from '../graph/util'
import type { IFuncNodeConfig, INodeConfig } from '../interface'
import { StageMode } from '../interface'
import style from '../styles/logic-editor.module.scss'

const dataTypeOptions = [
  [DataType.String, '文本'], [DataType.Number, '数字'], [DataType.Boolean, '布尔'],
  [DataType.Array, '数组'], [DataType.Object, '对象'],
] as const

export default defineComponent({
  name: 'MethodNodeConfig',
  props: {
    stageMode: { type: String as PropType<StageMode>, required: true },
    curSelectedNodeConfig: { type: Object as PropType<INodeConfig<IFuncNodeConfig>>, required: true },
    methodList: { type: Array as PropType<Method[]>, default: () => [] },
    allDatas: { type: Array as PropType<Data[]>, default: () => [] },
  },
  emits: ['select-node'],
  data() {
    return {
      context: useLowCodeContext(),
      method: null as Method | null,
      returnValue: '',
    }
  },
  watch: {
    curSelectedNodeConfig: {
      immediate: true,
      deep: true,
      handler(nodeConfig: INodeConfig<IFuncNodeConfig>) {
        const method = this.methodList.find((item) => item.id === nodeConfig.data?.funcId)
        this.method = method ? cloneDeep(method) : null
        this.returnValue = this.method?.funcReturn?.schema
          ? (this.method.funcReturn.schema.type === DataType.Array ? '[]' : this.method.funcReturn.schema.type === DataType.Object ? '{}' : '')
          : ''
      },
    },
  },
  methods: {
    methodParamAdd() {
      if (!this.method) return
      const index = this.method.parameters.length + 1
      this.method.parameters.push({
        access_modifier: { accessible: true, editable: true },
        label: `参数${index}`,
        name: `param_${index}`,
        schema: { type: DataType.String },
        type: DataType.String,
      })
    },
    confirmBtnClick() {
      if (!this.method) return
      try {
        const graph = GraphUtil.getInstance().graph
        if (!graph) throw new Error('graph unavailable')
        const funcReturn = this.method.funcReturn || { state: false, type: DataType.Undefined }
        funcReturn.state = funcReturn.type !== DataType.Undefined
        if (this.returnValue && [DataType.Object, DataType.Array].includes(funcReturn.type as DataType)) {
          let defaultValue: unknown
          // 保留旧编辑器允许 JavaScript 对象/数组字面量的输入语义，不收窄为严格 JSON。
          eval(`defaultValue = ${this.returnValue}`)
          funcReturn.schema = Parse(defaultValue)
        }
        this.method.funcReturn = funcReturn
        this.method.parameters.forEach((parameter) => {
          if ([DataType.Object, DataType.Array].includes(parameter.type)) {
            let defaultValue: unknown
            eval(`defaultValue = ${String(parameter.value || '')}`)
            parameter.schema = Parse(defaultValue)
          } else parameter.schema = { type: parameter.type }
        })
        methodMixin.changeMethodById(this.method.id || '', this.method)
        this.curSelectedNodeConfig.data = getCustomMethodDataConfig(this.curSelectedNodeConfig.id || '', this.method)
        if (!graph.findById(this.curSelectedNodeConfig.id)) throw new Error('node unavailable')
        graph.data(graph.save())
        graph.render()
        this.context.feedback.success('修改成功！')
      } catch {
        this.context.feedback.error('保存失败！')
      }
    },
  },
  render() {
    if (!this.method) return <div class={style['config-empty']}>未找到对应方法</div>
    return (
      <div class={style['node-config-panel']}>
        <div class={style['content-container']}>
          <h3>{this.method.funcLabel || '自定义方法'}</h3>
          <label>方法名称</label>
          <ElInput modelValue={this.method.funcLabel} onInput={(value) => { if (this.method) this.method.funcLabel = String(value) }} />
          <div class={style['config-section-title']}><span>参数</span><ElButton link onClick={this.methodParamAdd}>添加</ElButton></div>
          {this.method.parameters.map((parameter, index) => (
            <div class={style['config-group']} key={`${parameter.name}-${index}`}>
              <ElInput modelValue={parameter.label} onInput={(value) => { parameter.label = String(value) }} />
              <ElSelect modelValue={parameter.type} onChange={(value) => { parameter.type = value as DataType }}>
                {dataTypeOptions.map(([value, label]) => <ElOption key={value} value={value} label={label} />)}
              </ElSelect>
              {[DataType.Object, DataType.Array].includes(parameter.type) && (
                <ElInput type="textarea" modelValue={String(parameter.value || '')} onInput={(value) => { parameter.value = String(value) }} />
              )}
              <ElButton link type="danger" onClick={() => this.method?.parameters.splice(index, 1)}>删除参数</ElButton>
            </div>
          ))}
          <label>返回值类型</label>
          <ElSelect modelValue={this.method.funcReturn?.type || DataType.Undefined} onChange={(value) => {
            if (this.method) this.method.funcReturn = { ...(this.method.funcReturn || { state: false }), type: value as DataType }
          }}>
            <ElOption value={DataType.Undefined} label="空" />
            {dataTypeOptions.map(([value, label]) => <ElOption key={value} value={value} label={label} />)}
          </ElSelect>
          {[DataType.Object, DataType.Array].includes(this.method.funcReturn?.type as DataType) && (
            <ElInput type="textarea" modelValue={this.returnValue} onInput={(value) => { this.returnValue = String(value) }} />
          )}
        </div>
        <div class={style['config-actions']}>
          <ElButton onClick={() => this.$emit('select-node', null)}>取消</ElButton>
          <ElButton type="primary" onClick={this.confirmBtnClick}>确定</ElButton>
        </div>
      </div>
    )
  },
})
