<script setup lang="ts">
import { ref } from 'vue'
import { UiInput } from '@white55/ui/input'
import '@white55/ui/input.css'

const value = ref('')
</script>

<template>
  <section class="ui-playground-demo">
    <h2>Input</h2>
    <p>输入与清空内容，观察双向绑定。</p>
    <div class="ui-playground-demo__controls">
      <label class="ui-playground-demo__field">名称
        <UiInput v-model="value" placeholder="请输入名称" clearable />
      </label>
      <span>当前值：{{ value || '空' }}</span>
    </div>
  </section>
</template>
