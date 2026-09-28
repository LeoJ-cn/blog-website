<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CodeBlock from '../components/CodeBlock.vue'
import articleSource from '../components/text-labeling/text.txt?raw'
import TextLabeling, { type TextAnnotation } from '../components/text-labeling/TextLabeling'
import {
  captureXPathSelection,
  restoreXPathSelection,
  type XPathSelectionSnapshot,
} from '../components/text-labeling/xpath-selection'
import { projects } from '../data/projects'

type ArticleBlock =
  | { type: 'title'; content: string }
  | { type: 'section'; content: string }
  | { type: 'paragraph'; content: string }

const tabs = [
  { id: 'demo', label: 'Demo' },
  { id: 'principle', label: '实现原理' },
  { id: 'source', label: '源码' },
  { id: 'compatibility', label: '兼容性' },
] as const

const STORAGE_KEY = 'blog-web:text-labeling:smart-planter'
const project = projects.find((item) => item.slug === 'text-labeling')!
const activeTab = ref<(typeof tabs)[number]['id']>('demo')
const activeSourceIndex = ref(0)
const activeSource = computed(() => project.sources[activeSourceIndex.value])
const articleElement = ref<HTMLElement | null>(null)
const annotations = ref<TextAnnotation[]>([])
const annotationCount = computed(() => annotations.value.length)
const areAnnotationsVisible = ref(true)
const feedback = ref('选中正文后点击鼠标右键，即可创建标注。')
const feedbackTone = ref<'neutral' | 'success' | 'warning'>('neutral')
const xpathDocumentElement = ref<HTMLElement | null>(null)
const xpathSnapshot = ref<XPathSelectionSnapshot | null>(null)
const xpathFeedback = ref('在下方正文中选择文字，然后记录它的 XPath 与 offset。')
const xpathFeedbackTone = ref<'neutral' | 'success' | 'warning'>('neutral')
let labeling: TextLabeling | null = null
let isChangingAnnotationVisibility = false

const articleBlocks = computed<ArticleBlock[]>(() =>
  articleSource
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith('# ')) {
        return { type: 'title', content: block.slice(2) }
      }
      if (block.startsWith('**') && block.endsWith('**')) {
        return { type: 'section', content: block.slice(2, -2) }
      }
      return { type: 'paragraph', content: block }
    }),
)

function isStoredAnnotation(value: unknown): value is TextAnnotation {
  if (!value || typeof value !== 'object') return false

  const annotation = value as Partial<TextAnnotation>
  // 此处只验证恢复 API 必需的持久化字段；边界、原文和重叠由核心类结合当前正文判断。
  return (
    typeof annotation.id === 'string' &&
    Number.isInteger(annotation.startOffset) &&
    Number.isInteger(annotation.endOffset) &&
    typeof annotation.selectedText === 'string'
  )
}

function persistAnnotations() {
  if (!labeling) return

  annotations.value = labeling.getAnnotations()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations.value))
}

function clearAnnotations() {
  if (!labeling || annotationCount.value === 0) return

  isChangingAnnotationVisibility = true
  const removed = areAnnotationsVisible.value ? labeling.clearAnnotations() : annotations.value
  isChangingAnnotationVisibility = false
  localStorage.removeItem(STORAGE_KEY)
  annotations.value = []
  areAnnotationsVisible.value = true
  labeling.init()
  feedback.value = `已清空 ${removed.length} 条标注。`
  feedbackTone.value = 'neutral'
}

function temporarilyCloseAnnotations() {
  if (!labeling || !areAnnotationsVisible.value || annotationCount.value === 0) return

  const snapshot = annotations.value.map((annotation) => ({
    ...annotation,
    actionData: annotation.actionData ? { ...annotation.actionData } : undefined,
  }))
  isChangingAnnotationVisibility = true
  labeling.clearAnnotations()
  isChangingAnnotationVisibility = false
  labeling.destroy()
  annotations.value = snapshot
  areAnnotationsVisible.value = false
  feedback.value = `已临时关闭 ${snapshot.length} 条标注，记录仍保留在本地。`
  feedbackTone.value = 'neutral'
}

function restoreVisibleAnnotations() {
  if (!labeling || areAnnotationsVisible.value || annotationCount.value === 0) return

  labeling.init()
  const result = labeling.restoreAnnotations(annotations.value)
  annotations.value = result.restored
  areAnnotationsVisible.value = true
  persistAnnotations()

  if (result.failed.length > 0) {
    feedback.value = `已恢复 ${result.restored.length} 条标注，跳过 ${result.failed.length} 条失效记录。`
    feedbackTone.value = 'warning'
  } else {
    feedback.value = `已恢复 ${result.restored.length} 条标注。`
    feedbackTone.value = 'success'
  }
}

