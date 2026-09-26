<script setup lang="ts">
import { computed, ref } from 'vue'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'

const props = withDefaults(
  defineProps<{
    code: string
    language?: string
    filename?: string
  }>(),
  {
    language: 'typescript',
    filename: 'example.ts',
  },
)

const copied = ref(false)
const grammar = computed(() => Prism.languages[props.language] ?? Prism.languages.plain)
const highlightedCode = computed(() => Prism.highlight(props.code, grammar.value, props.language))
const lines = computed(() => highlightedCode.value.split('\n'))

async function copyCode() {
  await navigator.clipboard.writeText(props.code)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1600)
}
</script>

<template>
  <div class="code-block">
    <div class="code-block__toolbar">
      <span class="code-block__filename">{{ filename }}</span>
      <div class="code-block__actions">
        <span class="code-block__language">{{ language }}</span>
        <button type="button" @click="copyCode">{{ copied ? '已复制' : '复制' }}</button>
      </div>
    </div>
    <pre
      class="code-block__body"
    ><code><span v-for="(line, index) in lines" :key="index" class="code-block__line"><span class="code-block__number">{{ String(index + 1).padStart(2, '0') }}</span><span class="code-block__source" v-html="line || '&nbsp;'" /></span></code></pre>
  </div>
</template>
