<script setup lang="ts">
import { ElIcon } from 'element-plus'

defineOptions({
  inheritAttrs: false,
})

defineProps<{
  /** 图标尺寸：数字按 px 解释，字符串使用合法的 CSS 长度。 */
  size?: number | string
  /** 图标颜色：接受合法的 CSS color 值，未设置时继承当前文本颜色。 */
  color?: string
}>()
</script>

<template>
  <ElIcon class="ui-icon" :size="size" :color="color" v-bind="$attrs">
    <slot />
  </ElIcon>
</template>
