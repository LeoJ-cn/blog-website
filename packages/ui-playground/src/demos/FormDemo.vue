<script setup lang="ts">
import { reactive } from 'vue'
import { UiButton } from '@white55/ui/button'
import { UiForm, UiFormItem } from '@white55/ui/form'
import { UiInput } from '@white55/ui/input'
import '@white55/ui/button.css'
import '@white55/ui/form.css'
import '@white55/ui/input.css'

const form = reactive({ name: '' })
const feedback = reactive({ message: '' })
</script>

<template>
  <section class="ui-playground-demo">
    <h2>Form</h2>
    <p>表单项仍沿用 Element Plus 字段协议。</p>
    <UiForm :model="form" label-width="80px">
      <UiFormItem label="名称" prop="name" required>
        <UiInput v-model="form.name" placeholder="请输入名称" />
      </UiFormItem>
      <UiFormItem>
        <UiButton type="primary" @click="feedback.message = form.name ? `已输入：${form.name}` : '请先输入名称'">
          查看输入
        </UiButton>
      </UiFormItem>
    </UiForm>
    <p aria-live="polite">{{ feedback.message }}</p>
  </section>
</template>
