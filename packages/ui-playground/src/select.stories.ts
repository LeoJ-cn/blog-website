import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { UiOption, UiSelect } from '@white55/ui/select'
import '@white55/ui/select.css'

const meta = {
  title: 'UI/Select',
  component: UiSelect,
  args: { placeholder: '请选择', clearable: true },
} satisfies Meta<typeof UiSelect>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  render: (args) => ({
    components: { UiOption, UiSelect },
    setup() {
      const value = ref('')
      return { args, value }
    },
    template:
      '<div class="ui-story"><UiSelect v-model="value" v-bind="args" class="ui-story__field"><UiOption label="待处理" value="pending" /><UiOption label="已完成" value="done" /></UiSelect><span>当前值：{{ value || "空" }}</span></div>',
  }),
}
