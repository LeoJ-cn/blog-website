import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiButton } from '@white55/ui/button'
import { UiEmptyState } from '@white55/ui/empty-state'
import '@white55/ui/button.css'
import '@white55/ui/empty-state.css'

// 显式固定 ID，避免 EmptyState 的标题归一化为 emptystate 而破坏 Web 深链接。
const meta = {
  id: 'ui-empty-state',
  title: 'UI/EmptyState',
  component: UiEmptyState,
  args: { title: '暂无结果', description: '调整筛选条件后再试。' },
} satisfies Meta<typeof UiEmptyState>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  render: (args) => ({
    components: { UiButton, UiEmptyState },
    setup: () => ({ args }),
    template:
      '<div class="ui-story"><UiEmptyState v-bind="args"><UiButton type="primary">清空筛选</UiButton></UiEmptyState></div>',
  }),
}
