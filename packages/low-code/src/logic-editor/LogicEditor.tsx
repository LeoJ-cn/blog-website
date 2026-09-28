import { ElButton, ElDrawer, ElRadioButton, ElRadioGroup } from 'element-plus'
import { defineComponent, type PropType } from 'vue'
import type { GraphData } from '@antv/g6'
import type { LowCodeCompatibilityContext } from '../compatibility/types'
import { createLowCodeContext, provideLowCodeContext } from '../compatibility/context'
import { GraphUtil } from './graph/graph-util'
import type { INodeConfig, LifeCircleItem } from './interface'
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
    lifeCycles(): LifeCircleItem[] {
      return (this.context.store.get('lifeCycles') as LifeCircleItem[] | undefined) || []
    },
  },
  created() {
    createLowCodeContext(this.context)
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
      if (mode === 'method') this.stageMode = this.preStageMode
      else {
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
    saveLogicData() {
      this.context.dispatcher.trigger('@idg/gui/logic/save')
      this.$emit('save', this.modelValue)
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
      <ElDrawer modelValue={this.visible} size="90%" class={style['logic-editor-drawer']} {...drawerListeners}>
        {{
          header: () => (
            <div class={style['drawer-header']}>
              <h2>{this.context.translate('logicEditor.title')}</h2>
              <ElRadioGroup modelValue={this.mode} onChange={this.radioChange}>
                <ElRadioButton value="method">{this.context.translate('logicEditor.methodList')}</ElRadioButton>
                <ElRadioButton value="variable">{this.context.translate('logicEditor.variableView')}</ElRadioButton>
              </ElRadioGroup>
              <ElButton type="primary" onClick={this.saveLogicData}>{this.context.translate('save')}</ElButton>
            </div>
          ),
          default: () => (
            <div class={style['drawer-content']}>
              <LogicEditorLeftBar stageMode={this.stageMode} methodList={this.methodList} allDatas={this.allDatas} />
              <LogicEditorStage
                modelValue={this.modelValue}
                stageMode={this.stageMode}
                methodList={this.methodList}
                lifeCycles={this.lifeCycles}
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
