<script setup lang="ts">
import type { Component } from 'vue'
import { ElIcon } from 'element-plus'

defineOptions({
  inheritAttrs: false,
})

defineProps<{
  /** 图标组件；同时提供默认插槽时优先渲染插槽，避免重复输出两个图标。 */
  icon?: Component
  /** 图标尺寸：数字按 px 解释，字符串使用合法的 CSS 长度。 */
  size?: number | string
  /** 图标颜色：接受合法的 CSS color 值，未设置时继承当前文本颜色。 */
  color?: string
}>()
</script>

<template>
  <ElIcon class="ui-icon" :size="size" :color="color" v-bind="$attrs">
    <slot v-if="$slots.default" />
    <component :is="icon" v-else-if="icon" />
  </ElIcon>
</template>
