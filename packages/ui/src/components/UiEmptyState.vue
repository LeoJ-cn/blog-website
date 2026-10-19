<script setup lang="ts">
withDefaults(
  defineProps<{ title?: string; description?: string }>(),
  { title: '暂无内容', description: '这里还没有可展示的内容。' },
)
</script>

<template>
  <section class="ui-empty-state" aria-live="polite">
    <slot name="icon" />
    <h3 class="ui-empty-state__title">{{ title }}</h3>
    <p class="ui-empty-state__description">{{ description }}</p>
    <div v-if="$slots.default" class="ui-empty-state__actions"><slot /></div>
  </section>
</template>
