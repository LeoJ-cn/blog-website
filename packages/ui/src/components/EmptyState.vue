<template>
  <div class="empty-state">
    <div class="empty-state__icon" aria-hidden="true">{{ props.icon }}</div>
    <h3>{{ props.title }}</h3>
    <p>{{ props.description }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  title: { type: String, default: '暂无内容' },
  description: { type: String, default: '这里还没有可展示的内容。' },
  icon: { type: String, default: '·' },
})
</script>

<style scoped>
.empty-state { color: #8e9bb8; padding: 40px 20px; text-align: center; }
.empty-state__icon { color: #62e6b5; font-size: 34px; line-height: 1; }
.empty-state h3 { color: #e8edf7; font-size: 18px; margin: 14px 0 8px; }
.empty-state p { margin: 0; }
</style>
