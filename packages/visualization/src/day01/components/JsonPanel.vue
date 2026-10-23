<script setup lang="ts">
defineProps<{ title: string; value: unknown }>()
</script>

<template>
  <section class="ec-json-panel">
    <h4>{{ title }}</h4>
    <pre>{{ JSON.stringify(value, null, 2) }}</pre>
  </section>
</template>
