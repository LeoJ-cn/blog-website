<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: '加载中…' })
</script>

<template>
  <span class="ui-loading" role="status" aria-live="polite">
    <span class="ui-loading__spinner" aria-hidden="true" />
    <span>{{ label }}</span>
  </span>
</template>
