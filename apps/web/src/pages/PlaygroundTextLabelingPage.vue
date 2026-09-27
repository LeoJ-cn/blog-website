<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import articleSource from '../components/text-labeling/text.txt?raw'
import TextLabeling, { type TextAnnotation } from '../components/text-labeling/TextLabeling'
import { projects } from '../data/projects'

type ArticleBlock =
  | { type: 'title'; content: string }
  | { type: 'section'; content: string }
  | { type: 'paragraph'; content: string }

const STORAGE_KEY = 'blog-web:text-labeling:smart-planter'
const project = projects.find((item) => item.slug === 'text-labeling')!
const articleElement = ref<HTMLElement | null>(null)
const annotationCount = ref(0)
const feedback = ref('选中正文后点击鼠标右键，即可创建标注。')
const feedbackTone = ref<'neutral' | 'success' | 'warning'>('neutral')
let labeling: TextLabeling | null = null

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
  return (
    typeof annotation.id === 'string' &&
    Number.isInteger(annotation.startOffset) &&
    Number.isInteger(annotation.endOffset) &&
    typeof annotation.selectedText === 'string'
  )
}

function persistAnnotations() {
  if (!labeling) return

  const annotations = labeling.getAnnotations()
  annotationCount.value = annotations.length
  localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations))
}

function clearAnnotations() {
  if (!labeling || annotationCount.value === 0) return

  const removed = labeling.clearAnnotations()
  localStorage.removeItem(STORAGE_KEY)
  annotationCount.value = 0
  feedback.value = `已清空 ${removed.length} 条标注。`
  feedbackTone.value = 'neutral'
}

function restoreStoredAnnotations() {
  if (!labeling) return

  const storedValue = localStorage.getItem(STORAGE_KEY)
  if (!storedValue) return

  try {
    const parsed: unknown = JSON.parse(storedValue)
    const annotations = Array.isArray(parsed) ? parsed.filter(isStoredAnnotation) : []
    const discardedCount = Array.isArray(parsed) ? parsed.length - annotations.length : 1
    const result = labeling.restoreAnnotations(annotations)

    annotationCount.value = result.restored.length
    if (result.failed.length > 0 || discardedCount > 0) {
      feedback.value = `已恢复 ${result.restored.length} 条标注，跳过 ${result.failed.length + discardedCount} 条失效记录。`
      feedbackTone.value = 'warning'
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

onMounted(() => {
  if (!articleElement.value) return

  labeling = new TextLabeling({
    container: articleElement.value,
    useMenu: true,
    callback: {
      afterAdd: (_actionConfig, annotation) => {
        persistAnnotations()
        feedback.value = `已标注“${annotation.selectedText}”，位置 ${annotation.startOffset}–${annotation.endOffset}。`
        feedbackTone.value = 'success'
      },
      afterRemove: (_actionConfig, annotation) => {
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
        <div class="labeling-toolbar__status">
          <span class="status-dot" aria-hidden="true"></span>
          <span>{{ annotationCount }} 条标注</span>
        </div>
        <p :class="`is-${feedbackTone}`" role="status">{{ feedback }}</p>
        <button
          type="button"
          class="labeling-clear"
          :disabled="annotationCount === 0"
          @click="clearAnnotations"
        >
          清空全部
        </button>
      </header>

      <div class="labeling-hint" data-text-labeling-ignore>
        <strong>操作方式</strong>
        <span>拖动选中正文 → 鼠标右键 → 添加标注。点击高亮内的 × 可删除。</span>
      </div>

      <div ref="articleElement" v-once class="labeling-document">
        <template v-for="(block, index) in articleBlocks" :key="`${block.type}-${index}`">
          <h1 v-if="block.type === 'title'" id="labeling-document-title">
            {{ block.content }}
          </h1>
          <h2 v-else-if="block.type === 'section'">{{ block.content }}</h2>
          <p v-else>{{ block.content }}</p>
        </template>
      </div>
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
  align-items: center;
  background: #111a2e;
  border-bottom: 1px solid #263453;
  display: grid;
  gap: 18px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-height: 58px;
  padding: 10px 16px;
}

.labeling-toolbar__status {
  align-items: center;
  color: #dce5f7;
  display: flex;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  font-weight: 700;
  gap: 9px;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.labeling-toolbar p {
  color: #8290aa;
  font-size: 12px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.labeling-toolbar p.is-success {
  color: #8ff0ca;
}

.labeling-toolbar p.is-warning {
  color: #f4c95d;
}

.labeling-clear {
  background: transparent;
  border: 1px solid #3a4968;
  border-radius: 6px;
  color: #c5d0e5;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 7px 11px;
}

.labeling-clear:hover:not(:disabled) {
  border-color: #697a9c;
  color: #fff;
}

.labeling-clear:disabled {
  cursor: not-allowed;
  opacity: 0.38;
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

.labeling-hint strong {
  color: #62e6b5;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.labeling-document {
  color: #c4cee1;
  cursor: text;
  margin: 0 auto;
  max-width: 900px;
  padding: clamp(36px, 6vw, 72px) clamp(24px, 7vw, 88px) 80px;
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

@media (max-width: 720px) {
  .labeling-toolbar {
    align-items: start;
    grid-template-columns: 1fr auto;
  }

  .labeling-toolbar p {
    grid-column: 1 / -1;
    grid-row: 2;
    white-space: normal;
  }

  .labeling-hint {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .labeling-document {
    padding: 34px 22px 56px;
  }

  .labeling-document p {
    font-size: 15px;
    text-align: left;
  }
}
</style>
