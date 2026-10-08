import { ElEmpty, ElRadioButton, ElRadioGroup } from 'element-plus'
import { defineComponent, type PropType } from 'vue'
import type { Data } from '../types/data'
import type { Method } from '../types/method'
import type { IFuncNodeConfig, IMethodRef, INodeConfig, IVarNodeConfig } from './interface'
import { StageMode } from './interface'
import { NodeConfigServicesFactory } from './handler/config-builder/node-config-services-factory'
import { BlockNames_DTS } from './service/interface'
import style from './styles/logic-editor.module.scss'
import MethodNodeConfig from './node-config/MethodNodeConfig'
import MethodRefNodeConfig from './node-config/MethodRefNodeConfig'
import VariableNodeConfig from './node-config/VariableNodeConfig'
import LogicOperationEditor from './operation/LogicOperationEditor'

export default defineComponent({
  name: 'LogicEditorRightBar',
  props: {
    stageMode: { type: String as PropType<StageMode>, required: true },
    allDatas: { type: Array as PropType<Data[]>, default: () => [] },
    methodList: { type: Array as PropType<Method[]>, default: () => [] },
    curSelectedNodeConfig: { type: Object as PropType<INodeConfig | null>, default: null },
  },
  emits: ['select-node'],
  data: () => ({ mode: 'config' as const }),
  methods: {
    renderNodeConfigPanel() {
      const node = this.curSelectedNodeConfig
      if (!node?.type) return <ElEmpty description="未选中节点" />
      const operationTree = NodeConfigServicesFactory.getOperationTree(node.type as BlockNames_DTS)
      if (operationTree) {
        const trees = Array.isArray(operationTree) ? operationTree : [operationTree]
        return <LogicOperationEditor curNode={node} operationTree={trees} {...{ 'onSelect-node': (value: unknown) => this.$emit('select-node', value) }} />
      }
      if (node.type === BlockNames_DTS.LOGIC_FUNC_NODE) {
        return <MethodNodeConfig stageMode={this.stageMode} curSelectedNodeConfig={node as INodeConfig<IFuncNodeConfig>} allDatas={this.allDatas} methodList={this.methodList} {...{ 'onSelect-node': (value: unknown) => this.$emit('select-node', value) }} />
      }
      if (node.type === BlockNames_DTS.LOGIC_METHOD_REF_NODE) {
        return <MethodRefNodeConfig curSelectedNodeConfig={node as INodeConfig<IMethodRef>} methodList={this.methodList} {...{ 'onSelect-node': (value: unknown) => this.$emit('select-node', value) }} />
      }
      if ([
        BlockNames_DTS.LOGIC_STRING_NODE, BlockNames_DTS.LOGIC_BOOLEAN_NODE,
        BlockNames_DTS.LOGIC_NUMBER_NODE, BlockNames_DTS.LOGIC_ARRAY_NODE,
        BlockNames_DTS.LOGIC_OBJECT_NODE,
      ].includes(node.type as BlockNames_DTS)) {
        return <VariableNodeConfig stageMode={this.stageMode} curSelectedNodeConfig={node as INodeConfig<IVarNodeConfig>} allDatas={this.allDatas} methodList={this.methodList} {...{ 'onSelect-node': (value: unknown) => this.$emit('select-node', value) }} />
      }
      return <ElEmpty description="该节点无配置项" />
    },
  },
  render() {
    return (
      <aside class={style.rightBar}>
        <ElRadioGroup modelValue={this.mode}>
          <ElRadioButton value="config">节点配置</ElRadioButton>
        </ElRadioGroup>
        {this.renderNodeConfigPanel()}
      </aside>
    )
  },
})