function restoreStoredAnnotations() {
  if (!labeling) return

  const storedValue = localStorage.getItem(STORAGE_KEY)
  if (!storedValue) return

  try {
    const parsed: unknown = JSON.parse(storedValue)
    const storedAnnotations = Array.isArray(parsed) ? parsed.filter(isStoredAnnotation) : []
    const discardedCount = Array.isArray(parsed) ? parsed.length - storedAnnotations.length : 1
    const result = labeling.restoreAnnotations(storedAnnotations)

    annotations.value = result.restored
    if (result.failed.length > 0 || discardedCount > 0) {
      feedback.value = `已恢复 ${result.restored.length} 条标注，跳过 ${result.failed.length + discardedCount} 条失效记录。`
      feedbackTone.value = 'warning'
      // 清除格式非法或因原文变化而失效的数据，避免每次刷新都重复报告同一批失败记录。
      persistAnnotations()
    } else if (result.restored.length > 0) {
      feedback.value = `已从本地恢复 ${result.restored.length} 条标注。`
      feedbackTone.value = 'success'
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    feedback.value = '本地标注数据无法解析，已忽略该记录。'
    feedbackTone.value = 'warning'
  }
}

function captureXPath() {
  if (!xpathDocumentElement.value) return

  try {
    xpathSnapshot.value = captureXPathSelection(xpathDocumentElement.value)
    xpathFeedback.value = `已记录“${xpathSnapshot.value.selectedText}”的 XPath 位置。`
    xpathFeedbackTone.value = 'success'
  } catch (error) {
    xpathFeedback.value = error instanceof Error ? error.message : '无法记录当前选区。'
    xpathFeedbackTone.value = 'warning'
  }
}

function restoreXPath() {
  if (!xpathDocumentElement.value || !xpathSnapshot.value) return

  try {
    restoreXPathSelection(xpathDocumentElement.value, xpathSnapshot.value)
    xpathFeedback.value = `已恢复“${xpathSnapshot.value.selectedText}”的浏览器选区。`
    xpathFeedbackTone.value = 'success'
  } catch (error) {
    xpathFeedback.value = error instanceof Error ? error.message : '无法恢复保存的选区。'
    xpathFeedbackTone.value = 'warning'
  }
}

function clearXPathSnapshot() {
  const selection = xpathDocumentElement.value?.ownerDocument.defaultView?.getSelection()
  const hasSelection = Boolean(selection && selection.rangeCount > 0)
  const hasSnapshot = Boolean(xpathSnapshot.value)

  if (!hasSelection && !hasSnapshot) {
    xpathFeedback.value = '当前没有需要清除的标记。'
    xpathFeedbackTone.value = 'neutral'
    return
  }

  selection?.removeAllRanges()
  xpathSnapshot.value = null
  xpathFeedback.value = '已清除当前选区和 XPath 标记，无法再恢复。'
  xpathFeedbackTone.value = 'neutral'
}

onMounted(() => {
  if (!articleElement.value) return

  // localStorage 只用于此演示页验证刷新恢复；核心类仅暴露快照和恢复 API，不感知存储介质。
  labeling = new TextLabeling({
    container: articleElement.value,
    useMenu: true,
    callback: {
      afterAdd: (_actionConfig, annotation) => {
        if (isChangingAnnotationVisibility) return
        persistAnnotations()
        feedback.value = `已标注“${annotation.selectedText}”，位置 ${annotation.startOffset}–${annotation.endOffset}。`
        feedbackTone.value = 'success'
      },
      afterRemove: (_actionConfig, annotation) => {
        if (isChangingAnnotationVisibility) return
        persistAnnotations()
        feedback.value = `已删除“${annotation.selectedText}”的标注。`
        feedbackTone.value = 'neutral'
      },
    },
  })
  labeling.init()
  restoreStoredAnnotations()
})

onBeforeUnmount(() => {
  labeling?.destroy()
  labeling = null
})
</script>

<template>
  <article class="playground-content text-labeling-page" data-page="text-labeling">
    <p class="eyebrow">BROWSER</p>
    <h2>{{ project.title }}</h2>
    <p class="playground-description">{{ project.description }}</p>
    <div class="project-meta">
      <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
      <span>更新于 {{ project.updatedAt }}</span>
    </div>

    <section class="labeling-workspace" aria-labelledby="labeling-document-title">
      <header class="labeling-toolbar" data-text-labeling-ignore>
        <div class="labeling-toolbar__intro">
          <p class="eyebrow">RANGE OFFSET</p>
          <h3>用全局文本坐标保存并恢复标注</h3>
          <p>将选区转换为 [startOffset, endOffset) 区间，再通过 Range API 重建高亮。</p>
        </div>
        <div class="labeling-actions">
          <button
            type="button"
            :disabled="areAnnotationsVisible || annotationCount === 0"
            @click="restoreVisibleAnnotations"
          >
            恢复标注
          </button>
          <button
            type="button"
            :disabled="!areAnnotationsVisible || annotationCount === 0"
            @click="temporarilyCloseAnnotations"
          >
            临时关闭标注
          </button>
          <button type="button" :disabled="annotationCount === 0" @click="clearAnnotations">
            清除所有标注
          </button>
        </div>
      </header>

      <div class="labeling-layout">
        <div class="labeling-main">
          <div class="labeling-hint" data-text-labeling-ignore>
            <strong>操作方式</strong>
            <span>拖动选中正文 → 鼠标右键 → 添加标注。点击高亮内的 × 可删除。</span>
          </div>

          <!-- 标注器会直接包装正文 DOM；v-once 防止 Vue 后续 patch 覆盖这些命令式修改。 -->
          <div ref="articleElement" v-once class="labeling-document">
            <template v-for="(block, index) in articleBlocks" :key="`${block.type}-${index}`">
              <h1 v-if="block.type === 'title'" id="labeling-document-title">
                {{ block.content }}
              </h1>
              <h2 v-else-if="block.type === 'section'">{{ block.content }}</h2>
              <p v-else>{{ block.content }}</p>
            </template>
          </div>
        </div>

        <aside id="annotation-records" class="annotation-records" data-text-labeling-ignore>
          <div class="annotation-records__heading">
            <strong>标注记录</strong>
            <span>{{ annotationCount }} 条 · 区间采用 [startOffset, endOffset)</span>
          </div>
          <p :class="['annotation-feedback', `is-${feedbackTone}`]" role="status">
            {{ feedback }}
          </p>
          <ol v-if="annotationCount > 0" class="annotation-records__list">
            <li v-for="(annotation, index) in annotations" :key="annotation.id">
              <span class="annotation-records__index">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              <blockquote>“{{ annotation.selectedText }}”</blockquote>
              <dl>
                <div>
                  <dt>START</dt>
                  <dd>{{ annotation.startOffset }}</dd>
                </div>
                <div>
                  <dt>END</dt>
                  <dd>{{ annotation.endOffset }}</dd>
                </div>
                <div class="annotation-records__id">
                  <dt>ID</dt>
                  <dd>{{ annotation.id }}</dd>
                </div>
              </dl>
            </li>
          </ol>
          <p v-else class="annotation-records__empty">
            还没有标注记录，请先在左侧正文中创建一条标注。
          </p>
        </aside>
      </div>
    </section>

    <section class="xpath-workspace" aria-labelledby="xpath-demo-title">
      <header class="xpath-workspace__header">
        <div>
          <p class="eyebrow">XPATH RANGE</p>
          <h3 id="xpath-demo-title">用 DOM 路径保存并还原浏览器选区</h3>
          <p>记录选区起止节点的相对 XPath 与 offset，再通过 Range API 恢复。</p>
        </div>
        <div class="xpath-actions">
          <button type="button" @mousedown.prevent @click="captureXPath">记录当前选区</button>
          <button type="button" :disabled="!xpathSnapshot" @click="restoreXPath">恢复选区</button>
          <button type="button" @click="clearXPathSnapshot">清除标记</button>
        </div>
      </header>

      <div class="xpath-layout">
        <div ref="xpathDocumentElement" class="xpath-document">
          <h4>浏览器如何描述一段复杂选区</h4>
          <p>
            浏览器的
            <strong>Selection</strong>
            描述用户当前选中的内容，
            <code>Range</code>
            保存选区两端对应的 DOM 节点与节点内偏移。
          </p>
          <p>
            XPath 会把普通文本、
            <em>强调内容</em>
            和嵌套的行内节点转换成不同路径。你可以从一个节点拖动到另一个节点，观察起止路径如何变化。
          </p>
          <ul>
            <li>
              选择同一段落中的连续文本，比较两个
              <code>text()</code>
              节点。
            </li>
            <li>
              跨越
              <strong>粗体</strong>
              、
              <em>斜体</em>
              或代码节点，观察层级路径。
            </li>
            <li>从列表项拖动到下方引用，验证跨块 Range 的恢复效果。</li>
          </ul>
          <blockquote>
            DOM 结构保持不变时，XPath 与 offset 可以精确重建选区；节点结构变化后则需要额外校验。
          </blockquote>
        </div>

        <dl class="xpath-snapshot">
          <div style="grid-column: 1 / -1; padding: 0">
            <p :class="['xpath-feedback', `is-${xpathFeedbackTone}`]" role="status">
              {{ xpathFeedback }}
            </p>
          </div>

          <div>
            <dt>START XPATH</dt>
            <dd>{{ xpathSnapshot?.startXPath ?? '—' }}</dd>
          </div>
          <div>
            <dt>START OFFSET</dt>
            <dd>{{ xpathSnapshot?.startOffset ?? '—' }}</dd>
          </div>
          <div>
            <dt>END XPATH</dt>
            <dd>{{ xpathSnapshot?.endXPath ?? '—' }}</dd>
          </div>
          <div>
            <dt>END OFFSET</dt>
            <dd>{{ xpathSnapshot?.endOffset ?? '—' }}</dd>
          </div>
          <div class="xpath-snapshot__text">
            <dt>SELECTED TEXT</dt>
            <dd>{{ xpathSnapshot?.selectedText ?? '等待记录选区' }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <nav class="content-tabs" aria-label="技术内容" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="{ 'is-active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        role="tab"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <section v-if="activeTab === 'source'" class="tab-panel tab-panel--source" role="tabpanel">
      <div class="source-viewer">
        <nav class="source-files" aria-label="源码文件">
          <button
            v-for="(source, index) in project.sources"
            :key="source.path"
            type="button"
            :class="{ 'is-active': activeSourceIndex === index }"
            @click="activeSourceIndex = index"
          >
            <span>{{ source.label }}</span>
            <small>{{ source.path }}</small>
          </button>
        </nav>
        <CodeBlock
          :code="activeSource.content"
          :language="activeSource.language"
          :filename="activeSource.label"
        />
      </div>
    </section>

    <section v-else-if="activeTab === 'principle'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">HOW IT WORKS</p>
      <h3>用稳定文本坐标保存位置，再从当前 DOM 重建 Range。</h3>
      <p>
        创建标注时，组件把 Selection 对应的 Range 转换为正文 canonical text 中的 [startOffset,
        endOffset) 半开区间，同时保存 selectedText。恢复时先校验原文快照、边界、重叠和文本块，再把
        offset 映射回 Text 节点并重新包装高亮。多条记录从后向前恢复，避免前一次 DOM
        包装改变后续位置。
      </p>
    </section>

    <section v-else-if="activeTab === 'compatibility'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">COMPATIBILITY</p>
      <h3>依赖标准 Selection 与 Range API，并为持久化变化提供安全降级。</h3>
      <p>
        现代浏览器可直接使用 Selection、Range、TreeWalker 和 crypto.randomUUID；缺少 randomUUID
        时会生成时间戳标识。localStorage 仅是本 Demo 的存储适配层，不属于标注核心。当前单 wrapper
        模型不支持跨段落、标题或列表项标注，失效的历史记录会在恢复时跳过。
      </p>
    </section>

    <section v-else class="tab-panel tab-panel--demo" role="tabpanel">
      <p class="eyebrow">DEMO OVERVIEW</p>
      <h3>验证文本标注从创建、删除到刷新恢复的完整生命周期。</h3>
      <p>
        在同一文本块内拖动选择正文，点击鼠标右键并添加标注；点击高亮末尾的 × 可删除。标注使用全局
        offset 和原文快照保存到
        localStorage，刷新页面后自动恢复。重叠选择和跨文本块选择会被拒绝，避免生成歧义区间或非法
        DOM。
      </p>
    </section>
  </article>
</template>

<style scoped lang="scss">
.labeling-workspace {
  background: rgb(13 20 36 / 82%);
  border: 1px solid #263453;
  border-radius: 12px;
  margin-top: 28px;
  overflow: hidden;
}

.labeling-toolbar {
  align-items: end;
  background: #111a2e;
  border-bottom: 1px solid #263453;
  display: flex;
  gap: 24px;
  justify-content: space-between;
  padding: 22px clamp(22px, 4vw, 36px);
}

.labeling-toolbar__intro .eyebrow {
  margin-bottom: 8px;
}

.labeling-toolbar__intro h3 {
  color: #edf2fb;
  font-size: 19px;
  margin: 0 0 7px;
}

.labeling-toolbar__intro p:last-child {
  color: #8290aa;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

.labeling-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.labeling-actions button {
  background: transparent;
  border: 1px solid #3a4968;
  border-radius: 6px;
  color: #c5d0e5;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 7px 11px;
}

.labeling-actions button:last-child {
  border-color: #71404a;
  color: #f0a9b3;
}

.labeling-actions button:hover:not(:disabled) {
  border-color: #697a9c;
  color: #fff;
}

.labeling-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.annotation-records {
  background: #0d1527;
  border-left: 1px solid #263453;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-height: 474px;
  min-width: 0;
  overflow: hidden;
  padding: 20px 18px 24px;
}

.annotation-records__heading {
  align-items: baseline;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 14px;
}

.annotation-records__heading strong {
  color: #e4eaf5;
  font-size: 14px;
}

.annotation-records__heading span,
.annotation-records__empty {
  color: #71809d;
  font-size: 12px;
}

.annotation-feedback {
  background: #111a2e;
  border: 1px solid #263453;
  border-radius: 6px;
  color: #8290aa;
  font-size: 11px;
  line-height: 1.55;
  margin: 0 0 14px;
  padding: 9px 10px;
}

.annotation-feedback.is-success {
  color: #8ff0ca;
}

.annotation-feedback.is-warning {
  color: #f4c95d;
}

.annotation-records__list {
  align-content: start;
  display: grid;
  flex: 1;
  gap: 8px;
  grid-auto-rows: max-content;
  list-style: none;
  margin: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0;
  scrollbar-color: #3a4968 #111a2e;
  scrollbar-width: thin;
}

.annotation-records__list li {
  align-items: start;
  background: rgb(24 36 60 / 72%);
  border: 1px solid #263453;
  border-radius: 8px;
  display: grid;
  gap: 14px;
  grid-template-columns: 28px minmax(0, 1fr);
  padding: 12px 14px;
}

.annotation-records__index {
  color: #62e6b5;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
}

.annotation-records blockquote {
  color: #dce5f7;
  font-family: Georgia, 'Noto Serif SC', 'Songti SC', serif;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.annotation-records dl {
  display: grid;
  gap: 12px;
  grid-column: 2;
  grid-template-columns: auto auto minmax(80px, 1fr);
  margin: 0;
}

.annotation-records dl div {
  min-width: 0;
}

.annotation-records dt,
.xpath-snapshot dt {
  color: #657592;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 9px;
  letter-spacing: 0.08em;
  margin-bottom: 3px;
}

.annotation-records dd,
.xpath-snapshot dd {
  color: #b8c5dc;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  margin: 0;
}

.annotation-records__id dd {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.annotation-records__empty {
  border: 1px dashed #2f3d59;
  border-radius: 8px;
  margin: 0;
  padding: 18px;
  text-align: center;
}

.labeling-hint {
  align-items: baseline;
  background: rgb(20 31 53 / 62%);
  border-bottom: 1px solid #263453;
  color: #8290aa;
  display: flex;
  font-size: 13px;
  gap: 14px;
  line-height: 1.6;
  padding: 13px clamp(22px, 4vw, 48px);
}

.labeling-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr);
}

.labeling-main {
  min-width: 0;
}

.labeling-hint strong {
  color: #62e6b5;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.labeling-document {
  box-sizing: border-box;
  color: #c4cee1;
  cursor: text;
  margin: 0 auto;
  max-width: 900px;
  max-height: 420px;
  overflow-y: auto;
  padding: 36px clamp(24px, 7vw, 88px);
  scrollbar-color: #3a4968 #111a2e;
  scrollbar-width: thin;
}

.labeling-document::selection,
.labeling-document :deep(*)::selection {
  background: rgb(98 230 181 / 35%);
  color: #fff;
}

.labeling-document h1 {
  color: #f3f6fc;
  font-size: clamp(30px, 4vw, 46px);
  letter-spacing: -0.045em;
  line-height: 1.16;
  margin: 0 0 46px;
}

.labeling-document h2 {
  color: #e4eaf5;
  font-size: 20px;
  letter-spacing: -0.02em;
  margin: 48px 0 18px;
}

.labeling-document p {
  font-family: Georgia, 'Noto Serif SC', 'Songti SC', serif;
  font-size: 16px;
  line-height: 2;
  margin: 0 0 20px;
  text-align: justify;
}

.xpath-workspace {
  background: rgb(13 20 36 / 82%);
  border: 1px solid #263453;
  border-radius: 12px;
  margin-top: 24px;
  overflow: hidden;
}

.xpath-workspace__header {
  align-items: end;
  background: #111a2e;
  border-bottom: 1px solid #263453;
  display: flex;
  gap: 24px;
  justify-content: space-between;
  padding: 22px clamp(22px, 4vw, 36px);
}

.xpath-workspace__header .eyebrow {
  margin-bottom: 8px;
}

.xpath-workspace__header h3 {
  color: #edf2fb;
  font-size: 19px;
  margin: 0 0 7px;
}

.xpath-workspace__header p:last-child {
  color: #8290aa;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

.xpath-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.xpath-actions button {
  background: #17243d;
  border: 1px solid #3a4968;
  border-radius: 7px;
  color: #dce5f7;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 9px 13px;
}

.xpath-actions button:first-child {
  background: #62e6b5;
  border-color: #62e6b5;
  color: #09151a;
  font-weight: 700;
}

.xpath-actions button:hover:not(:disabled) {
  filter: brightness(1.08);
}

.xpath-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.xpath-feedback {
  background: rgb(20 31 53 / 62%);
  border-bottom: 1px solid #263453;
  color: #8290aa;
  font-size: 12px;
  margin: 0;
  padding: 12px;
}

.xpath-feedback.is-success {
  color: #8ff0ca;
}

.xpath-feedback.is-warning {
  color: #f4c95d;
}

.xpath-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
}

.xpath-document {
  color: #c4cee1;
  cursor: text;
  padding: 30px clamp(22px, 4vw, 42px) 34px;
}

.xpath-document::selection,
.xpath-document :deep(*)::selection {
  background: rgb(98 230 181 / 35%);
  color: #fff;
}

.xpath-document h4 {
  color: #e4eaf5;
  font-size: 17px;
  margin: 0 0 18px;
}

.xpath-document p {
  font-family: Georgia, 'Noto Serif SC', 'Songti SC', serif;
  font-size: 14px;
  line-height: 1.9;
  margin: 0 0 12px;
}

.xpath-document strong {
  color: #e8eef9;
  font-weight: 700;
}

.xpath-document em {
  color: #9de7cf;
}

.xpath-document code {
  background: #17243d;
  border: 1px solid #2b3a58;
  border-radius: 4px;
  color: #9de7cf;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.88em;
  padding: 1px 5px;
}

.xpath-document ul {
  color: #aebbd0;
  display: grid;
  font-size: 13px;
  gap: 8px;
  line-height: 1.7;
  margin: 18px 0;
  padding-left: 20px;
}

.xpath-document li::marker {
  color: #62e6b5;
}

.xpath-document blockquote {
  border-left: 2px solid #62e6b5;
  color: #8f9db5;
  font-size: 13px;
  line-height: 1.7;
  margin: 20px 0 0;
  padding: 2px 0 2px 16px;
}

.xpath-snapshot {
  align-content: start;
  background: #0b1323;
  border-left: 1px solid #263453;
  display: grid;
  gap: 0;
  grid-template-columns: 1fr 1fr;
  margin: 0;
  padding: 18px;
}

.xpath-snapshot > div {
  border-bottom: 1px solid #202d47;
  min-width: 0;
  padding: 12px;
}

.xpath-snapshot dd {
  overflow-wrap: anywhere;
}

.xpath-snapshot__text {
  grid-column: 1 / -1;
}

@media (max-width: 720px) {
  .labeling-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .labeling-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .labeling-actions button {
    padding-inline: 6px;
  }

  .annotation-records__heading {
    display: grid;
  }

  .labeling-layout {
    grid-template-columns: 1fr;
  }

  .annotation-records {
    border-left: 0;
    border-top: 1px solid #263453;
    max-height: 360px;
  }

  .labeling-hint {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .labeling-document {
    max-height: 360px;
    padding: 30px 22px;
  }

  .labeling-document p {
    font-size: 15px;
    text-align: left;
  }

  .xpath-workspace__header {
    align-items: stretch;
    flex-direction: column;
  }

  .xpath-actions button {
    flex: 1;
  }

  .xpath-layout {
    grid-template-columns: 1fr;
  }

  .xpath-snapshot {
    border-left: 0;
    border-top: 1px solid #263453;
  }
}
</style>
