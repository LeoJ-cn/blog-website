<script setup lang="ts">
import {
  DataType,
  LogicEditor,
  MethodType,
  createLowCodeContext,
  type LowCodeCompatibilityContext,
  type GraphData,
  type LogicEditorSavePayload,
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
  // 生命周期演示方法不返回业务数据，避免结束节点被错误地要求连接返回值。
  funcReturn: { state: false, type: DataType.Undefined, schema: { type: DataType.Undefined } },
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
const processDataByMethod = ref<LogicEditorSavePayload['processDataByMethod']>([])
const lifecycleBindings = ref<LogicEditorSavePayload['lifecycleBindings']>([])
const hasSaveResult = ref(false)

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

const methodLabels = computed(() => new Map(methods.map((method) => [method.id, method.funcLabel || method.funcName])))

function getMethodLabel(methodId: string) {
  return methodLabels.value.get(methodId) || methodId
}

function openLogicEditor() {
  context.store.set('ui_logic_visible', true)
}

function handleSave(payload: LogicEditorSavePayload) {
  graphData.value = payload.graphData
  processDataByMethod.value = payload.processDataByMethod
  lifecycleBindings.value = payload.lifecycleBindings
  hasSaveResult.value = true
  context.store.set('ui_logic_visible', false)
}

function formatProcessData(processData: LogicEditorSavePayload['processData']) {
  return JSON.stringify(processData, null, 2)
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
      <p>点击“编辑方法”打开逻辑编辑器。保存后，方法流程与生命周期绑定会显示在下方。</p>
    </section>

    <section v-if="hasSaveResult" class="low-code-results">
      <article class="low-code-result-card">
        <h3>生命周期绑定</h3>
        <div v-if="lifecycleBindings.length" class="lifecycle-bindings">
          <div v-for="binding in lifecycleBindings" :key="binding.lifecycle" class="lifecycle-binding">
            <div>
              <strong>{{ binding.label }}</strong>
              <code>{{ binding.lifecycle }}</code>
            </div>
            <p class="lifecycle-flow-label">↓ 依次触发</p>
            <ol>
              <li v-for="methodId in binding.methodIds" :key="methodId">
                <span>{{ getMethodLabel(methodId) }}</span>
                <code>{{ methodId }}</code>
              </li>
            </ol>
          </div>
        </div>
        <p v-else class="empty-result">尚未连接生命周期。</p>
      </article>

      <article class="low-code-result-card">
        <h3>各方法的 processData</h3>
        <div class="method-process-list">
          <section
            v-for="methodResult in processDataByMethod"
            :key="methodResult.methodId"
            class="method-process-result"
          >
            <div class="method-process-heading">
              <strong>{{ methodResult.methodName }}</strong>
              <code>{{ methodResult.methodId }}</code>
            </div>
            <pre>{{ formatProcessData(methodResult.processData) }}</pre>
          </section>
        </div>
      </article>
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 24px;
}

.low-code-result-card {
  min-width: 0;
  padding: 20px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.36);
}

.low-code-result-card h3 {
  margin: 0 0 16px;
}

.low-code-result-card pre {
  margin: 0;
  max-height: 360px;
  padding: 16px;
  overflow: auto;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  white-space: pre-wrap;
}

.method-process-list {
  display: grid;
  gap: 16px;
}

.method-process-result {
  min-width: 0;
}

.method-process-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.method-process-heading code {
  color: #94a3b8;
  overflow-wrap: anywhere;
}

.lifecycle-bindings {
  display: grid;
  gap: 12px;
}

.lifecycle-binding {
  padding: 16px;
  border: 1px solid rgba(94, 234, 212, 0.3);
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.08);
}

.lifecycle-binding > div,
.lifecycle-binding li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.lifecycle-binding ol {
  display: grid;
  gap: 8px;
  margin: 14px 0 0;
  padding-left: 24px;
}

.lifecycle-flow-label {
  margin: 12px 0 0;
  color: #5eead4;
  font-size: 13px;
}

.lifecycle-binding code,
.empty-result {
  color: #94a3b8;
}

@media (max-width: 900px) {
  .low-code-results {
    grid-template-columns: 1fr;
  }
}
</style>
