<script setup lang="ts">
import { ref } from 'vue'
import { UiOption, UiSelect } from '@white55/ui/select'
import '@white55/ui/select.css'

const value = ref('')
</script>

<template>
  <section class="ui-playground-demo">
    <h2>Select</h2>
    <p>选择一个选项，观察受控值变化。</p>
    <div class="ui-playground-demo__controls">
      <label class="ui-playground-demo__field">组件状态
        <UiSelect v-model="value" placeholder="请选择" clearable>
          <UiOption label="待处理" value="pending" />
          <UiOption label="已完成" value="done" />
        </UiSelect>
      </label>
      <span>当前值：{{ value || '空' }}</span>
    </div>
  </section>
</template>
