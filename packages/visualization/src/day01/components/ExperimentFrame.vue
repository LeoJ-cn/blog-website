<script setup lang="ts">
import type { OperationLog } from '../types'

defineProps<{
  title: string
  description: string
  logs: readonly OperationLog[]
  apiNotes: readonly string[]
}>()
</script>

<template>
  <section class="ec-experiment">
    <header class="ec-experiment__header">
      <div>
        <p>ACTIVE EXPERIMENT</p>
        <h3>{{ title }}</h3>
      </div>
      <span>{{ description }}</span>
    </header>
    <div class="ec-experiment__workspace">
      <aside class="ec-experiment__controls"><slot name="controls" /></aside>
      <main class="ec-experiment__stage"><slot /></main>
      <aside class="ec-experiment__inspector"><slot name="inspector" /></aside>
    </div>
    <footer class="ec-experiment__footer">
      <section>
        <h4>操作日志</h4>
        <ol class="ec-log">
          <li v-if="logs.length === 0">等待操作…</li>
          <li v-for="log in logs" :key="log.id">
            <time>{{ log.time }}</time>
            {{ log.message }}
          </li>
        </ol>
      </section>
      <section>
        <h4>API 说明</h4>
        <ul class="ec-notes">
          <li v-for="note in apiNotes" :key="note">{{ note }}</li>
        </ul>
      </section>
    </footer>
  </section>
</template>
