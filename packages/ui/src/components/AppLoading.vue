<template>
  <div class="app-loading" role="status" aria-live="polite">
    <span class="app-loading__spinner" aria-hidden="true"></span>
    <span>{{ props.label }}</span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({ label: { type: String, default: '加载中…' } })
</script>

<style scoped>
.app-loading { align-items: center; color: #9aa7c0; display: inline-flex; gap: 10px; }
.app-loading__spinner { animation: spin .8s linear infinite; border: 2px solid #33415f; border-radius: 50%; border-top-color: #62e6b5; height: 16px; width: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
