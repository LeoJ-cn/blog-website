<script setup lang="ts">
import type { DemoControlDefinition } from '../types/project'

defineProps<{ controls: DemoControlDefinition[] }>()
const model = defineModel<Record<string, string | number | boolean>>({ required: true })
</script>

<template>
  <div class="demo-controls">
    <label v-for="control in controls" :key="control.key" class="demo-control">
      <span>{{ control.label }}</span>
      <select v-if="control.type === 'select'" v-model="model[control.key]">
        <option v-for="option in control.options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <input v-else-if="control.type === 'boolean'" v-model="model[control.key]" type="checkbox" />
      <input
        v-else
        v-model.number="model[control.key]"
        :type="control.type"
        :min="control.min"
        :max="control.max"
        :step="control.step"
      />
      <output v-if="control.type === 'range'">{{ model[control.key] }} ms</output>
    </label>
  </div>
</template>
