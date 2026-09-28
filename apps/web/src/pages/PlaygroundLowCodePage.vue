<script setup lang="ts">
import {
  DataType,
  LogicEditor,
  LogicEditorService,
  MethodType,
  createLowCodeContext,
  type LowCodeCompatibilityContext,
  type GraphData,
  type Method,
  type SimpleProcessData,
} from '@blog/low-code'
import { computed, reactive, ref, shallowRef } from 'vue'

const initialMethod: Method = {
  id: 'playground_main_method',
  funcName: 'playgroundMain',
  funcLabel: '演示方法',
  explanatory: '低代码逻辑编辑器最小闭环演示',
  parameters: [],
  blockData: '',
  graphData: '',
  methodType: MethodType.pageMethod,
  funcReturn: { state: true, type: DataType.String, schema: { type: DataType.String } },
  temp_data: [],
  access_modifier: { accessible: true, editable: true },
}

// G6 的 GraphData 含 class 实例引用，不能由 Vue 深层代理展开，否则类型和运行时身份都会变化。
const graphData = shallowRef<GraphData>({ nodes: [], edges: [] })
const methods = reactive<Method[]>([initialMethod])
const data = reactive<LowCodeCompatibilityContext['data']>([])
const storeValues = new Map<string, unknown>([['ui_logic_visible', true]])
const listeners = new Map<string, Set<(...args: any[]) => void>>()
const savedGraph = ref('')
const savedProcess = ref('')
const savedBlockData = ref('')

const context = createLowCodeContext({
  methods,
  data,
  store: {
    get: <T,>(key: string) => storeValues.get(key) as T | undefined,
    set: <T,>(key: string, value: T) => { storeValues.set(key, value) },
    delete: (key: string) => { storeValues.delete(key) },
  },
  dispatcher: {
    listen(event, listener) {
      const group = listeners.get(event) || new Set()
      group.add(listener)
      listeners.set(event, group)
    },
    trigger(event, ...args) { listeners.get(event)?.forEach((listener) => listener(...args)) },
    unlisten(event, listener) { listeners.get(event)?.delete(listener) },
  },
  controller: {
    getCategories: async () => [],
    getLogicNodes: async () => [],
    getApis: async () => [],
  },
  getLocale: () => 'zh-CN',
  translate: (key) => ({
    'logicEditor.title': '逻辑编辑器',
    'logicEditor.methodList': '方法',
    'logicEditor.variableView': '变量',
    save: '保存',
  })[key] || key,
  feedback: {
    success: (message) => { console.info(message) },
    error: (message) => { console.error(message) },
    warning: (message) => { console.warn(message) },
    confirm: async (message) => window.confirm(message),
  },
})

const hasSavedResult = computed(() => Boolean(savedGraph.value || savedBlockData.value))

function handleSave(value: GraphData) {
  graphData.value = value
  savedGraph.value = JSON.stringify(value, null, 2)
  const method = methods.find((item) => item.id === initialMethod.id) || methods[0]
  if (!method) return
  const methodGraph = method?.graphData ? JSON.parse(method.graphData) as GraphData : value
  const service = new LogicEditorService(methodGraph, method?.id || '')
  method.blockData = service.blockly
  savedBlockData.value = service.blockly
  try {
    savedProcess.value = JSON.stringify(JSON.parse(service.blockly) as SimpleProcessData[], null, 2)
  } catch {
    savedProcess.value = service.blockly
  }
}
</script>

<template>
  <article class="playground-content low-code-page">
    <p class="eyebrow">LOW CODE</p>
    <h2>逻辑编辑器</h2>
    <p class="playground-description">
      保留旧编辑器节点协议、图交互以及 SimpleProcessData[] / blockData 生成链路的 Vue 3 TSX 迁移版本。
    </p>

    <section class="low-code-host">
      <LogicEditor v-model="graphData" :context="context" @save="handleSave" />
      <p>编辑器将以抽屉形式打开。双击方法节点进入方法详情，再拖入节点并连接。</p>
    </section>

    <section v-if="hasSavedResult" class="low-code-results">
      <h3>保存结果</h3>
      <details open><summary>GraphData</summary><pre>{{ savedGraph }}</pre></details>
      <details><summary>SimpleProcessData[]</summary><pre>{{ savedProcess }}</pre></details>
      <details><summary>blockData</summary><pre>{{ savedBlockData }}</pre></details>
    </section>
  </article>
</template>

<style scoped>
.low-code-host {
  min-height: 480px;
  padding: 24px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.36);
}

.low-code-results {
  margin-top: 24px;
}

.low-code-results details {
  margin: 12px 0;
}

.low-code-results pre {
  max-height: 360px;
  padding: 16px;
  overflow: auto;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  white-space: pre-wrap;
}
</style>
