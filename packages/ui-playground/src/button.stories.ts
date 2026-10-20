import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiButton } from '@white55/ui/button'
import '@white55/ui/button.css'

const meta = {
  title: 'UI/Button',
  component: UiButton,
  args: { type: 'primary', disabled: false, loading: false },
} satisfies Meta<typeof UiButton>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => ({
    components: { UiButton },
    setup: () => ({ args }),
    template: '<div class="ui-story"><UiButton v-bind="args">操作按钮</UiButton></div>',
  }),
}
export const States: Story = {
  render: () => ({
    components: { UiButton },
    template:
      '<div class="ui-story"><div class="ui-story__row"><UiButton type="primary">主操作</UiButton><UiButton type="danger">危险操作</UiButton><UiButton disabled>禁用</UiButton><UiButton loading>加载中</UiButton></div></div>',
  }),
}
