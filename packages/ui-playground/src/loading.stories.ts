import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiLoading } from '@white55/ui/loading'
import '@white55/ui/loading.css'

const meta = {
  title: 'UI/Loading',
  component: UiLoading,
  args: { label: '正在加载数据…' },
} satisfies Meta<typeof UiLoading>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  render: (args) => ({
    components: { UiLoading },
    setup: () => ({ args }),
    template: '<div class="ui-story"><UiLoading v-bind="args" /></div>',
  }),
}
