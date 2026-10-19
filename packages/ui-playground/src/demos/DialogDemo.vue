<script setup lang="ts">
import { ref } from 'vue'
import { UiButton } from '@white55/ui/button'
import { UiDialog } from '@white55/ui/dialog'
import '@white55/ui/button.css'
import '@white55/ui/dialog.css'

const visible = ref(false)
</script>

<template>
  <section class="ui-playground-demo">
    <h2>Dialog</h2>
    <p>打开对话框，检查关闭操作和焦点交互。</p>
    <UiButton type="primary" @click="visible = true">打开对话框</UiButton>
    <UiDialog v-model="visible" title="确认操作" width="420px">
      <p>这里是对话框内容。</p>
      <template #footer>
        <UiButton @click="visible = false">取消</UiButton>
        <UiButton type="primary" @click="visible = false">确认</UiButton>
      </template>
    </UiDialog>
  </section>
</template>
