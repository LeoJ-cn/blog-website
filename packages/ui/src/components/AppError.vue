<template>
  <div class="app-error" role="alert">
    <strong>{{ props.title }}</strong>
    <p>{{ props.message }}</p>
    <button v-if="props.retry" type="button" @click="props.retry">重试</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  title: { type: String, default: '出现了一点问题' },
  message: { type: String, default: '请稍后再试。' },
  retry: { type: Function, default: undefined },
})
</script>

<style scoped>
.app-error {
  background: #2b1b2a;
  border: 1px solid #713d5d;
  border-radius: 6px;
  color: #f2c5d9;
  padding: 16px;
}
.app-error p {
  color: #d6a7bd;
  margin: 8px 0 12px;
}
button {
  background: transparent;
  border: 1px solid #d6a7bd;
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  padding: 5px 10px;
}
</style>
