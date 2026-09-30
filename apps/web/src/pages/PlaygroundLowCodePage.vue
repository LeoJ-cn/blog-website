<script setup lang="ts">
import {
  DataType,
  LogicEditor,
  MethodType,
  createLowCodeContext,
  generatePageCode,
  type CodeGenerationResult,
  type Data,
  type LowCodeCompatibilityContext,
  type GraphData,
  type LogicEditorLifecycleBinding,
  type LogicEditorSavePayload,
  type Method,
} from '@blog/low-code'
import { ElButton } from 'element-plus'
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'

const STORAGE_KEY = 'blog-playground:low-code-editor:v1'

interface StoredEditorRecord {
  version: 1
  savedAt: string
  graphData: GraphData
  methods: Method[]
  data: Data[]
  lifecycleBindings: LogicEditorLifecycleBinding[]
  processDataByMethod: LogicEditorSavePayload['processDataByMethod']
  translatedBlockData: string
}

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
const translatedBlockData = ref('')
const generatedPageCode = ref<CodeGenerationResult | null>(null)
const hasSaveResult = ref(false)
const hasStoredRecord = ref(false)
const editorRevision = ref(0)

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

function createLifecycleStore(bindings: LogicEditorLifecycleBinding[]): Record<string, string[]> {
  return Object.fromEntries(bindings.map((binding) => [
    `${binding.lifecycle}_method_ids`,
    [...binding.methodIds],
  ]))
}

function isStoredEditorRecord(value: unknown): value is StoredEditorRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<StoredEditorRecord>
  return record.version === 1
    && typeof record.savedAt === 'string'
    && !!record.graphData
    && typeof record.graphData === 'object'
    && Array.isArray(record.methods)
    && record.methods.every((method) => method && typeof method.funcName === 'string' && Array.isArray(method.parameters))
    && Array.isArray(record.data)
    && Array.isArray(record.lifecycleBindings)
    && Array.isArray(record.processDataByMethod)
    && typeof record.translatedBlockData === 'string'
}

function persistEditorRecord(payload: LogicEditorSavePayload) {
  const record: StoredEditorRecord = {
    version: 1,
    savedAt: new Date().toISOString(),
    graphData: payload.graphData,
    methods,
    data,
    lifecycleBindings: payload.lifecycleBindings,
    processDataByMethod: payload.processDataByMethod,
    translatedBlockData: payload.blockData,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
    hasStoredRecord.value = true
  } catch (error) {
    context.feedback.error(`图表记录保存失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

function restoreEditorRecord() {
  const rawRecord = localStorage.getItem(STORAGE_KEY)
  if (!rawRecord) {
    hasStoredRecord.value = false
    context.feedback.warning('没有可恢复的本地图表记录')
    return
  }

  try {
    const record: unknown = JSON.parse(rawRecord)
    if (!isStoredEditorRecord(record)) throw new Error('记录版本或数据结构不受支持')

    methods.splice(0, methods.length, ...record.methods)
    data.splice(0, data.length, ...record.data)
    graphData.value = record.graphData
    lifecycleBindings.value = record.lifecycleBindings
    processDataByMethod.value = record.processDataByMethod
    translatedBlockData.value = record.translatedBlockData
    storeValues.set('ui_bind_lifecircle', createLifecycleStore(record.lifecycleBindings))
    generatedPageCode.value = generatePageCode({
      data,
      methods,
      lifecycleBindings: record.lifecycleBindings,
    })
    hasSaveResult.value = true
    // LogicEditorStage 持有三类图缓存，恢复记录后必须重建实例，确保缓存来自恢复后的领域数据。
    editorRevision.value += 1
    context.feedback.success(`已恢复 ${record.savedAt} 保存的图表记录`)
  } catch (error) {
    context.feedback.error(`图表记录恢复失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

function handleSave(payload: LogicEditorSavePayload) {
  graphData.value = payload.graphData
  processDataByMethod.value = payload.processDataByMethod
  lifecycleBindings.value = payload.lifecycleBindings
  translatedBlockData.value = payload.blockData
  // 页面代码必须统一组装变量、全部已提交方法和生命周期，不能只展示脱离宿主的函数片段。
  generatedPageCode.value = generatePageCode({ data, methods, lifecycleBindings: payload.lifecycleBindings })
  hasSaveResult.value = true
  persistEditorRecord(payload)
  context.store.set('ui_logic_visible', false)
}

function formatProcessData(processData: LogicEditorSavePayload['processData']) {
  return JSON.stringify(processData, null, 2)
}

onMounted(() => {
  hasStoredRecord.value = localStorage.getItem(STORAGE_KEY) !== null
})
</script>

<template>
  <article class="playground-content low-code-page">
    <p class="eyebrow">LOW CODE</p>
    <h2>逻辑编辑器</h2>
    <p class="playground-description">
      保留旧编辑器节点协议、图交互以及 SimpleProcessData[] / blockData 生成链路的 Vue 3 TSX 迁移版本。
    </p>

    <section class="low-code-host">
      <div class="low-code-actions">
        <ElButton type="primary" @click="openLogicEditor">编辑方法</ElButton>
        <ElButton :disabled="!hasStoredRecord" @click="restoreEditorRecord">恢复记录</ElButton>
      </div>
      <LogicEditor :key="editorRevision" v-model="graphData" :context="context" @save="handleSave" />
      <p>保存后会把完整图表记录写入 localStorage；刷新页面后可点击“恢复记录”继续编辑。</p>
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

      <article class="low-code-result-card translation-result-card">
        <h3>Blockly 翻译结果</h3>
        <div v-if="generatedPageCode" class="translation-layers">
          <section class="translation-layer">
            <div class="translation-layer-heading">
              <strong>第一层：Blockly XML</strong>
              <code>blockData</code>
            </div>
            <pre>{{ translatedBlockData }}</pre>
          </section>

          <section class="translation-layer">
            <div class="translation-layer-heading">
              <strong>第二层：最终代码</strong>
              <code>JavaScript</code>
            </div>
            <pre v-if="!generatedPageCode.diagnostics.length">{{ generatedPageCode.code }}</pre>
            <div v-else class="code-generation-diagnostics">
              <p>当前流程包含尚未完成代码生成的 Blockly 块：</p>
              <ul>
                <li v-for="diagnostic in generatedPageCode.diagnostics" :key="`${diagnostic.stage}:${diagnostic.message}`">
                  <code>{{ diagnostic.stage }}</code>
                  <span>{{ diagnostic.message }}</span>
                </li>
              </ul>
            </div>
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

.low-code-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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

.translation-result-card {
  grid-column: 1 / -1;
}

.translation-layers {
  display: grid;
  gap: 20px;
}

.translation-layer {
  min-width: 0;
}

.translation-layer-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.translation-layer-heading code {
  color: #94a3b8;
}

.code-generation-diagnostics {
  color: #fca5a5;
}

.code-generation-diagnostics p {
  margin: 0 0 12px;
}

.code-generation-diagnostics ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
}

.code-generation-diagnostics li {
  display: flex;
  gap: 8px;
  align-items: baseline;
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
