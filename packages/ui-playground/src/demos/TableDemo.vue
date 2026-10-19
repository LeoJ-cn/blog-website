<script setup lang="ts">
import { UiTable, UiTableColumn } from '@white55/ui/table'
import '@white55/ui/table.css'

const rows = [
  { name: 'Button', status: '已接入' },
  { name: 'Table', status: '演示中' },
]
</script>

<template>
  <section class="ui-playground-demo">
    <h2>Table</h2>
    <p>列定义与空状态遵循 Element Plus 协议。</p>
    <UiTable :data="rows" border stripe>
      <UiTableColumn prop="name" label="组件" />
      <UiTableColumn prop="status" label="状态" />
    </UiTable>
  </section>
</template>
