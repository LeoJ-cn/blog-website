<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { ElCard } from 'element-plus'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    header?: string
    footer?: string
    shadow?: 'always' | 'hover' | 'never'
    bodyStyle?: CSSProperties
    bodyClass?: string
  }>(),
  { shadow: 'never' },
)
</script>

<template>
  <ElCard
    class="ui-card"
    :header="header"
    :footer="footer"
    :shadow="shadow"
    :body-style="bodyStyle"
    :body-class="bodyClass"
    v-bind="$attrs"
  >
    <template v-if="$slots.header" #header><slot name="header" /></template>
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </ElCard>
</template>
