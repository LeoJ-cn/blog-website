<script setup lang="ts">
import {
  DataType,
  LogicEditor,
  MethodType,
  createLowCodeContext,
  type LowCodeCompatibilityContext,
  type GraphData,
  type Method,
} from '@blog/low-code'
import { ElButton } from 'element-plus'
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
// 使用响应式 Map 承载兼容层状态，确保外部按钮更新后编辑器抽屉能立即响应。
const storeValues = reactive(new Map<string, unknown>([['ui_logic_visible', false]]))
const listeners = new Map<string, Set<(...args: any[]) => void>>()
const processData = ref('')

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

const hasProcessData = computed(() => Boolean(processData.value))

function openLogicEditor() {
  context.store.set('ui_logic_visible', true)
}

function handleSave(value: GraphData) {
  graphData.value = value
  const method = methods.find((item) => item.id === initialMethod.id) || methods[0]
  try {
    const savedProcessData = method?.blockData || '[]'

    try {
      processData.value = JSON.stringify(JSON.parse(savedProcessData), null, 2)
    } catch {
      // 兼容迁移期的非 JSON blockData，避免保存成功后首页没有任何结果反馈。
      processData.value = savedProcessData
    }
  } finally {
    context.store.set('ui_logic_visible', false)
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
      <ElButton type="primary" @click="openLogicEditor">编辑方法</ElButton>
      <LogicEditor v-model="graphData" :context="context" @save="handleSave" />
      <p>点击“编辑方法”打开逻辑编辑器。保存后，生成的 processData 会显示在下方。</p>
    </section>

    <section v-if="hasProcessData" class="low-code-results">
      <h3>processData</h3>
      <pre>{{ processData }}</pre>
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

.low-code-host p {
  margin: 16px 0 0;
}

.low-code-results {
  margin-top: 24px;
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
