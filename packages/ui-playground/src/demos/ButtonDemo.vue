<script setup lang="ts">
import { ref } from 'vue'
import { UiButton } from '@white55/ui/button'
import '@white55/ui/button.css'

const busy = ref(false)
</script>

<template>
  <section class="ui-playground-demo">
    <h2>Button</h2>
    <p>查看主操作、危险操作、禁用与加载状态。</p>
    <div class="ui-playground-demo__preview">
      <UiButton type="primary" :loading="busy" @click="busy = !busy">主操作</UiButton>
      <UiButton type="danger">危险操作</UiButton>
      <UiButton disabled>禁用</UiButton>
      <UiButton @click="busy = !busy">切换加载</UiButton>
    </div>
  </section>
</template>
