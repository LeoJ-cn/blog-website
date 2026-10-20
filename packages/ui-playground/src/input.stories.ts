import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { UiInput } from '@white55/ui/input'
import '@white55/ui/input.css'

const meta = {
  title: 'UI/Input',
  component: UiInput,
  args: { placeholder: '请输入名称', disabled: false, clearable: true },
} satisfies Meta<typeof UiInput>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => ({
    components: { UiInput },
    setup() {
      const value = ref('')
      return { args, value }
    },
    template:
      '<div class="ui-story"><UiInput v-model="value" v-bind="args" class="ui-story__field" /><span>当前值：{{ value || "空" }}</span></div>',
  }),
}
export const Disabled: Story = { args: { disabled: true, modelValue: '不可编辑' } }
