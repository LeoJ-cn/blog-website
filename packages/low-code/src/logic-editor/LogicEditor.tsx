import { ElButton, ElDrawer, ElRadioButton, ElRadioGroup } from 'element-plus'
import { defineComponent, type PropType } from 'vue'
import type { GraphData } from '@antv/g6'
import type { LowCodeCompatibilityContext } from '../compatibility/types'
import type { LogicEditorSavePayload } from '../types/logic-editor'
import { provideLowCodeContext } from '../compatibility/context'
import { GraphUtil } from './graph/graph-util'
import type { INodeConfig } from './interface'
import { StageMode } from './interface'
import style from './styles/logic-editor.module.scss'
import LogicEditorLeftBar from './LogicEditorLeftBar'
import LogicEditorRightBar from './LogicEditorRightBar'
import LogicEditorStage from './LogicEditorStage'

export default defineComponent({
  name: 'LogicEditor',
  props: {
    modelValue: { type: Object as PropType<GraphData>, required: true },
    context: { type: Object as PropType<LowCodeCompatibilityContext>, required: true },
  },
  emits: ['update:modelValue', 'save', 'select-node', 'change-graph'],
  setup(props) {
    provideLowCodeContext(props.context)
    return {}
  },
  data() {
    return {
      stageMode: StageMode.METHOD_LIST,
      mode: 'method' as 'method' | 'variable',
      curSelectedNodeConfig: null as INodeConfig | null,
      preStageMode: StageMode.METHOD_LIST,
      stage: null as InstanceType<typeof LogicEditorStage> | null,
      saving: false,
    }
  },
  computed: {
    visible(): boolean {
      return (this.context.store.get('ui_logic_visible') as boolean | undefined) ?? true
    },
    methodList() {
      return this.context.methods
    },
    allDatas() {
      return this.context.data
    },
  },
  methods: {
    watchCurPageUuid(uuid: string) {
      if (uuid) {
        this.curSelectedNodeConfig = null
        this.mode = 'method'
        this.stageMode = this.preStageMode = StageMode.METHOD_LIST
        GraphUtil.getInstance().storeCurMode(StageMode.METHOD_LIST)
        GraphUtil.getInstance().storeGraphData({
          [StageMode.METHOD_LIST]: null,
          [StageMode.METHOD_DETAIL]: {},
          [StageMode.VARIABLE_LIST]: null,
        })
      }
    },
    onNodeSelected(node: INodeConfig) {
      this.curSelectedNodeConfig = node
      this.$emit('select-node', node)
    },
    radioChange(mode: 'method' | 'variable') {
      if (mode === this.mode) return

      this.mode = mode
      if (mode === 'method') {
        this.stageMode = [StageMode.METHOD_LIST, StageMode.METHOD_DETAIL].includes(this.preStageMode)
          ? this.preStageMode
          : StageMode.METHOD_LIST
      } else {
        // 只记录方法相关阶段，避免重复选择变量后把返回目标覆盖为变量阶段。
        this.preStageMode = this.stageMode
        this.stageMode = StageMode.VARIABLE_LIST
      }
    },
    onGraphChange(stageMode: StageMode, graphData?: GraphData) {
      this.stageMode = stageMode
      this.mode = stageMode === StageMode.VARIABLE_LIST ? 'variable' : 'method'
      this.$emit('change-graph', stageMode)
      if (graphData) this.$emit('update:modelValue', graphData)
    },
    async saveLogicData() {
      if (this.saving || !this.stage) return
      this.saving = true
      try {
        const payload: LogicEditorSavePayload = await this.stage.save()
        this.$emit('save', payload)
        this.context.feedback.success('方法更新成功')
      } catch (error) {
        this.context.feedback.error(error instanceof Error ? error.message : String(error))
      } finally {
        this.saving = false
      }
    },
    easyLayout() {
      this.context.dispatcher.trigger('@idg/gui/logic/layout')
    },
  },
  render() {
    const drawerListeners = {
      'onUpdate:modelValue': (value: boolean) => this.context.store.set('ui_logic_visible', value),
    }
    return (
      <ElDrawer modelValue={this.visible} size="90%" class={style.logicEditorDrawer} {...drawerListeners}>
        {{
          header: () => (
            <div class={style.drawerHeader}>
              <h2>{this.context.translate('logicEditor.title')}</h2>
              <ElRadioGroup
                modelValue={this.mode}
                onUpdate:modelValue={(value) => this.radioChange(value as 'method' | 'variable')}
              >
                <ElRadioButton value="method">{this.context.translate('logicEditor.methodList')}</ElRadioButton>
                <ElRadioButton value="variable">{this.context.translate('logicEditor.variableView')}</ElRadioButton>
              </ElRadioGroup>
              <ElButton onClick={this.easyLayout}>自动排版</ElButton>
              <ElButton type="primary" loading={this.saving} disabled={this.saving} onClick={this.saveLogicData}>
                {this.context.translate('save')}
              </ElButton>
            </div>
          ),
          default: () => (
            <div class={style.drawerContent}>
              <LogicEditorLeftBar stageMode={this.stageMode} methodList={this.methodList} allDatas={this.allDatas} />
              <LogicEditorStage
                ref={(instance) => { this.stage = instance as InstanceType<typeof LogicEditorStage> | null }}
                modelValue={this.modelValue}
                visible={this.visible}
                stageMode={this.stageMode}
                methodList={this.methodList}
                allDatas={this.allDatas}
                {...{
                  'onChange-graph': this.onGraphChange,
                  'onSelect-node': this.onNodeSelected,
                }}
              />
              <LogicEditorRightBar
                stageMode={this.stageMode}
                allDatas={this.allDatas}
                methodList={this.methodList}
                curSelectedNodeConfig={this.curSelectedNodeConfig}
                {...{ 'onSelect-node': (node: unknown) => this.onNodeSelected(node as INodeConfig) }}
              />
            </div>
          ),
        }}
      </ElDrawer>
    )
  },
})
