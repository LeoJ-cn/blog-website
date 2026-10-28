<script setup lang="ts">
import { ElAvatar } from 'element-plus'

defineOptions({ inheritAttrs: false })

defineProps<{
  size?: number | 'large' | 'default' | 'small'
  shape?: 'circle' | 'square'
  src?: string
  fit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'
  alt?: string
}>()

const emit = defineEmits<{
  error: [event: Event]
}>()
</script>

<template>
  <ElAvatar
    class="ui-avatar"
    :size="size"
    :shape="shape"
    :src="src"
    :fit="fit"
    :alt="alt"
    v-bind="$attrs"
    @error="emit('error', $event)"
  >
    <slot />
  </ElAvatar>
</template>
