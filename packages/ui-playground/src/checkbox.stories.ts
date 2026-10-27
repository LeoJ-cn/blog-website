import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { UiCheckbox } from '@white55/ui/checkbox'
import '@white55/ui/checkbox.css'

const meta = {
  title: 'UI/Checkbox',
  component: UiCheckbox,
  args: { disabled: false, indeterminate: false },
} satisfies Meta<typeof UiCheckbox>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => ({
    components: { UiCheckbox },
    setup() {
      const checked = ref(false)
      return { args, checked }
    },
    template:
      '<div class="ui-story"><UiCheckbox v-model="checked" v-bind="args">接收更新通知</UiCheckbox><span>当前状态：{{ checked ? "已选中" : "未选中" }}</span></div>',
  }),
}

export const Indeterminate: Story = {
  args: { indeterminate: true, modelValue: false },
  render: (args) => ({
    components: { UiCheckbox },
    setup: () => ({ args }),
    template: '<div class="ui-story"><UiCheckbox v-bind="args">部分选中</UiCheckbox></div>',
  }),
}

export const Disabled: Story = {
  args: { disabled: true, modelValue: true },
  render: (args) => ({
    components: { UiCheckbox },
    setup: () => ({ args }),
    template: '<div class="ui-story"><UiCheckbox v-bind="args">不可更改</UiCheckbox></div>',
  }),
}
