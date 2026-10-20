import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { reactive, ref } from 'vue'
import { UiButton } from '@white55/ui/button'
import { UiForm, UiFormItem } from '@white55/ui/form'
import { UiInput } from '@white55/ui/input'
import '@white55/ui/button.css'
import '@white55/ui/form.css'
import '@white55/ui/input.css'

const meta = { title: 'UI/Form', component: UiForm, args: { model: {} } } satisfies Meta<
  typeof UiForm
>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  render: () => ({
    components: { UiButton, UiForm, UiFormItem, UiInput },
    setup() {
      const form = reactive({ name: '' })
      const feedback = ref('')
      return { form, feedback }
    },
    template:
      '<div class="ui-story"><UiForm :model="form" label-width="80px"><UiFormItem label="名称" prop="name" required><UiInput v-model="form.name" placeholder="请输入名称" /></UiFormItem><UiFormItem><UiButton type="primary" @click="feedback = form.name || &quot;请先输入名称&quot;">查看输入</UiButton></UiFormItem></UiForm><p aria-live="polite">{{ feedback }}</p></div>',
  }),
}
